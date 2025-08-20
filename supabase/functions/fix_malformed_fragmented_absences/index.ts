
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");

  // Creamos el cliente solo si existen las variables (en entornos de Edge Functions, normalmente están)
  const supabase =
    SUPABASE_URL && SUPABASE_ANON_KEY
      ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
      : null;

  if (req.method === "POST") {
    console.log("🚀 Invocación: fix_malformed_fragmented_absences (POST)");

    if (!supabase) {
      console.error("❌ Variables de entorno de Supabase no configuradas");
      return new Response(
        JSON.stringify({
          success: false,
          error: "Supabase env vars not set (SUPABASE_URL / SUPABASE_ANON_KEY)",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    // Intentamos ejecutar la RPC si existe en la BD
    const { data, error } = await supabase.rpc("fix_malformed_fragmented_absences");
    if (error) {
      console.error("❌ Error ejecutando RPC fix_malformed_fragmented_absences:", error);
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    console.log("✅ RPC ejecutada correctamente:", data);
    return new Response(
      JSON.stringify({ success: true, data }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  }

  // Método por defecto: indicar cómo usar
  return new Response(
    JSON.stringify({
      success: true,
      message: "Use POST to execute the fix_malformed_fragmented_absences RPC.",
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
  );
});
