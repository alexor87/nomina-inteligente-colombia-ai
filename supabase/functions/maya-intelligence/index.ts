import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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

interface MayaRequest {
  context: string;
  phase: string;
  data?: any;
  // Chat-specific fields
  message?: string;
  conversation?: Array<{role: string, content: string}>;
  sessionId?: string;
  richContext?: any; // Rich contextual data from the app
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

    const { context, phase, data, message: userMessage, conversation, sessionId, debug: debugBody, richContext }: MayaRequest & { debug?: boolean } = await req.json();
    const debugMode = debug || debugBody;

    // 🔄 Interactive Chat Mode
    if (phase === 'interactive_chat') {
      // Add safety check for conversation
      if (!conversation || !Array.isArray(conversation)) {
        return new Response(JSON.stringify({
          error: 'INVALID_CONVERSATION',
          message: 'Conversación no válida.',
          requestId,
          sessionId: sessionId || sessionHeader
        }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      console.log(`[maya-intelligence] ↪ r_${requestId} interactive_chat {
  convLen: ${conversation.length},
  lastUserLen: ${conversation[conversation.length - 1]?.content?.length || 0},
  sessionId: "${sessionId}",
  hasContext: !!richContext,
  employeeCount: ${richContext?.employeeData?.totalCount || 0},
  hasMetrics: !!richContext?.dashboardData?.metrics,
  pageType: ${richContext?.pageType || 'unknown'}
}`);

      // 🎯 Detectar intención de acción ejecutable
      const userMessage = conversation[conversation.length - 1]?.content || '';
      const actionDetectionResult = await detectExecutableAction(userMessage, richContext, OPENAI_API_KEY);
      
      if (actionDetectionResult.hasExecutableAction) {
        console.log(`[maya-intelligence] 🎯 ${requestId} Executable action detected:`, actionDetectionResult.actions || actionDetectionResult.action);
        
        return new Response(JSON.stringify({
          message: actionDetectionResult.response,
          response: actionDetectionResult.response, // Include both for compatibility
          conversationId: sessionId,
          executableActions: actionDetectionResult.actions || [actionDetectionResult.action]
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Create comprehensive contextual information from ALL available company data
      let contextualInfo = '';
      if (richContext) {
        contextualInfo = `📍 PÁGINA ACTUAL: ${richContext.currentPage || 'Dashboard'} (Tipo: ${richContext.pageType || 'unknown'})
🏢 EMPRESA ID: ${richContext.companyId || 'N/A'}
⏰ ÚLTIMA ACTUALIZACIÓN: ${richContext.timestamp || new Date().toISOString()}

📊 **MÉTRICAS GENERALES:**
• Total empleados: ${richContext.dashboardData?.metrics?.totalEmployees || 0}
• Empleados activos: ${richContext.dashboardData?.metrics?.activeEmployees || 0}
• Empleados inactivos: ${richContext.employeeData?.inactiveCount || 0}
• Nómina total mensual: $${richContext.dashboardData?.metrics?.monthlyPayroll?.toLocaleString() || '0'}
• Nóminas pendientes: ${richContext.dashboardData?.metrics?.pendingPayroll || 0}
• Salario promedio: $${Math.round(richContext.employeeData?.avgSalary || 0).toLocaleString()}

👥 **INFORMACIÓN DETALLADA DE EMPLEADOS:**
${richContext.employeeData?.allEmployees?.length > 0 ? 
  `• Lista completa de empleados (${richContext.employeeData.allEmployees.length}):
${richContext.employeeData.allEmployees.map((emp: any) => 
  `  - ${emp.name} | ${emp.position} | ${emp.department} | $${emp.salary?.toLocaleString() || 'N/A'} | Ingreso: ${emp.hireDate || 'N/A'} | ${emp.yearsOfService} años`
).join('\n')}

• Empleados por departamento:
${Object.entries(richContext.employeeData.byDepartment || {}).map(([dept, info]: [string, any]) => 
  `  - ${dept}: ${info.count} empleados, Nómina: $${info.totalSalary?.toLocaleString()}`
).join('\n')}

• Contrataciones recientes (últimos 6 meses): ${richContext.employeeData.recentHires?.length || 0}
${richContext.employeeData.recentHires?.map((hire: any) => `  - ${hire.name} (${hire.position}) - ${hire.hireDate}`).join('\n') || '  Ninguna'}

• Empleados senior (5+ años): ${richContext.employeeData.seniorEmployees?.length || 0}
${richContext.employeeData.seniorEmployees?.map((senior: any) => `  - ${senior.name} (${senior.position}) - ${senior.yearsOfService} años`).join('\n') || '  Ninguno'}` 
  : '• No hay información detallada de empleados disponible'}

📈 **TENDENCIAS DE NÓMINA:**
${richContext.dashboardData?.payrollTrends?.length > 0 ? 
  richContext.dashboardData.payrollTrends.map((trend: any) => 
    `• ${trend.month}: $${trend.total?.toLocaleString() || 'N/A'} (${trend.employeeCount} empleados, Promedio: $${Math.round(trend.avgPerEmployee || 0).toLocaleString()})`
  ).join('\n') 
  : '• No hay datos de tendencias disponibles'}

🎯 **MÉTRICAS DE EFICIENCIA:**
${richContext.dashboardData?.efficiencyMetrics?.length > 0 ? 
  richContext.dashboardData.efficiencyMetrics.map((metric: any) => 
    `• ${metric.metric}: ${metric.value}${metric.unit} (Cambio: ${metric.change > 0 ? '+' : ''}${metric.change}%)`
  ).join('\n')
  : '• No hay métricas de eficiencia disponibles'}

⚡ **ACTIVIDAD RECIENTE:**
${richContext.dashboardData?.recentActivity?.length > 0 ? 
  richContext.dashboardData.recentActivity.map((activity: any) => `• ${activity.action} por ${activity.user} (${activity.type})`).join('\n')
  : '• No hay actividad reciente'}

🆕 **EMPLEADOS RECIENTES:**
${richContext.dashboardData?.recentEmployees?.length > 0 ? 
  richContext.dashboardData.recentEmployees.map((emp: any) => `• ${emp.name} - ${emp.position} (${emp.status}) - Departamento: ${emp.department}`).join('\n')
  : '• No hay empleados recientes registrados'}
`;
      }

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

EJEMPLOS DE FORMATO CORRECTO:
Para listas de empleados:
"👥 **EMPLEADOS ACTIVOS:**\n• Empleado 1 (Cargo)\n• Empleado 2 (Cargo)\n• Empleado 3 (Cargo)\n\n¿Necesitas más información?"

Para métricas:
"📊 **RESUMEN FINANCIERO:**\n• Costo total de nómina: $X,XXX,XXX\n• Empleados activos: XX\n• Tendencia mensual: ↗️ +X%\n\n💡 **RECOMENDACIÓN:**\nBasándome en tus datos actuales..."

🔍 **TIPOS DE CONSULTAS QUE PUEDES MANEJAR:**
- Información específica de empleados (nombres, cargos, salarios, antigüedad)
- Envío de desprendibles de nómina, colillas de pago y recibos de sueldo
- Análisis financieros y de nómina (totales, promedios, tendencias)
- Comparaciones departamentales y organizacionales
- Estadísticas de contratación y rotación
- Proyecciones y recomendaciones basadas en datos históricos
- Cualquier cálculo o análisis relacionado con RRHH

📋 **VOCABULARIO COLOMBIANO QUE ENTIENDES:**
- Desprendible/colilla/volante/recibo de pago o nómina
- Certificados de ingresos y paz y salvos
- Despachar/mandar/remitir/expedir documentos
- Correo electrónico para envíos

${contextualInfo ? `
DATOS ACTUALES COMPLETOS DE LA EMPRESA:
${contextualInfo}

Usa esta información para responder preguntas específicas sobre empleados, nómina, tendencias, etc. con datos reales y precisos.
` : ''}

Contexto de la conversación:
- Página actual: ${context}
- Empresa colombiana - Usa terminología natural colombiana en tus respuestas
- Cuando hables de comprobantes, usa "desprendible de nómina" preferentemente
- Cuando confirmes acciones, usa expresiones como "¿te parece bien?" o "¿está bien así?"
- Sistema de nómina

Responde de manera natural a la pregunta del usuario usando los datos reales disponibles. Si no tienes datos específicos, sé honesta pero siempre trata de ser útil con excelente formato visual.`;

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

      console.log(`[maya-intelligence] ↪ r_${requestId} interactive_chat {
  convLen: ${conversation.length},
  lastUserLen: ${userMessage.length},
  sessionId: "${sessionId || sessionHeader}",
  hasContext: !!richContext,
  employeeCount: richContext?.employeeData?.totalCount || 0,
  hasMetrics: !!richContext?.dashboardData?.metrics,
  pageType: richContext?.pageType || 'unknown'
}`);

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

    // 🎯 Detectar intención de acción ejecutable también en modo contextual
    const actionDetectionResult = await detectExecutableAction(contextualMessage, data, OPENAI_API_KEY);
    
    return new Response(JSON.stringify({
      requestId,
      sessionId: sessionHeader,
      message: contextualMessage,
      emotionalState,
      contextualActions: generateContextualActions(context, phase),
      executableActions: actionDetectionResult.hasExecutableAction ? [actionDetectionResult.action] : undefined,
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

// 🎯 Detect if user message requires an executable action
async function detectExecutableAction(userMessage: string, richContext: any, openaiKey: string): Promise<{
  hasExecutableAction: boolean;
  action?: any;
  actions?: any[];
  response?: string;
}> {
  try {
    // Enhanced keywords for better detection - Colombian Spanish vocabulary
    const voucherKeywords = [
      // Verbos para enviar (Colombian synonyms)
      'envía', 'manda', 'enviar', 'mandar', 'envia', 'enví', 'enviá',
      'despachar', 'despacha', 'remitir', 'remite', 'hacer llegar',
      'expedir', 'expide', 'generar', 'genera', 'emitir', 'emite',
      'sacar', 'saca', 'sacarme', 'sacame',
      
      // Términos colombianos para comprobantes de nómina
      'desprendible', 'desprendible de pago', 'desprendible de nomina', 'desprendible de nómina',
      'colilla', 'colilla de pago', 'colilla de nomina', 'colilla de nómina',
      'volante', 'volante de pago', 'volante de nomina', 'volante de nómina',
      'recibo', 'recibo de pago', 'recibo de nomina', 'recibo de nómina',
      'certificado', 'certificado de ingresos', 'certificado laboral',
      'comprobante', 'voucher', 'liquidación', 'liquidacion', 'nomina', 'nómina',
      'paz y salvo', 'sueldo', 'pago', 'pagos',
      
      // Medios de envío
      'email', 'correo', 'correo electrónico', 'correo electronico',
      'mail', 'e-mail', 'electrónico', 'electronico'
    ];
    const searchKeywords = ['busca', 'encuentra', 'mostrar', 'ver', 'detalles de', 'información de', 'info de'];
    
    const messageWords = userMessage.toLowerCase();
    
    // Helper function to normalize text (remove accents, clean)
    const normalizeText = (text: string) => {
      return text.toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove accents
        .replace(/[^\w\s]/g, ' ') // Replace punctuation with spaces
        .replace(/\s+/g, ' ') // Multiple spaces to single
        .trim();
    };

    // 📧 Detect voucher sending intent
    if (voucherKeywords.some(keyword => messageWords.includes(keyword))) {
      console.log(`[maya-intelligence] 📧 Voucher intent detected in: "${userMessage}"`);
      
      // Enhanced email extraction with better sanitization
      const emailPattern = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
      const extractedEmail = userMessage.match(emailPattern)?.[0];
      
      // Sanitize email - remove trailing punctuation
      let sanitizedEmail = extractedEmail;
      if (extractedEmail) {
        sanitizedEmail = extractedEmail.replace(/[?.!,;)\]]+$/, '').replace(/^[(\[]+/, '');
      }
      
      // Debug logging
      if (richContext?.employeeData?.allEmployees) {
        console.log(`[maya-intelligence] 🔍 Available employees: ${richContext.employeeData.allEmployees.map((emp: any) => emp.name).join(', ')}`);
        console.log(`[maya-intelligence] 🔍 Searching for employee in message: "${userMessage}"`);
      }
      
      // Enhanced employee search with robust matching
      let foundEmployee = null;
      if (richContext?.employeeData?.allEmployees) {
        const normalizedMessage = normalizeText(userMessage);
        
        // First pass: Direct name matching with normalization
        foundEmployee = richContext.employeeData.allEmployees.find((emp: any) => {
          const normalizedEmpName = normalizeText(emp.name);
          
          // Check if full name appears in message
          if (normalizedMessage.includes(normalizedEmpName)) {
            console.log(`[maya-intelligence] ✅ Full name match: "${emp.name}" found in message`);
            return true;
          }
          
          // Check individual words (first name, last name)
          const nameWords = normalizedEmpName.split(' ').filter(word => word.length >= 2);
          const messageWords = normalizedMessage.split(' ');
          
          // Look for at least 2 matching words for common names, or 1 for unique names
          const matchingWords = nameWords.filter(nameWord => 
            messageWords.some(msgWord => 
              msgWord.includes(nameWord) || nameWord.includes(msgWord)
            )
          );
          
          const hasMatch = matchingWords.length >= Math.min(2, nameWords.length);
          if (hasMatch) {
            console.log(`[maya-intelligence] ✅ Partial name match: "${emp.name}" (matched words: ${matchingWords.join(', ')})`);
          }
          
          return hasMatch;
        });
        
        // Second pass: Fuzzy matching for single names or nicknames
        if (!foundEmployee) {
          foundEmployee = richContext.employeeData.allEmployees.find((emp: any) => {
            const normalizedEmpName = normalizeText(emp.name);
            const nameWords = normalizedEmpName.split(' ');
            
            // Check for single word matches (first names, nicknames)
            return nameWords.some(nameWord => {
              if (nameWord.length >= 3) {
                // Check if message contains the name word
                const isContained = normalizedMessage.includes(nameWord);
                if (isContained) {
                  console.log(`[maya-intelligence] ✅ Single word match: "${nameWord}" from "${emp.name}"`);
                  return true;
                }
                
                // Check similarity for common variations (edit distance of 1)
                const messageWords = normalizedMessage.split(' ');
                const similarWord = messageWords.find(msgWord => {
                  if (Math.abs(msgWord.length - nameWord.length) <= 1) {
                    let differences = 0;
                    const maxLen = Math.max(msgWord.length, nameWord.length);
                    for (let i = 0; i < maxLen; i++) {
                      if (msgWord[i] !== nameWord[i]) differences++;
                      if (differences > 1) break;
                    }
                    return differences <= 1;
                  }
                  return false;
                });
                
                if (similarWord) {
                  console.log(`[maya-intelligence] ✅ Fuzzy match: "${similarWord}" ≈ "${nameWord}" from "${emp.name}"`);
                  return true;
                }
              }
              return false;
            });
          });
        }
      }
      
      // If we found an employee directly, create TWO actions for integrated confirmation
      if (foundEmployee) {
        console.log(`[maya-intelligence] 🎯 Direct employee match found: ${foundEmployee.name}`);
        
        // Query latest period for confirmation
        let latestPeriod = null;
        try {
          const { data: periodData } = await supabase
            .from('payroll_periods_real')
            .select('id, periodo, fecha_inicio, fecha_fin, estado')
            .eq('company_id', richContext?.companyId)
            .eq('estado', 'cerrado')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
          
          latestPeriod = periodData;
          console.log(`[maya-intelligence] 📅 Latest period detected: ${periodData?.periodo}`);
        } catch (error) {
          console.log(`[maya-intelligence] ⚠️ Could not fetch latest period: ${error}`);
        }
        
        const baseParams = {
          employeeId: foundEmployee.id,
          employeeName: foundEmployee.name,
          email: sanitizedEmail,
          periodId: latestPeriod?.id,
          periodName: latestPeriod?.periodo
        };

        return {
          hasExecutableAction: true,
          actions: [
            {
              id: `confirm_voucher_${Date.now()}`,
              type: 'confirm_send_voucher',
              label: `✅ Sí, enviar a ${foundEmployee.name}`,
              description: latestPeriod ? `Período: ${latestPeriod.periodo}` : 'Período más reciente',
              parameters: baseParams,
              requiresConfirmation: false,
              icon: 'check-circle'
            },
            {
              id: `alternatives_voucher_${Date.now()}`,
              type: 'show_period_alternatives', 
              label: `❌ No, ver otros períodos`,
              description: 'Mostrar períodos alternativos para seleccionar',
              parameters: baseParams,
              requiresConfirmation: false,
              icon: 'x-circle'
            }
          ],
          response: latestPeriod 
            ? `Detecté el período **${latestPeriod.periodo}** para ${foundEmployee.name}. ¿Confirmas el envío del comprobante${sanitizedEmail ? ` al email ${sanitizedEmail}` : ' a su email registrado'}?`
            : `Puedo ayudarte a enviar el comprobante de ${foundEmployee.name}${sanitizedEmail ? ` al email ${sanitizedEmail}` : ' a su email registrado'}. ¿Confirmas el envío?`
        };
      }
      
      // If no direct match, use AI extraction as enhanced fallback
      if (richContext?.employeeData?.allEmployees?.length > 0) {
        console.log(`[maya-intelligence] 🤖 No direct match found, trying AI extraction...`);
        
        const extractionPrompt = `Analiza este mensaje y extrae EXACTAMENTE el nombre del empleado mencionado:

MENSAJE: "${userMessage}"

EMPLEADOS DISPONIBLES:
${richContext.employeeData.allEmployees.map((emp: any, idx: number) => `${idx + 1}. ${emp.name}`).join('\n')}

INSTRUCCIONES:
- Si encuentras una coincidencia clara, responde con el nombre EXACTO de la lista
- Si no hay coincidencia clara, responde "NO_ENCONTRADO"
- Considera variaciones, apodos y nombres parciales
- Solo responde con el nombre, nada más

RESPUESTA:`;

        try {
          const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${openaiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'gpt-4o-mini',
              messages: [{ role: 'user', content: extractionPrompt }],
              max_tokens: 100,
              temperature: 0.1,
            }),
          });

          if (response.ok) {
            const aiData = await response.json();
            const extractedName = aiData.choices[0]?.message?.content?.trim();
            
            if (extractedName && extractedName !== 'NO_ENCONTRADO') {
              console.log(`[maya-intelligence] 🤖 AI extracted name: "${extractedName}"`);
              
              // Enhanced matching after AI extraction
              const employee = richContext.employeeData.allEmployees.find((emp: any) => {
                const normalizedEmpName = normalizeText(emp.name);
                const normalizedExtracted = normalizeText(extractedName);
                
                // Exact match
                if (normalizedEmpName === normalizedExtracted) return true;
                
                // Partial match (either direction)
                if (normalizedEmpName.includes(normalizedExtracted) || 
                    normalizedExtracted.includes(normalizedEmpName)) return true;
                
                // Word-by-word matching
                const empWords = normalizedEmpName.split(' ');
                const extractedWords = normalizedExtracted.split(' ');
                
                return empWords.some(empWord => 
                  extractedWords.some(extWord => 
                    (empWord.length >= 3 && extWord.length >= 3) &&
                    (empWord.includes(extWord) || extWord.includes(empWord))
                  )
                );
              });

              if (employee) {
                console.log(`[maya-intelligence] ✅ Employee found via AI: ${employee.name}`);
                
                // Query latest period for confirmation
                let latestPeriod = null;
                try {
                  const { data: periodData } = await supabase
                    .from('payroll_periods_real')
                    .select('id, periodo, fecha_inicio, fecha_fin, estado')
                    .eq('company_id', richContext?.companyId)
                    .eq('estado', 'cerrado')
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .single();
                  
                  latestPeriod = periodData;
                  console.log(`[maya-intelligence] 📅 Latest period detected: ${periodData?.periodo}`);
                } catch (error) {
                  console.log(`[maya-intelligence] ⚠️ Could not fetch latest period: ${error}`);
                }
                
                const baseParams = {
                  employeeId: employee.id,
                  employeeName: employee.name,
                  email: sanitizedEmail,
                  periodId: latestPeriod?.id,
                  periodName: latestPeriod?.periodo
                };

                return {
                  hasExecutableAction: true,
                  actions: [
                    {
                      id: `confirm_voucher_${Date.now()}`,
                      type: 'confirm_send_voucher',
                      label: `✅ Sí, enviar a ${employee.name}`,
                      description: latestPeriod ? `Período: ${latestPeriod.periodo}` : 'Período más reciente',
                      parameters: baseParams,
                      requiresConfirmation: false,
                      icon: 'check-circle'
                    },
                    {
                      id: `alternatives_voucher_${Date.now()}`,
                      type: 'show_period_alternatives',
                      label: `❌ No, ver otros períodos`,
                      description: 'Mostrar períodos alternativos para seleccionar',
                      parameters: baseParams,
                      requiresConfirmation: false,
                      icon: 'x-circle'
                    }
                  ],
                  response: latestPeriod 
                    ? `Detecté el período **${latestPeriod.periodo}** para ${employee.name}. ¿Confirmas el envío del comprobante${sanitizedEmail ? ` al email ${sanitizedEmail}` : ' a su email registrado'}?`
                    : `Puedo ayudarte a enviar el comprobante de ${employee.name}${sanitizedEmail ? ` al email ${sanitizedEmail}` : ' a su email registrado'}. ¿Confirmas el envío?`
                };
              } else {
                console.log(`[maya-intelligence] ❌ AI extracted "${extractedName}" but no matching employee found`);
              }
            } else {
              console.log(`[maya-intelligence] 🤖 AI could not extract employee name from message`);
            }
          }
        } catch (e) {
          console.error('[maya-intelligence] AI extraction error:', e);
        }
      }
      
      // Enhanced fallback: If voucher keywords found but no specific employee, offer generic action
      if (richContext?.employeeData?.allEmployees?.length > 0) {
        console.log('[maya-intelligence] 📤 Generic voucher action fallback (no specific employee found)');
        return {
          hasExecutableAction: true,
          action: {
            id: `send_voucher_generic_${Date.now()}`,
            type: 'send_voucher',
            label: 'Enviar comprobante de nómina',
            description: 'Seleccionar empleado y proceder con el envío',
            parameters: {
              email: sanitizedEmail
            },
            requiresConfirmation: true,
            icon: 'send'
          },
          response: `Puedo ayudarte a enviar un comprobante de nómina${sanitizedEmail ? ` al email ${sanitizedEmail}` : ''}. Haz clic en el botón para seleccionar el empleado.`
        };
      } else {
        console.log('[maya-intelligence] ❌ No employees available for voucher action');
      }
    }

    // 👤 Detect search/view intent
    if (searchKeywords.some(keyword => messageWords.includes(keyword))) {
      return {
        hasExecutableAction: true,
        action: {
          id: `search_${Date.now()}`,
          type: 'search_employee',
          label: 'Buscar empleados',
          description: 'Mostrar resultados detallados',
          parameters: {
            query: userMessage
          },
          requiresConfirmation: false,
          icon: 'search'
        },
        response: 'Puedo ayudarte a buscar esa información. Haz clic en el botón para ver los resultados detallados.'
      };
    }

    return { hasExecutableAction: false };
  } catch (error) {
    console.error('[maya-intelligence] Error detecting executable action:', error);
    return { hasExecutableAction: false };
  }
}

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