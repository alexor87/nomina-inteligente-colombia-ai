// Allowed origins for CORS (ALTO-3)
// Add your production domain here when known
const ALLOWED_ORIGINS = [
  'https://finppi.com',
  'https://www.finppi.com',
  'https://app.finppi.com',
  // Vercel preview/staging URLs
  /^https:\/\/.*\.vercel\.app$/,
  // Local development
  'http://localhost:5173',
  'http://localhost:8080',
  'http://localhost:3000',
];

export function getCorsHeaders(req?: Request): Record<string, string> {
  const origin = req?.headers?.get('origin') || '';
  const isAllowed = ALLOWED_ORIGINS.some(allowed =>
    typeof allowed === 'string' ? allowed === origin : allowed.test(origin)
  );

  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : ALLOWED_ORIGINS[0] as string,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Credentials': 'true',
  };
}

// Keep legacy export for backward compatibility during migration
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};