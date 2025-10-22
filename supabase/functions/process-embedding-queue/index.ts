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

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    const { batch_size = 5 } = await req.json().catch(() => ({ batch_size: 5 }));

    console.log(`[process-queue] Starting batch processing (max ${batch_size} documents)...`);

    // Obtener documentos pendientes de la cola
    const { data: queueItems, error: queueError } = await supabaseClient
      .from('embedding_queue')
      .select('id, document_id, retry_count, max_retries')
      .eq('status', 'pending')
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(batch_size);

    if (queueError) throw queueError;

    if (!queueItems || queueItems.length === 0) {
      console.log('[process-queue] No pending documents in queue');
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'No pending documents',
          processed: 0,
          failed: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[process-queue] Found ${queueItems.length} documents to process`);

    let processed = 0;
    let failed = 0;

    for (const item of queueItems) {
      try {
        // Marcar como "processing"
        await supabaseClient
          .from('embedding_queue')
          .update({ 
            status: 'processing',
            started_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', item.id);

        // Obtener el documento
        const { data: doc, error: docError } = await supabaseClient
          .from('legal_knowledge_base')
          .select('id, title, content')
          .eq('id', item.document_id)
          .single();

        if (docError || !doc) {
          throw new Error(`Document not found: ${item.document_id}`);
        }

        console.log(`[process-queue] Processing: ${doc.title}`);

        // Generar embedding
        const textToEmbed = `${doc.title}\n\n${doc.content}`;
        
        const response = await fetch('https://api.openai.com/v1/embeddings', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'text-embedding-3-small',
            input: textToEmbed,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Embedding API error: ${errorText}`);
        }

        const data = await response.json();
        const embedding = data.data[0].embedding;

        // Actualizar documento con embedding
        const { error: updateError } = await supabaseClient
          .from('legal_knowledge_base')
          .update({ 
            embedding,
            updated_at: new Date().toISOString()
          })
          .eq('id', doc.id);

        if (updateError) throw updateError;

        // Marcar como completado en la cola
        await supabaseClient
          .from('embedding_queue')
          .update({ 
            status: 'completed',
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            error_message: null
          })
          .eq('id', item.id);

        processed++;
        console.log(`[process-queue] ✓ Successfully processed: ${doc.title}`);

        // Pequeña pausa para evitar rate limits
        await new Promise(resolve => setTimeout(resolve, 300));

      } catch (error) {
        console.error(`[process-queue] Error processing queue item ${item.id}:`, error);
        
        const newRetryCount = item.retry_count + 1;
        const newStatus = newRetryCount >= item.max_retries ? 'failed' : 'pending';

        await supabaseClient
          .from('embedding_queue')
          .update({ 
            status: newStatus,
            retry_count: newRetryCount,
            error_message: error.message,
            updated_at: new Date().toISOString()
          })
          .eq('id', item.id);

        failed++;
      }
    }

    console.log(`[process-queue] Batch completed: ${processed} processed, ${failed} failed`);

    return new Response(
      JSON.stringify({ 
        success: true,
        processed,
        failed,
        total: queueItems.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[process-queue] Critical error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
