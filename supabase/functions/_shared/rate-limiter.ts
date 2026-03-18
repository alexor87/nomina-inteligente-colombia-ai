import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfter: number; // seconds until window reset
}

const LIMITS: Record<string, { maxRequests: number; windowSeconds: number }> = {
  'maya-intelligence':       { maxRequests: 30,  windowSeconds: 60   }, // 30/min — protects LLM cost
  'send-voucher-email':      { maxRequests: 100, windowSeconds: 3600 }, // 100/hour — Resend quota
  'send-demo-payroll-email': { maxRequests: 5,   windowSeconds: 3600 }, // 5/hour — anti-spam
};

/** Extracts user_id from JWT payload without signature verification.
 *  Sufficient for rate limiting — actual auth is enforced by Supabase RLS and service key. */
function extractUserId(authHeader: string): string {
  try {
    const token = authHeader.replace('Bearer ', '');
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.sub ?? 'anonymous';
  } catch {
    return 'anonymous';
  }
}

export async function checkRateLimit(
  serviceClient: SupabaseClient,
  authHeader: string,
  functionName: string
): Promise<RateLimitResult> {
  const userId = extractUserId(authHeader);
  const config = LIMITS[functionName] ?? { maxRequests: 60, windowSeconds: 60 };
  const now = Date.now();
  const windowMs = config.windowSeconds * 1000;

  const { data, error } = await serviceClient
    .from('edge_function_rate_limits')
    .select('request_count, window_start')
    .eq('user_id', userId)
    .eq('function_name', functionName)
    .maybeSingle();

  // Fail open on DB error — never block legitimate requests due to infra issues
  if (error) return { allowed: true, remaining: config.maxRequests, retryAfter: 0 };

  const windowExpired = !data || (now - new Date(data.window_start).getTime()) >= windowMs;

  if (windowExpired) {
    // Start a new window
    await serviceClient.from('edge_function_rate_limits').upsert(
      {
        user_id: userId,
        function_name: functionName,
        request_count: 1,
        window_start: new Date().toISOString(),
      },
      { onConflict: 'user_id,function_name' }
    );
    return { allowed: true, remaining: config.maxRequests - 1, retryAfter: 0 };
  }

  if (data.request_count >= config.maxRequests) {
    const resetAt = new Date(data.window_start).getTime() + windowMs;
    return { allowed: false, remaining: 0, retryAfter: Math.ceil((resetAt - now) / 1000) };
  }

  await serviceClient
    .from('edge_function_rate_limits')
    .update({ request_count: data.request_count + 1 })
    .eq('user_id', userId)
    .eq('function_name', functionName);

  return {
    allowed: true,
    remaining: config.maxRequests - data.request_count - 1,
    retryAfter: 0,
  };
}

export function rateLimitResponse(
  retryAfter: number,
  corsHeaders: Record<string, string>
): Response {
  return new Response(
    JSON.stringify({ error: 'Demasiadas solicitudes. Intenta más tarde.' }),
    {
      status: 429,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Retry-After': retryAfter.toString(),
        'X-RateLimit-Remaining': '0',
      },
    }
  );
}
