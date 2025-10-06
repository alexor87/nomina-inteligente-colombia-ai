import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    console.log('[populate-embeddings] Starting embedding generation...');

    // Obtener todos los documentos sin embeddings
    const { data: documents, error: fetchError } = await supabaseClient
      .from('legal_knowledge_base')
      .select('id, title, content')
      .is('embedding', null);

    if (fetchError) {
      throw fetchError;
    }

    console.log(`[populate-embeddings] Found ${documents?.length || 0} documents without embeddings`);

    let processed = 0;
    let failed = 0;

    for (const doc of documents || []) {
      try {
        // Combinar título y contenido para un embedding más rico
        const textToEmbed = `${doc.title}\n\n${doc.content}`;

        console.log(`[populate-embeddings] Processing document ${doc.id}: ${doc.title}`);

        // Generar embedding usando Lovable AI
        const response = await fetch('https://ai.gateway.lovable.dev/v1/embeddings', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'text-embedding-ada-002',
            input: textToEmbed,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`[populate-embeddings] Failed to generate embedding for ${doc.id}:`, errorText);
          failed++;
          continue;
        }

        const data = await response.json();
        const embedding = data.data[0].embedding;

        // Actualizar documento con el embedding
        const { error: updateError } = await supabaseClient
          .from('legal_knowledge_base')
          .update({ embedding })
          .eq('id', doc.id);

        if (updateError) {
          console.error(`[populate-embeddings] Failed to update ${doc.id}:`, updateError);
          failed++;
        } else {
          processed++;
          console.log(`[populate-embeddings] ✓ Document ${doc.id} processed successfully`);
        }

        // Pequeña pausa para evitar rate limits
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error) {
        console.error(`[populate-embeddings] Error processing ${doc.id}:`, error);
        failed++;
      }
    }

    console.log(`[populate-embeddings] Completed: ${processed} processed, ${failed} failed`);

    return new Response(
      JSON.stringify({ 
        success: true,
        processed,
        failed,
        total: documents?.length || 0
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[populate-embeddings] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
