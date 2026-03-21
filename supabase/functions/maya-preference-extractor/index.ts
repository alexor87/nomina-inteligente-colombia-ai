import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const openaiKey = Deno.env.get('OPENAI_API_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization') || '';
    const userSupabase = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    });
    const { data: { user } } = await userSupabase.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });

    const { messages, companyId } = await req.json();
    if (!messages || !companyId) return new Response(JSON.stringify({ ok: false }), { headers: corsHeaders });

    // Build conversation text for analysis
    const conversationText = messages
      .slice(-10)
      .map((m: any) => `${m.role === 'user' ? 'Usuario' : 'Maya'}: ${m.content}`)
      .join('\n');

    const prompt = `Analiza esta conversación de nómina colombiana y extrae preferencias del usuario.
Devuelve SOLO un JSON válido con este formato (sin explicaciones):
{
  "periodo_preferido": "primera_quincena" | "segunda_quincena" | "mensual" | null,
  "empleados_frecuentes": ["nombre1", "nombre2"] (máximo 3, solo si se mencionaron),
  "formato_moneda": "millones" | "completo" | null
}
Si no puedes inferir un valor con seguridad, usa null.

Conversación:
${conversationText}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${openaiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 200,
        temperature: 0.1
      })
    });

    if (!response.ok) return new Response(JSON.stringify({ ok: false }), { headers: corsHeaders });

    const data = await response.json();
    let prefs: Record<string, any> = {};
    try {
      prefs = JSON.parse(data.choices[0].message.content);
    } catch {
      return new Response(JSON.stringify({ ok: false }), { headers: corsHeaders });
    }

    const adminSupabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

    // Upsert only non-null preferences
    const upserts = Object.entries(prefs)
      .filter(([, v]) => v !== null && (Array.isArray(v) ? v.length > 0 : true))
      .map(([key, value]) => ({
        user_id: user.id,
        company_id: companyId,
        preference_key: key,
        preference_value: { value },
        source: 'inferred',
        updated_at: new Date().toISOString()
      }));

    if (upserts.length > 0) {
      await adminSupabase
        .from('maya_user_preferences')
        .upsert(upserts, { onConflict: 'user_id,company_id,preference_key' });
    }

    return new Response(JSON.stringify({ ok: true, extracted: upserts.length }), { headers: corsHeaders });
  } catch (error) {
    console.error('[maya-preference-extractor] Error:', error);
    return new Response(JSON.stringify({ ok: false }), { headers: corsHeaders });
  }
});
