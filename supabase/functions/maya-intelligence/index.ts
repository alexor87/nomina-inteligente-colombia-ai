import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MayaRequest {
  context: string;
  phase: string;
  data?: any;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    const { context, phase, data }: MayaRequest = await req.json();

    const systemPrompt = `Eres MAYA, una asistente de nómina profesional y amigable para pequeñas empresas colombianas. 
Tu personalidad es:
- Profesional pero cálida
- Proactiva y útil
- Experta en procesos de liquidación
- Celebra los logros y tranquiliza en problemas
- Usa emojis con moderación
- Respuestas concisas (máximo 2 líneas)

Contexto actual: ${context}
Fase del proceso: ${phase}
Datos adicionales: ${JSON.stringify(data)}

Genera una respuesta contextual apropiada para este momento del proceso de liquidación de nómina.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Dame una respuesta contextual para: ${context}` }
        ],
        max_tokens: 150,
        temperature: 0.7
      }),
    });

    const aiData = await response.json();
    const message = aiData.choices[0]?.message?.content || "¡Hola! Soy MAYA, tu asistente de nómina. Estoy aquí para ayudarte.";

    // Determine emotional state based on context
    let emotionalState = 'neutral';
    if (context.includes('error') || context.includes('problema')) {
      emotionalState = 'concerned';
    } else if (context.includes('completado') || context.includes('éxito')) {
      emotionalState = 'celebrating';
    } else if (context.includes('calculando') || context.includes('procesando')) {
      emotionalState = 'analyzing';
    }

    return new Response(JSON.stringify({
      message,
      emotionalState,
      contextualActions: generateContextualActions(context, phase),
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in maya-intelligence:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      message: "Disculpa, tengo un pequeño problema técnico. Pero puedes continuar con tu liquidación normalmente.",
      emotionalState: 'neutral'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function generateContextualActions(context: string, phase: string): string[] {
  const actions: string[] = [];
  
  if (phase === 'period_selection') {
    actions.push('💡 Tip: Verifica las fechas del período antes de continuar');
  }
  
  if (phase === 'employee_loading') {
    actions.push('📊 Revisando empleados activos para este período...');
  }
  
  if (phase === 'liquidation_ready') {
    actions.push('✨ Todo listo para procesar la liquidación');
  }
  
  if (context.includes('error')) {
    actions.push('🔧 Puedo ayudarte a resolver este problema');
  }
  
  return actions;
}