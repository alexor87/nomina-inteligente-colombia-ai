import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-maya-session-id, x-maya-context, x-maya-debug',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '3600',
};

interface MayaRequest {
  context: string;
  phase: string;
  data?: any;
  // Chat-specific fields
  message?: string;
  conversation?: Array<{role: string, content: string}>;
  sessionId?: string;
}

serve(async (req) => {
  const requestId = `r_${Date.now()}_${Math.random().toString(36).slice(2,7)}`;
  const url = new URL(req.url);
  const sessionHeader = req.headers.get('x-maya-session-id') || undefined;
  const debug = req.headers.get('x-maya-debug') === '1';
  console.info(`[maya-intelligence] ▶ req ${requestId}`, { path: url.pathname, method: req.method, sessionId: sessionHeader });

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      console.error(`[maya-intelligence] ✖ ${requestId} Missing OPENAI_API_KEY`);
      return new Response(JSON.stringify({
        error: 'Missing OPENAI_API_KEY',
        errorCode: 'OPENAI_KEY_MISSING',
        message: 'No hay configuración de OpenAI en el servidor.',
        requestId,
        sessionId: sessionHeader
      }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { context, phase, data, message: userMessage, conversation, sessionId, debug: debugBody }: MayaRequest & { debug?: boolean } = await req.json();
    const debugMode = debug || debugBody;

    // Handle interactive chat mode
    if (phase === 'interactive_chat' && userMessage && conversation) {
      const conversationalPrompt = `Eres MAYA, una asistente de nómina profesional y amigable para pequeñas empresas colombianas. 

Tu personalidad es:
- Profesional pero cálida y conversacional
- Experta en nómina, liquidación, empleados, y procesos de RRHH
- Ayudas con preguntas específicas del usuario
- Respondes de manera natural y útil
- Puedes mantener conversaciones fluidas
- Usas emojis ocasionalmente

Contexto de la conversación:
- Página actual: ${context}
- Empresa colombiana
- Sistema de nómina

Responde de manera natural a la pregunta del usuario. Si no sabes algo específico, sé honesta pero siempre trata de ser útil.`;

      // Filter conversation to only role and content for OpenAI
      const filteredConversation = conversation.slice(-10).map(msg => ({
        role: msg.role,
        content: msg.content
      }));
      
      const messages = [
        { role: 'system', content: conversationalPrompt },
        ...filteredConversation,
        { role: 'user', content: userMessage }
      ];

      if (debugMode) {
        console.info(`[maya-intelligence] ↪ ${requestId} interactive_chat`, {
          convLen: conversation.length,
          lastUserLen: userMessage.length,
          sessionId: sessionId || sessionHeader
        });
      }

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages,
          max_tokens: 200,
          temperature: 0.8
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error(`[maya-intelligence] ✖ ${requestId} OpenAI error`, { status: response.status, body: errText?.slice(0, 500) });
        return new Response(JSON.stringify({
          error: 'OPENAI_API_ERROR',
          message: 'Disculpa, no pude procesar tu pregunta ahora. Intenta de nuevo.',
          requestId,
          sessionId: sessionId || sessionHeader
        }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const aiData = await response.json();
      if (debugMode) console.info(`[maya-intelligence] ✔ ${requestId} OpenAI ok`, { status: response.status });
      const responseMessage = aiData.choices[0]?.message?.content || "Disculpa, no pude procesar tu pregunta. ¿Podrías reformularla?";

      return new Response(JSON.stringify({
        requestId,
        sessionId: sessionId || sessionHeader,
        message: responseMessage,
        emotionalState: 'neutral',
        timestamp: new Date().toISOString()
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const buildContextString = (contextData: any) => {
      const { phase, employeeCount, periodName, hasErrors, validationResults, errorType, errorDetails } = contextData;
      let contextStr = `Fase: ${phase}`;
      if (periodName) contextStr += `, Período: ${periodName}`;
      if (employeeCount) contextStr += `, Empleados: ${employeeCount}`;
      if (hasErrors) contextStr += `, Estado: Con errores`;
      if (validationResults) contextStr += `, Validación: ${validationResults.hasIssues ? 'Con problemas' : 'Exitosa'}`;
      if (errorType) contextStr += `, Tipo error: ${errorType}`;
      return contextStr;
    };

    // Enhanced contextual responses based on phase
    let systemPrompt = '';
    
    if (phase === 'data_validation') {
      systemPrompt = `Eres MAYA, una inteligente asistente de nómina colombiana especializada en validación de datos laborales.

🔍 **FASE DE VALIDACIÓN DE DATOS**
CONTEXTO: ${buildContextString({ phase, ...data })}

Tu tarea es analizar los resultados de validación y proporcionar orientación clara:

${data?.validationResults?.hasIssues ? `❌ SE ENCONTRARON PROBLEMAS:
- Explica los errores de forma comprensible
- Proporciona pasos específicos para corregir
- Indica riesgos laborales y legales
- Guía la corrección paso a paso` : `✅ VALIDACIÓN EXITOSA:
- Confirma que los datos están correctos
- Indica que es seguro proceder
- Destaca aspectos positivos del proceso`}

Sé precisa, empática y orientada a la acción. Máximo 120 palabras.`;

    } else if (phase === 'error') {
      systemPrompt = `Eres MAYA, una asistente de nómina empática especializada en resolución de problemas.

🚨 **FASE DE MANEJO DE ERRORES**
CONTEXTO: ${buildContextString({ phase, ...data })}
TIPO DE ERROR: ${data?.errorType || 'no especificado'}

Tu enfoque debe ser:
- Explicar el problema sin tecnicismos excesivos
- Proporcionar solución CONCRETA y pasos específicos
- Indicar si requiere ayuda técnica
- Ofrecer alternativas cuando sea posible
- Ser empática pero directa

NO te enfoques en explicar qué salió mal, enfócate en la SOLUCIÓN.
Mantén el tono profesional pero tranquilizador. Máximo 100 palabras.`;

    } else {
      // Default system prompt for other phases
      systemPrompt = `Eres MAYA, una asistente de nómina profesional y amigable para pequeñas empresas colombianas. 

Tu personalidad:
- Profesional pero cálida
- Proactiva y útil
- Experta en procesos de liquidación
- Celebra logros y tranquiliza en problemas
- Usa emojis con moderación
- Respuestas concisas (máximo 2 líneas)

CONTEXTO ACTUAL: ${buildContextString({ phase, ...data })}

Genera una respuesta contextual apropiada para este momento del proceso de liquidación de nómina.`;
    }

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

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[maya-intelligence] ✖ ${requestId} OpenAI error (context)`, { status: response.status, body: errText?.slice(0, 500) });
      return new Response(JSON.stringify({
        error: 'OPENAI_API_ERROR',
        message: 'No pude generar una respuesta contextual en este momento.',
        requestId,
        sessionId: sessionHeader
      }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const aiData = await response.json();
    const contextualMessage = aiData.choices[0]?.message?.content || "¡Hola! Soy MAYA, tu asistente de nómina. Estoy aquí para ayudarte.";

    // Determine emotional state based on context and phase
    let emotionalState = 'neutral';
    if (phase === 'error' || (data?.hasErrors && phase === 'data_validation')) {
      emotionalState = 'concerned';
    } else if (phase === 'completed') {
      emotionalState = 'celebrating';
    } else if (phase === 'data_validation' && !data?.hasErrors) {
      emotionalState = 'encouraging';
    } else if (phase === 'processing' || phase === 'employee_loading') {
      emotionalState = 'analyzing';
    } else if (context.includes('calculando') || context.includes('procesando')) {
      emotionalState = 'analyzing';
    }

    return new Response(JSON.stringify({
      requestId,
      sessionId: sessionHeader,
      message: contextualMessage,
      emotionalState,
      contextualActions: generateContextualActions(context, phase),
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[maya-intelligence] ✖ Unhandled error', { error });
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      errorCode: 'UNHANDLED_SERVER_ERROR',
      message: 'Disculpa, tengo un problema técnico en el servidor.',
      emotionalState: 'neutral',
      requestId,
      sessionId: sessionHeader
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
  
  if (phase === 'data_validation') {
    actions.push('🔍 Validando calidad de datos de nómina');
    actions.push('✅ Revisando consistencia laboral');
  }
  
  if (phase === 'liquidation_ready') {
    actions.push('✨ Todo listo para procesar la liquidación');
  }
  
  if (phase === 'error') {
    actions.push('🔧 Puedo ayudarte a resolver este problema');
    actions.push('💡 Consulta los pasos de solución');
  }
  
  if (phase === 'completed') {
    actions.push('🎉 ¡Liquidación completada exitosamente!');
    actions.push('📊 Revisar reportes de nómina');
  }
  
  if (context.includes('error')) {
    actions.push('🔧 Puedo ayudarte a resolver este problema');
  }
  
  return actions;
}