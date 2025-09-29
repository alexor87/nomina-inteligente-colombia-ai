// ============================================================================
// MAYA Intelligence - Professional Modular Architecture
// ============================================================================

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Core imports
import { MayaRequest, MayaLogger, HandlerResponse } from './core/types.ts';
import { IntentDetector } from './core/intent-detector.ts';
import { HandlerRegistry } from './core/handler-registry.ts';
import { ContextManager } from './core/context-manager.ts';
import { ResponseBuilder } from './core/response-builder.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-maya-session-id, x-maya-context, x-maya-debug',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '3600',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

// Simple logger implementation
const logger: MayaLogger = {
  info: (message: string, data?: any) => {
    console.info(`[MAYA] ${message}`, data || '');
  },
  error: (message: string, error?: any) => {
    console.error(`[MAYA] ${message}`, error || '');
  },
  warn: (message: string, data?: any) => {
    console.warn(`[MAYA] ${data}`, data || '');
  }
};

serve(async (req) => {
  const requestId = `r_${Date.now()}_${Math.random().toString(36).slice(2,7)}`;
  const url = new URL(req.url);
  const sessionHeader = req.headers.get('x-maya-session-id') || undefined;
  const debug = req.headers.get('x-maya-debug') === '1';
  
  logger.info(`Request ${requestId}`, { path: url.pathname, method: req.method, sessionId: sessionHeader });

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      logger.error(`Missing OPENAI_API_KEY for request ${requestId}`);
      return new Response(JSON.stringify({
        error: 'Missing OPENAI_API_KEY',
        errorCode: 'OPENAI_KEY_MISSING',
        message: 'No hay configuración de OpenAI en el servidor.',
        requestId,
        sessionId: sessionHeader
      }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { context, phase, data, message: userMessage, conversation, sessionId, debug: debugBody, richContext }: MayaRequest & { debug?: boolean } = await req.json();
    const debugMode = debug || debugBody;

    // 🎯 Special hook: button-driven expand periods response
    if (userMessage === 'expand_periods_response') {
      logger.info(`Expand periods request ${requestId}`, { employeeId: data?.employeeId, periods: data?.periods?.length || 0 });
      return handleExpandPeriodsResponse(data || {});
    }

    // Prepare user-scoped Supabase client when available
    const authHeader = req.headers.get('Authorization') || '';
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? 'https://xrmorlkakwujyozgmilf.supabase.co';
    const supabaseAnon = Deno.env.get('SUPABASE_ANON_KEY') ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhybW9ybGtha3d1anlvemdtaWxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA1NzMxNDYsImV4cCI6MjA2NjE0OTE0Nn0.JSKbniDUkbNEAVCxCkrG_J5NQTt0yHc7W5PPheJ8X_U';
    const supabaseUser = authHeader && supabaseUrl && supabaseAnon
      ? createClient(supabaseUrl, supabaseAnon, { global: { headers: { Authorization: authHeader } } })
      : null;
    logger.info(`[MAYA] Supabase client mode: ${supabaseUser ? 'user' : 'service'}`);

    // Initialize handler registry
    const handlerRegistry = new HandlerRegistry(logger, OPENAI_API_KEY, supabaseUser || supabase);

    // 🔄 Interactive Chat Mode (Main mode for new architecture)
    if (phase === 'interactive_chat') {
      if (!conversation || !Array.isArray(conversation)) {
        return new Response(JSON.stringify({
          error: 'INVALID_CONVERSATION',
          message: 'Conversación no válida.',
          requestId,
          sessionId: sessionId || sessionHeader
        }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const lastUserMessage = conversation[conversation.length - 1]?.content || '';
      
      logger.info(`Interactive chat for ${requestId}`, {
        convLen: conversation.length,
        lastUserLen: lastUserMessage.length,
        sessionId: sessionId || sessionHeader,
        hasContext: !!richContext,
        employeeCount: richContext?.employeeData?.totalCount || 0,
        pageType: richContext?.pageType || 'unknown'
      });

      try {
        // 1. Check for voucher flow continuity first
        const voucherContinuityIntent = detectVoucherContinuation(conversation, lastUserMessage, richContext);
        let intent;
        
        if (voucherContinuityIntent) {
          logger.info(`Voucher continuity detected for ${requestId}`, {
            type: voucherContinuityIntent.type,
            entityCount: voucherContinuityIntent.entities.length,
            source: 'continuity'
          });
          intent = voucherContinuityIntent;
        } else {
          // 2. Fallback to normal intent detection
          intent = await IntentDetector.detectIntent(lastUserMessage, richContext, OPENAI_API_KEY);
        }
        
        logger.info(`Intent detected for ${requestId}`, {
          type: intent.type,
          confidence: intent.confidence,
          entityCount: intent.entities.length
        });

        // Inject original message for structured queries
        intent.parameters.originalMessage = lastUserMessage;
        
        logger.info(`[DatabaseQueryHandler] Original message injected`, {
          messagePreview: lastUserMessage.slice(0, 50) + (lastUserMessage.length > 50 ? '...' : ''),
          intentType: intent.type
        });

        // 2. Process intent with appropriate handler
        if (intent.type !== 'CONVERSATION' || intent.confidence > 0.7) {
          const handlerResponse = await handlerRegistry.processIntent(intent, richContext);
          
          if (handlerResponse.hasExecutableAction) {
            return new Response(JSON.stringify({
              message: handlerResponse.response,
              response: handlerResponse.response,
              conversationId: sessionId,
              executableActions: handlerResponse.actions || [handlerResponse.action],
              emotionalState: handlerResponse.emotionalState
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
          
          // Non-executable response (conversational)
          return new Response(JSON.stringify({
            requestId,
            sessionId: sessionId || sessionHeader,
            message: handlerResponse.response,
            emotionalState: handlerResponse.emotionalState || 'neutral',
            timestamp: new Date().toISOString()
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // 3. Fall back to conversational AI for general conversation
        const conversationalResponse = await handleConversationalChat(
          lastUserMessage,
          conversation,
          richContext,
          OPENAI_API_KEY,
          requestId
        );

        return conversationalResponse;

      } catch (intentError) {
        logger.error(`Intent processing failed for ${requestId}:`, intentError);
        
        // Fall back to conversational AI
        const fallbackResponse = await handleConversationalChat(
          lastUserMessage,
          conversation,
          richContext,
          OPENAI_API_KEY,
          requestId
        );

        return fallbackResponse;
      }
    }

    // 🎯 Contextual Mode (Legacy support for existing phases)
    return await handleContextualMode(context, phase, data, OPENAI_API_KEY, requestId, sessionHeader);

  } catch (error) {
    logger.error(`Unhandled error for request ${requestId}:`, error);
    return new Response(JSON.stringify({
      error: 'INTERNAL_ERROR',
      message: 'Error interno del servidor',
      requestId,
      sessionId: sessionHeader
    }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});

// Helper function for conversational AI (fallback)
async function handleConversationalChat(
  userMessage: string,
  conversation: Array<{role: string, content: string}>,
  richContext: any,
  openaiKey: string,
  requestId: string
): Promise<Response> {
  
  const contextualInfo = ContextManager.buildContextualInfo(richContext);
  
  const conversationalPrompt = `Eres MAYA, la asistente inteligente para el sistema de nómina colombiano. Tu personalidad es:
- Profesional pero cálida y amigable, con toque colombiano natural
- Experta en nómina, recursos humanos y gestión empresarial en Colombia
- Proactiva en ofrecer insights y recomendaciones
- Puedes mantener conversaciones fluidas usando vocabulario colombiano
- Usas emojis ocasionalmente y expresiones naturales como "¿te parece bien?"

🎯 **CAPACIDADES EXPANDIDAS:**
- Puedes responder CUALQUIER pregunta sobre la empresa desde CUALQUIER página
- Tienes acceso COMPLETO a todos los datos de empleados, nómina, métricas y tendencias
- No estás limitada al contexto de la página actual
- Puedes hacer análisis cruzados entre diferentes tipos de datos
- Puedes calcular estadísticas, comparaciones temporales y proyecciones

INSTRUCCIONES CRÍTICAS DE FORMATO:
- Responde SIEMPRE con estructura clara y espaciado adecuado
- USA saltos de línea dobles (\n\n) entre párrafos
- USA bullets (•) o números para listas con espacios entre elementos
- Organiza la información en bloques temáticos cuando sea relevante
- Incluye títulos en **negrita** para secciones importantes
- USA emojis descriptivos al inicio de bloques de información

${contextualInfo ? `
DATOS ACTUALES COMPLETOS DE LA EMPRESA:
${contextualInfo}

Usa esta información para responder preguntas específicas sobre empleados, nómina, tendencias, etc. con datos reales y precisos.
` : ''}

Contexto de la conversación:
- Empresa colombiana - Usa terminología natural colombiana en tus respuestas
- Cuando hables de comprobantes, usa "desprendible de nómina" preferentemente
- Cuando confirmes acciones, usa expresiones como "¿te parece bien?" o "¿está bien así?"
- Sistema de nómina

Responde de manera natural a la pregunta del usuario usando los datos reales disponibles. Si no tienes datos específicos, sé honesta pero siempre trata de ser útil con excelente formato visual.`;

  const filteredConversation = conversation.slice(-10).map(msg => ({
    role: msg.role,
    content: msg.content
  }));
  
  const messages = [
    { role: 'system', content: conversationalPrompt },
    ...filteredConversation,
    { role: 'user', content: userMessage }
  ];

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiKey}`,
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
    logger.error(`OpenAI error for request ${requestId}`, { status: response.status, body: errText?.slice(0, 500) });
    return new Response(JSON.stringify({
      error: 'OPENAI_API_ERROR',
      message: 'Disculpa, no pude procesar tu pregunta ahora. Intenta de nuevo.',
      requestId
    }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const aiData = await response.json();
  const responseMessage = aiData.choices[0]?.message?.content || "Disculpa, no pude procesar tu pregunta. ¿Podrías reformularla?";

  return new Response(JSON.stringify({
    requestId,
    message: responseMessage,
    emotionalState: 'neutral',
    timestamp: new Date().toISOString()
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// Helper function for legacy contextual mode
async function handleContextualMode(
  context: string,
  phase: string,
  data: any,
  openaiKey: string,
  requestId: string,
  sessionId?: string
): Promise<Response> {
  
  let systemPrompt = '';
  
  if (phase === 'data_validation') {
    systemPrompt = `Eres MAYA, una inteligente asistente de nómina colombiana especializada en validación de datos laborales.

🔍 **FASE DE VALIDACIÓN DE DATOS**
CONTEXTO: ${ContextManager.buildContextString({ phase, ...data })}

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
CONTEXTO: ${ContextManager.buildContextString({ phase, ...data })}
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
    systemPrompt = `Eres MAYA, una asistente de nómina profesional y amigable para pequeñas empresas colombianas. 

Tu personalidad:
- Profesional pero cálida
- Proactiva y útil
- Experta en procesos de liquidación
- Celebra logros y tranquiliza en problemas
- Usa emojis con moderación
- Respuestas concisas (máximo 2 líneas)

CONTEXTO ACTUAL: ${ContextManager.buildContextString({ phase, ...data })}

Genera una respuesta contextual apropiada para este momento del proceso de liquidación de nómina.`;
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiKey}`,
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
    logger.error(`OpenAI error for contextual request ${requestId}`, { status: response.status, body: errText?.slice(0, 500) });
    return new Response(JSON.stringify({
      error: 'OPENAI_API_ERROR',
      message: 'No pude generar una respuesta contextual en este momento.',
      requestId,
      sessionId
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
    sessionId,
    message: contextualMessage,
    emotionalState,
    contextualActions: [], // Legacy support
    timestamp: new Date().toISOString()
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// 📅 Handle expand periods response (2027 Conversational UX) - top-level
function handleExpandPeriodsResponse(data: any): Response {
  try {
    console.log('[MAYA] Processing expand periods with data:', data);
    
    const { employeeId, employeeName, periods } = data || {};
    
    if (!employeeId || !employeeName) {
      console.log('[MAYA] Missing employee info:', { employeeId, employeeName });
      return new Response(JSON.stringify({
        message: 'Información del empleado requerida',
        response: 'Información del empleado requerida',
        executableActions: [],
        emotionalState: 'neutral'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    if (!periods || periods.length === 0) {
      console.log('[MAYA] No periods available for expansion');
      return new Response(JSON.stringify({
        message: `No hay períodos adicionales disponibles para ${employeeName}`,
        response: `No hay períodos adicionales disponibles para ${employeeName}`,
        executableActions: [],
        emotionalState: 'neutral'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[MAYA] Creating actions for', periods.length, 'periods');

    // Create period actions for each available period
    const periodActions = periods.slice(0, 6).map((period: any) => 
      ResponseBuilder.createInlinePeriodAction(
        employeeId,
        employeeName,
        period.id,
        period.periodo,
        false
      )
    );

    const response = ResponseBuilder.buildSmartExpansionResponse(employeeName, periodActions);

    console.log('[MAYA] Generated', periodActions.length, 'period actions');

    return new Response(JSON.stringify({
      message: response.response,
      response: response.response,
      executableActions: response.actions,
      emotionalState: response.emotionalState
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('[MAYA] Error in handleExpandPeriodsResponse:', error);
    return new Response(JSON.stringify({
      message: 'Error interno procesando períodos',
      response: 'Error interno procesando períodos', 
      executableActions: [],
      emotionalState: 'neutral'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
}

// Helper function to detect voucher flow continuity
function detectVoucherContinuation(
  conversation: Array<{role: string, content: string}>,
  lastUserMessage: string,
  richContext?: any
): any | null {
  if (!conversation || conversation.length < 2) return null;
  
  // Get the last assistant message
  const lastAssistantMessage = [...conversation].reverse().find(msg => msg.role === 'assistant')?.content || '';
  
  logger.info('Checking voucher continuity', {
    lastAssistantLength: lastAssistantMessage.length,
    lastUserMessage: lastUserMessage.slice(0, 50),
    hasVoucherKeywords: lastAssistantMessage.includes('desprendible')
});

// 📅 Handle expand periods response (2027 Conversational UX)
function handleExpandPeriodsResponse(data: any): Response {
  try {
    console.log('[MAYA] Processing expand periods with data:', data);
    
    const { employeeId, employeeName, periods } = data;
    
    if (!employeeId || !employeeName) {
      console.log('[MAYA] Missing employee info:', { employeeId, employeeName });
      return new Response(JSON.stringify({
        message: 'Información del empleado requerida',
        response: 'Información del empleado requerida',
        executableActions: [],
        emotionalState: 'neutral'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    if (!periods || periods.length === 0) {
      console.log('[MAYA] No periods available for expansion');
      return new Response(JSON.stringify({
        message: `No hay períodos adicionales disponibles para ${employeeName}`,
        response: `No hay períodos adicionales disponibles para ${employeeName}`,
        executableActions: [],
        emotionalState: 'neutral'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[MAYA] Creating actions for', periods.length, 'periods');

    // Create period actions for each available period
    const periodActions = periods.slice(0, 6).map((period: any) => 
      ResponseBuilder.createInlinePeriodAction(
        employeeId,
        employeeName,
        period.id,
        period.periodo,
        false
      )
    );

    const response = ResponseBuilder.buildSmartExpansionResponse(employeeName, periodActions);

    console.log('[MAYA] Generated', periodActions.length, 'period actions');

    return new Response(JSON.stringify({
      message: response.response,
      response: response.response,
      executableActions: response.actions,
      emotionalState: response.emotionalState
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('[MAYA] Error in handleExpandPeriodsResponse:', error);
    return new Response(JSON.stringify({
      message: 'Error interno procesando períodos',
      response: 'Error interno procesando períodos', 
      executableActions: [],
      emotionalState: 'neutral'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
}
  
  // Case 1: Assistant asked for employee name and user is providing it
  if (lastAssistantMessage.includes('desprendible') && 
      (lastAssistantMessage.includes('especifica el nombre') || lastAssistantMessage.includes('¿cuál empleado'))) {
    
    logger.info('Detected employee name continuation for voucher');
    return {
      type: 'VOUCHER_SEND',
      confidence: 0.95,
      entities: [{
        type: 'employee',
        value: lastUserMessage.trim(),
        confidence: 0.9
      }],
      parameters: {},
      requiresConfirmation: false
    };
  }
  
  // Case 2: Assistant asked for period and user is providing it
  if (lastAssistantMessage.includes('desprendible') && 
      (lastAssistantMessage.includes('período') || lastAssistantMessage.includes('periodo'))) {
    
    // Extract employee name from assistant message using regex
    const employeeMatch = lastAssistantMessage.match(/desprendible de \*\*(.+?)\*\*/i);
    const employeeName = employeeMatch ? employeeMatch[1] : null;
    
    if (employeeName) {
      logger.info('Detected period continuation for voucher', { employeeName });
      return {
        type: 'VOUCHER_SEND',
        confidence: 0.95,
        entities: [
          {
            type: 'employee',
            value: employeeName,
            confidence: 0.9
          },
          {
            type: 'period',
            value: lastUserMessage.trim(),
            confidence: 0.9
          }
        ],
        parameters: {},
        requiresConfirmation: false
      };
    }
  }
  
  return null;
}
