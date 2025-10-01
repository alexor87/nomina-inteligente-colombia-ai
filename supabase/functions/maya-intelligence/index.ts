// ============================================================================
// MAYA Intelligence - KISS Implementation
// ============================================================================
// Simplified from 1,900+ lines to <300 lines with 10x better performance

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SimpleIntentMatcher } from './SimpleIntentMatcher.ts';
import { liquidarNomina, registrarNovedad, calcularPrestacion, generarReporte } from './payroll-handlers.ts';
import { buildStructuredResponse } from './structured-response-builder.ts';

// ============================================================================
// CONVERSATIONAL CONTEXT SYSTEM
// ============================================================================

// Detect follow-up queries like "y a [name]?", "y [name]?", etc.
function detectFollowUpQuery(text: string): string | null {
  const lowerText = text.toLowerCase().trim();
  
  // Pattern 1: "y a [name]?" / "y para [name]?"
  const pattern1 = lowerText.match(/^(?:y\s+)?(?:a|para)\s+([a-záéíóúñ]+(?:\s+[a-záéíóúñ]+)*)\s*\??$/i);
  if (pattern1) {
    return pattern1[1].trim();
  }
  
  // Pattern 2: "y [name]?" / "también [name]?"
  const pattern2 = lowerText.match(/^(?:y|también|tambien)\s+([a-záéíóúñ]+(?:\s+[a-záéíóúñ]+)*)\s*\??$/i);
  if (pattern2) {
    return pattern2[1].trim();
  }
  
  // Pattern 3: "qué tal [name]?" / "y de [name]?"
  const pattern3 = lowerText.match(/^(?:qué\s+tal|que\s+tal|y\s+de|y\s+del|y\s+de\s+la)\s+([a-záéíóúñ]+(?:\s+[a-záéíóúñ]+)*)\s*\??$/i);
  if (pattern3) {
    return pattern3[1].trim();
  }
  
  return null;
}

// Analyze previous assistant responses to identify the last intent and extract parameters
function analyzeConversationContext(conversation: any[]): { intentType: string | null; params: any } {
  // Look at the last 3 assistant messages to find context
  const assistantMessages = conversation
    .filter(msg => msg.role === 'assistant')
    .slice(-3);
  
  if (assistantMessages.length === 0) {
    return { intentType: null, params: {} };
  }
  
  const lastAssistantMessage = assistantMessages[assistantMessages.length - 1]?.content || '';
  
  // Detect EMPLOYEE_PAID_TOTAL context
  if (/(?:le\s+has\s+pagado|total\s+pagado|pagado.*\*\*\$[\d,]+\*\*.*en\s+\*\*\d+\s+nóminas\*\*|este\s+año.*pagado)/i.test(lastAssistantMessage)) {
    // Extract timeframe from the response
    let year = null;
    let month = null;
    
    // Look for "este año" or specific year
    if (/este\s+año/i.test(lastAssistantMessage)) {
      year = new Date().getFullYear();
    } else {
      const yearMatch = lastAssistantMessage.match(/en\s+(\d{4})/i);
      if (yearMatch) {
        year = parseInt(yearMatch[1]);
      }
    }
    
    // Look for specific month
    const monthMatch = lastAssistantMessage.match(/en\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\s+(\d{4})?/i);
    if (monthMatch) {
      month = monthMatch[1].toLowerCase();
      if (monthMatch[2]) {
        year = parseInt(monthMatch[2]);
      }
    }
    
    console.log('🔍 [CONTEXT] Detected EMPLOYEE_PAID_TOTAL context:', { year, month });
    return { 
      intentType: 'EMPLOYEE_PAID_TOTAL', 
      params: { year, month }
    };
  }
  
  // Detect EMPLOYEE_SALARY context
  if (/(?:salario\s+base|💰\s+salario\s+base|cargo.*salario)/i.test(lastAssistantMessage)) {
    console.log('🔍 [CONTEXT] Detected EMPLOYEE_SALARY context');
    return { 
      intentType: 'EMPLOYEE_SALARY', 
      params: {}
    };
  }
  
  // Detect EMPLOYEE_SEARCH context
  if (/encontré.*empleados|empleados.*encontré/i.test(lastAssistantMessage)) {
    console.log('🔍 [CONTEXT] Detected EMPLOYEE_SEARCH context');
    return { 
      intentType: 'EMPLOYEE_SEARCH', 
      params: {}
    };
  }
  
  // Detect PENDING_EMAIL_FOR_VOUCHER context
  if (/¿A\s+qué\s+email\s+deseas\s+enviar\s+el\s+comprobante\s+de\s+\*\*(.+?)\*\*\?/i.test(lastAssistantMessage)) {
    const employeeMatch = lastAssistantMessage.match(/\*\*(.+?)\*\*/);
    const employeeName = employeeMatch ? employeeMatch[1] : null;
    
    console.log('🔍 [CONTEXT] Detected PENDING_EMAIL_FOR_VOUCHER context:', { employeeName });
    return { 
      intentType: 'PENDING_EMAIL_FOR_VOUCHER', 
      params: { employeeName }
    };
  }

  // Detect PENDING_SAVE_EMAIL_CONFIRMATION context
  if (/¿Deseas\s+guardar.*como\s+el\s+email\s+de\s+\*\*(.+?)\*\*\?/i.test(lastAssistantMessage)) {
    const emailMatch = lastAssistantMessage.match(/guardar\s+([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
    const email = emailMatch ? emailMatch[1] : null;
    const employeeNameMatch = lastAssistantMessage.match(/de\s+\*\*(.+?)\*\*\?/);
    const employeeName = employeeNameMatch ? employeeNameMatch[1] : null;
    
    console.log('🔍 [CONTEXT] Detected PENDING_SAVE_EMAIL_CONFIRMATION context:', { employeeName, email });
    return { 
      intentType: 'PENDING_SAVE_EMAIL_CONFIRMATION', 
      params: { employeeName, email }
    };
  }
  
  return { intentType: null, params: {} };
}

// Infer intent based on follow-up query and context
function inferIntentFromContext(followUpName: string, context: { intentType: string | null; params: any }): any {
  if (!context.intentType) {
    return null;
  }
  
  console.log(`🧠 [INFERENCE] Follow-up for "${followUpName}" with context: ${context.intentType}`);
  
  switch (context.intentType) {
    case 'EMPLOYEE_PAID_TOTAL':
      return {
        type: 'EMPLOYEE_PAID_TOTAL',
        method: 'getEmployeePaidTotal',
        params: {
          name: followUpName,
          year: context.params.year,
          month: context.params.month
        },
        confidence: 0.95
      };
      
    case 'EMPLOYEE_SALARY':
      return {
        type: 'EMPLOYEE_SALARY',
        method: 'getEmployeeSalary',
        params: { name: followUpName },
        confidence: 0.95
      };
      
    case 'EMPLOYEE_SEARCH':
      return {
        type: 'EMPLOYEE_SEARCH',
        method: 'searchEmployee',
        params: { name: followUpName },
        confidence: 0.95
      };
      
    default:
      return null;
  }
}

// Helper function to extract employee names from salary queries
function extractNameFromSalaryQuery(text: string): string | null {
  const lowerText = text.toLowerCase().trim();
  
  // Pattern 1: "cual es el salario de eliana"
  const pattern1Match = lowerText.match(/(?:cuál|cual|cuánto|cuanto|qué|que)\s+(?:es\s+el\s+)?(?:salario|sueldo|gana|cobra)\s+de\s+([a-záéíóúñ\s]+)/i);
  if (pattern1Match) {
    return pattern1Match[1]?.trim().replace(/[?.,!]+$/, '') || null;
  }
  
  // Pattern 2: "salario de eliana"
  const pattern2Match = lowerText.match(/(?:salario|sueldo|gana|cobra)\s+(?:de|del|de\s+la)\s+([a-záéíóúñ\s]+)/i);
  if (pattern2Match) {
    return pattern2Match[1]?.trim().replace(/[?.,!]+$/, '') || null;
  }
  
  // Pattern 3: "sueldo eliana" (without preposition, avoid general terms)
  if (!/nomina|total|cuanto|mes|año|periodo/i.test(lowerText)) {
    const pattern3Match = lowerText.match(/(?:salario|sueldo)\s+([a-záéíóúñ]+(?:\s+[a-záéíóúñ]+)?)/i);
    if (pattern3Match) {
      return pattern3Match[1]?.trim().replace(/[?.,!]+$/, '') || null;
    }
  }
  
  return null;
}

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get user token from auth header
    const authHeader = req.headers.get('Authorization') || '';
    const userSupabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { conversation, sessionId } = await req.json();
    
    if (!conversation || !Array.isArray(conversation)) {
      return new Response(JSON.stringify({
        error: 'Invalid conversation format',
        message: 'Formato de conversación inválido'
      }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const lastMessage = conversation[conversation.length - 1]?.content || '';
    console.log(`[MAYA-KISS] Processing: "${lastMessage}"`);
    
    // ============================================================================
    // CONVERSATIONAL CONTEXT ANALYSIS - PRIORITY 1
    // ============================================================================
    
    // First, check if this is a follow-up query like "y a [name]?"
    const followUpName = detectFollowUpQuery(lastMessage);
    let intent;
    
    if (followUpName) {
      console.log(`🔄 [CONTEXT] Follow-up query detected for: "${followUpName}"`);
      
      // CRITICAL: Validate employee exists before proceeding with ANY query
      const validation = await validateEmployeeExists(userSupabase, followUpName);
      
      if (!validation.exists) {
        console.log(`🚫 [SECURITY] Employee "${followUpName}" does not exist - blocking potential hallucination`);
        return new Response(JSON.stringify({
          message: `No encontré un empleado llamado "${followUpName}" en tu empresa. ¿Podrías verificar la ortografía o el nombre completo?`,
          emotionalState: 'neutral',
          sessionId,
          timestamp: new Date().toISOString()
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      if (validation.multiple) {
        const employeeList = Array.isArray(validation.employee) 
          ? validation.employee.map((emp: any) => `• **${emp.nombre} ${emp.apellido}**`).join('\n')
          : '';
        return new Response(JSON.stringify({
          message: `Encontré varios empleados con "${followUpName}":\n\n${employeeList}\n\n¿Podrías ser más específico?`,
          emotionalState: 'neutral',
          sessionId,
          timestamp: new Date().toISOString()
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      // Analyze conversation context to infer intent
      const context = analyzeConversationContext(conversation);
      const inferredIntent = inferIntentFromContext(followUpName, context);
      
      if (inferredIntent) {
        console.log(`✅ [CONTEXT] Intent inferred: ${inferredIntent.type} for "${followUpName}"`);
        intent = inferredIntent;
      } else {
        console.log(`❓ [CONTEXT] No clear context found, asking for clarification`);
        return new Response(JSON.stringify({
          message: `¿Qué información necesitas sobre ${followUpName}? Por ejemplo:\n• Salario\n• Total pagado este año\n• Buscar datos del empleado`,
          emotionalState: 'neutral',
          sessionId,
          timestamp: new Date().toISOString()
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    } else {
      // No follow-up detected, use normal intent matching
      intent = SimpleIntentMatcher.match(lastMessage);
    }
    
    console.log(`[MAYA-KISS] Intent: ${intent.type} (${intent.confidence})`);
    
    // ============================================================================
    // HANDLE CONVERSATIONAL CONTEXTS (BEFORE SAFETY OVERRIDES)
    // ============================================================================
    
    // Check for conversational contexts that need special handling
    const conversationContext = analyzeConversationContext(conversation);
    
    // Handle PENDING_EMAIL_FOR_VOUCHER context
    if (conversationContext.intentType === 'PENDING_EMAIL_FOR_VOUCHER') {
      const { employeeName } = conversationContext.params;
      
      // Extract email from user message
      const emailMatch = lastMessage.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
      const providedEmail = emailMatch ? emailMatch[1] : null;
      
      if (!providedEmail) {
        return new Response(JSON.stringify({
          message: "❌ No detecté un email válido. Por favor escríbelo en el formato correcto (ejemplo: nombre@ejemplo.com)",
          emotionalState: 'concerned',
          sessionId,
          timestamp: new Date().toISOString()
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      
      // Get company context
      const { data: companyData } = await userSupabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', (await userSupabase.auth.getUser()).data.user?.id)
        .single();
      
      if (!companyData?.company_id) {
        return new Response(JSON.stringify({
          message: "❌ No pude identificar tu empresa.",
          emotionalState: 'concerned',
          sessionId,
          timestamp: new Date().toISOString()
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      
      // Find employee
      const { data: employees } = await userSupabase
        .from('employees')
        .select('id, nombre, apellido')
        .eq('company_id', companyData.company_id)
        .eq('estado', 'activo')
        .ilike('nombre', `%${employeeName}%`);
      
      const employee = employees?.[0];
      
      if (!employee) {
        return new Response(JSON.stringify({
          message: `❌ No pude encontrar al empleado ${employeeName}. Por favor intenta de nuevo.`,
          emotionalState: 'concerned',
          sessionId,
          timestamp: new Date().toISOString()
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      
      // Execute send voucher immediately with provided email
      try {
        // Use admin client for action execution
        const supabaseAdmin = createClient(
          supabaseUrl,
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
          { auth: { persistSession: false } }
        );
        
        const { data: actionResult, error: actionError } = await supabaseAdmin.functions.invoke('execute-maya-action', {
          body: { 
            action: {
              type: 'confirm_send_voucher',
              parameters: {
                employeeId: employee.id,
                employeeName: `${employee.nombre} ${employee.apellido}`,
                email: providedEmail,
                periodId: 'latest'
              }
            }
          }
        });
        
        if (actionError) {
          console.error('❌ Error executing send voucher:', actionError);
          return new Response(JSON.stringify({
            message: `❌ Hubo un error al enviar el comprobante: ${actionError.message}`,
            emotionalState: 'concerned',
            sessionId,
            timestamp: new Date().toISOString()
          }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        
        console.log('✅ Voucher sent successfully to temporary email');
        
        // Now ask if they want to save the email
        const confirmMessage = `✅ Comprobante de **${employee.nombre} ${employee.apellido}** enviado a **${providedEmail}**

¿Deseas guardar ${providedEmail} como el email de **${employee.nombre} ${employee.apellido}**?`;
        
        return new Response(JSON.stringify({
          message: confirmMessage,
          emotionalState: 'encouraging',
          executableActions: [
            {
              id: `save_email_${employee.id}_${Date.now()}`,
              type: 'confirm',
              label: '✅ Sí, guardar',
              description: 'Guardar email en perfil del empleado',
              parameters: { employeeId: employee.id, email: providedEmail },
              requiresConfirmation: false,
              icon: '✅'
            },
            {
              id: `cancel_save_${Date.now()}`,
              type: 'cancel',
              label: '❌ No, solo enviar',
              description: 'No guardar el email',
              parameters: {},
              requiresConfirmation: false,
              icon: '❌'
            }
          ],
          executable_actions: [
            {
              id: `save_email_${employee.id}_${Date.now()}`,
              type: 'confirm',
              label: '✅ Sí, guardar',
              description: 'Guardar email en perfil del empleado',
              parameters: { employeeId: employee.id, email: providedEmail },
              requiresConfirmation: false,
              icon: '✅'
            },
            {
              id: `cancel_save_${Date.now()}`,
              type: 'cancel',
              label: '❌ No, solo enviar',
              description: 'No guardar el email',
              parameters: {},
              requiresConfirmation: false,
              icon: '❌'
            }
          ],
          sessionId,
          timestamp: new Date().toISOString()
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        
      } catch (error) {
        console.error('❌ Error in PENDING_EMAIL_FOR_VOUCHER handler:', error);
        return new Response(JSON.stringify({
          message: `❌ Error al enviar el comprobante: ${error.message}`,
          emotionalState: 'concerned',
          sessionId,
          timestamp: new Date().toISOString()
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }
    
    // Handle PENDING_SAVE_EMAIL_CONFIRMATION context
    if (conversationContext.intentType === 'PENDING_SAVE_EMAIL_CONFIRMATION') {
      const { employeeName, email } = conversationContext.params;
      
      // Detect affirmative response
      const isAffirmative = /^(s[ií]|yes|ok|dale|claro|por\s+supuesto|confirmo)/i.test(lastMessage.trim());
      
      if (!isAffirmative) {
        return new Response(JSON.stringify({
          message: "👍 Entendido, el email no se guardará. ¿En qué más puedo ayudarte?",
          emotionalState: 'neutral',
          sessionId,
          timestamp: new Date().toISOString()
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      
      // Get company context
      const { data: companyData } = await userSupabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', (await userSupabase.auth.getUser()).data.user?.id)
        .single();
      
      if (!companyData?.company_id) {
        return new Response(JSON.stringify({
          message: "❌ No pude identificar tu empresa.",
          emotionalState: 'concerned',
          sessionId,
          timestamp: new Date().toISOString()
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      
      // Find employee
      const { data: employees } = await userSupabase
        .from('employees')
        .select('id, nombre, apellido')
        .eq('company_id', companyData.company_id)
        .eq('estado', 'activo')
        .ilike('nombre', `%${employeeName}%`);
      
      const employee = employees?.[0];
      
      if (!employee) {
        return new Response(JSON.stringify({
          message: `❌ No pude encontrar al empleado ${employeeName}.`,
          emotionalState: 'concerned',
          sessionId,
          timestamp: new Date().toISOString()
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      
      // Update employee email in database
      try {
        const { error: updateError } = await userSupabase
          .from('employees')
          .update({ email: email })
          .eq('id', employee.id);
        
        if (updateError) {
          console.error('❌ Error updating employee email:', updateError);
          return new Response(JSON.stringify({
            message: `❌ Hubo un error al guardar el email: ${updateError.message}`,
            emotionalState: 'concerned',
            sessionId,
            timestamp: new Date().toISOString()
          }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        
        console.log(`✅ Email saved for employee: ${employee.nombre} ${employee.apellido} -> ${email}`);
        
        return new Response(JSON.stringify({
          message: `✅ Email guardado exitosamente. **${employee.nombre} ${employee.apellido}** ahora tiene **${email}** registrado.`,
          emotionalState: 'celebrating',
          sessionId,
          timestamp: new Date().toISOString()
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        
      } catch (error) {
        console.error('❌ Error in PENDING_SAVE_EMAIL_CONFIRMATION handler:', error);
        return new Response(JSON.stringify({
          message: `❌ Error al guardar el email: ${error.message}`,
          emotionalState: 'concerned',
          sessionId,
          timestamp: new Date().toISOString()
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }

    // ============================================================================
    // ENHANCED SAFETY OVERRIDES - ANTI-HALLUCINATION PROTECTION
    // ============================================================================
    
    // Enhanced Safety Override: Detect ANY employee name in query and force validation
    const detectedEmployeeName = detectEmployeeNameInQuery(lastMessage);
    if (detectedEmployeeName && !['EMPLOYEE_SEARCH', 'EMPLOYEE_SALARY', 'EMPLOYEE_PAID_TOTAL'].includes(intent.type)) {
      console.log(`🚨 [SECURITY] Employee name "${detectedEmployeeName}" detected in non-employee query - validating`);
      
      const validation = await validateEmployeeExists(userSupabase, detectedEmployeeName);
      if (!validation.exists) {
        console.log(`🚫 [SECURITY] Blocking potential hallucination - employee "${detectedEmployeeName}" not found`);
        return new Response(JSON.stringify({
          message: `No encontré un empleado llamado "${detectedEmployeeName}" en tu empresa. ¿Podrías verificar la ortografía?`,
          emotionalState: 'neutral',
          sessionId,
          timestamp: new Date().toISOString()
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // Safety Override 1: If classified as general payroll but looks like employee salary query
    if (intent.method === 'getPayrollTotals' && intent.type !== 'EMPLOYEE_SALARY') {
      const possibleName = extractNameFromSalaryQuery(lastMessage);
      if (possibleName) {
        console.log(`[MAYA-KISS] 🔧 SAFETY OVERRIDE: Detected employee salary query for "${possibleName}"`);
        
        // Validate employee exists before changing intent
        const validation = await validateEmployeeExists(userSupabase, possibleName);
        if (!validation.exists) {
          console.log(`🚫 [SECURITY] Blocking salary query for non-existent employee "${possibleName}"`);
          return new Response(JSON.stringify({
            message: `No encontré un empleado llamado "${possibleName}" en tu empresa. ¿Podrías verificar la ortografía?`,
            emotionalState: 'neutral',
            sessionId,
            timestamp: new Date().toISOString()
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        
        intent.method = 'getEmployeeSalary';
        intent.params = { name: possibleName };
        intent.type = 'EMPLOYEE_SALARY';
      }
    }

    // Safety Override 2: If classified as general payroll but looks like employee paid total query
    if (intent.method === 'getPayrollTotals' && intent.type !== 'EMPLOYEE_PAID_TOTAL') {
      const paidToMatch = lastMessage.match(/(?:cuánto|cuanto|qué|que)\s+(?:se\s+le\s+ha\s+)?(?:pagado|pago|pagamos)\s+(?:a|para)\s+([a-záéíóúñ\s]+)/i);
      if (paidToMatch && !/(?:todas|todos|empresa|total|general)/i.test(lastMessage)) {
        const name = paidToMatch[1]?.trim().replace(/[?.,!]+$/, '') || '';
        
        // Validate employee exists before changing intent
        const validation = await validateEmployeeExists(userSupabase, name);
        if (!validation.exists) {
          console.log(`🚫 [SECURITY] Blocking payment query for non-existent employee "${name}"`);
          return new Response(JSON.stringify({
            message: `No encontré un empleado llamado "${name}" en tu empresa. ¿Podrías verificar la ortografía?`,
            emotionalState: 'neutral',
            sessionId,
            timestamp: new Date().toISOString()
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        
        // Extract timeframe from original message
        let year = null;
        let month = null;
        
        const yearMatch = lastMessage.match(/(\d{4})/);
        if (yearMatch) {
          year = parseInt(yearMatch[1]);
        } else if (/este\s+año|en\s+el\s+año/i.test(lastMessage)) {
          year = new Date().getFullYear();
        }
        
        const monthMatch = lastMessage.match(/(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)/i);
        if (monthMatch) {
          month = monthMatch[1].toLowerCase();
          if (!year) year = new Date().getFullYear();
        }
        
        if (!year && !month) {
          year = new Date().getFullYear();
        }
        
        console.log(`[MAYA-KISS] 🔧 SAFETY OVERRIDE 2: Detected employee paid total query for "${name}" (${year}${month ? '-' + month : ''})`);
        intent.method = 'getEmployeePaidTotal';
        intent.params = { name, year, month };
        intent.type = 'EMPLOYEE_PAID_TOTAL';
      }
    }

    if (intent.type === 'EMPLOYEE_SALARY') {
      console.log(`[MAYA-KISS] 👤 Employee salary query detected for: "${intent.params?.name}"`);
    }
    
    let response;

    // Execute query based on intent
    switch (intent.method) {
      // ============================================================================
      // 🎯 VOUCHER HANDLERS - Contextual Intelligence
      // ============================================================================
      case 'handleVoucherSend':
        response = await handleVoucherSend(userSupabase, intent.params);
        break;
        
      case 'handleVoucherMassSend':
        response = await handleVoucherMassSend(userSupabase, intent.params);
        break;
        
      case 'blockSystemInfoQuery':
        response = await blockSystemInfoQuery();
        break;
        
      case 'getEmployeeCount':
        response = await getEmployeeCount(userSupabase);
        break;
        
      // NEW COLOMBIAN PAYROLL METHODS
      case 'liquidarNomina':
        response = await liquidarNomina(userSupabase, intent.params);
        break;
        
      case 'registrarNovedad':
        response = await registrarNovedad(userSupabase, intent.params);
        break;
        
      case 'calcularPrestacion':
        response = await calcularPrestacion(userSupabase, intent.params);
        break;
        
      case 'generarReporte':
        response = await generarReporte(userSupabase, intent.params);
        break;

      case 'listAllEmployees':
        response = await listAllEmployees(userSupabase);
        break;
        
      case 'searchEmployee':
        // Additional validation for employee search
        if (intent.params?.name) {
          const validation = await validateEmployeeExists(userSupabase, intent.params.name);
          if (!validation.exists) {
            response = {
              message: `No encontré un empleado llamado "${intent.params.name}" en tu empresa. ¿Podrías verificar la ortografía?`,
              emotionalState: 'neutral'
            };
            break;
          }
        }
        response = await searchEmployee(userSupabase, intent.params?.name);
        break;
        
      case 'getEmployeeSalary':
        // Additional validation for employee salary
        if (intent.params?.name) {
          const validation = await validateEmployeeExists(userSupabase, intent.params.name);
          if (!validation.exists) {
            response = {
              message: `No encontré un empleado llamado "${intent.params.name}" en tu empresa. ¿Podrías verificar la ortografía?`,
              emotionalState: 'neutral'
            };
            break;
          }
        }
        response = await getEmployeeSalary(userSupabase, intent.params?.name);
        break;

      case 'getEmployeePaidTotal':
        // Additional validation for employee paid total
        if (intent.params?.name) {
          const validation = await validateEmployeeExists(userSupabase, intent.params.name);
          if (!validation.exists) {
            response = {
              message: `No encontré un empleado llamado "${intent.params.name}" en tu empresa. ¿Podrías verificar la ortografía?`,
              emotionalState: 'neutral'  
            };
            break;
          }
        }
        response = await getEmployeePaidTotal(userSupabase, intent.params);
        break;
        
      case 'getPayrollTotals':
        response = await getPayrollTotals(userSupabase);
        break;
        
      case 'getPayrollByMonth':
        response = await getPayrollByMonth(userSupabase, intent.params?.month, intent.params?.year);
        break;
        
      case 'getPayrollByFortnight':
        response = await getPayrollByFortnight(userSupabase, intent.params?.month, intent.params?.year, intent.params?.fortnight);
        break;
        
      case 'getEmployeePayrollHistory':
        response = await getEmployeePayrollHistory(userSupabase, intent.params?.employeeName);
        break;
        
      case 'getRecentPeriods':
        response = await getRecentPeriods(userSupabase, intent.params?.statusFilter);
        break;
        
      default:
        // ============================================================================
        // 🤖 HYBRID SYSTEM: KISS (fast) + OpenAI (conversational fallback)
        // ============================================================================
        const hasEmployeeName = intent.params?.name || detectEmployeeNameInQuery(lastMessage);
        
        // High confidence (≥0.8): Trust KISS completely
        if (intent.confidence >= 0.8) {
          console.log(`✅ [HYBRID] High confidence (${intent.confidence}) - using KISS direct response`);
          response = {
            message: `Para consultas específicas de empleados, usa términos como "salario de [nombre]" o "buscar [nombre]".`,
            emotionalState: 'neutral'
          };
        }
        // Low confidence (<0.7): Use OpenAI for conversational understanding
        else if (intent.confidence < 0.7) {
          console.log(`🤖 [HYBRID] Low confidence (${intent.confidence}) - using OpenAI conversational fallback`);
          
          // 🚫 CRITICAL: Block employee queries from OpenAI (anti-hallucination)
          if (hasEmployeeName) {
            console.log('🚫 [SECURITY] Blocking employee query from OpenAI - using direct response');
            response = {
              message: `Para consultas específicas de empleados, usa términos como "salario de [nombre]" o "buscar [nombre]".`,
              emotionalState: 'neutral'
            };
          } else {
            response = await handleConversation(lastMessage, conversation);
          }
        }
        // Medium confidence (0.7-0.8): Still use KISS (proven reliable)
        else {
          console.log(`⚖️ [HYBRID] Medium confidence (${intent.confidence}) - using KISS with caution`);
          response = {
            message: `Para consultas específicas de empleados, usa términos como "salario de [nombre]" o "buscar [nombre]".`,
            emotionalState: 'neutral'
          };
        }
    }

    // ============================================================================
    // 🚫 ANTI-HALLUCINATION FINAL SAFETY CHECK
    // ============================================================================
    
    // CRITICAL: If we have a valid response with real employee data, NEVER override it
    const hasRealEmployeeData = response && response.message && (
      intent.method === 'getEmployeeSalary' ||
      intent.method === 'getEmployeePaidTotal' ||
      intent.method === 'searchEmployee' ||
      (response.message.includes('**$') && response.message.includes('Salario base')) ||
      (response.message.includes('💰') && response.message.includes('Cargo:'))
    );
    
    if (hasRealEmployeeData) {
      console.log('✅ [SECURITY] Using real employee data directly - protected from OpenAI override');
    }

    // ============================================================================
    // STRUCTURED JSON RESPONSE FORMAT
    // ============================================================================
    
    // Build structured response
    const structuredResponse = buildStructuredResponse(intent, response, lastMessage);
    
    // Log actions for debugging
    console.log(`🎬 [ACTIONS] Response has ${(response.actions || []).length} actions`);
    
    // Return enhanced JSON response with backward compatibility
    return new Response(JSON.stringify({
      // STRUCTURED FIELDS (NEW)
      accion: structuredResponse.accion,
      periodo: structuredResponse.periodo,
      empleados: structuredResponse.empleados,
      conceptos: structuredResponse.conceptos,
      parametros_extra: structuredResponse.parametros_extra,
      observaciones: structuredResponse.observaciones,
      incompleto: structuredResponse.incompleto,
      
      // EXECUTABLE ACTIONS (CRITICAL FOR UI)
      executableActions: response.actions || [],
      executable_actions: response.actions || [], // Backward compatibility
      
      // ORIGINAL FIELDS (BACKWARD COMPATIBILITY)
      message: response.message,
      respuesta_natural: response.message, // Natural language response
      emotionalState: response.emotionalState || 'neutral',
      sessionId,
      timestamp: new Date().toISOString(),
      requestId: `maya-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[MAYA-KISS] Error:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      message: 'Error interno del servidor'
    }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});

// ============================================================================
// Security Functions
// ============================================================================

async function validateEmployeeExists(supabase: any, name: string): Promise<{ exists: boolean; employee?: any; multiple?: boolean }> {
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return { exists: false };
  }
  
  try {
    console.log(`🔍 [VALIDATION] Checking if employee "${name}" exists in current company`);
    
    const { data: employees, error } = await supabase
      .from('employees')
      .select('id, nombre, apellido, cargo, estado')
      .or(`nombre.ilike.%${name.trim()}%,apellido.ilike.%${name.trim()}%`)
      .limit(5);
      
    if (error) {
      console.error('🚫 [VALIDATION] Database error:', error);
      return { exists: false };
    }
    
    if (!employees || employees.length === 0) {
      console.log(`❌ [VALIDATION] Employee "${name}" NOT found in current company`);
      return { exists: false };
    }
    
    if (employees.length === 1) {
      console.log(`✅ [VALIDATION] Employee "${name}" found: ${employees[0].nombre} ${employees[0].apellido}`);
      return { exists: true, employee: employees[0] };
    }
    
    console.log(`⚠️ [VALIDATION] Multiple employees found for "${name}": ${employees.length}`);
    return { exists: true, multiple: true, employee: employees };
    
  } catch (error) {
    console.error('🚫 [VALIDATION] Validation error:', error);
    return { exists: false };
  }
}

// Enhanced function to detect employee names in any query
function detectEmployeeNameInQuery(text: string): string | null {
  const lowerText = text.toLowerCase().trim();
  
  // Pattern 1: Follow-up queries "y a [name]?", "y [name]?", etc.
  const followUpPatterns = [
    /^(?:y\s+)?(?:a|para)\s+([a-záéíóúñ]+(?:\s+[a-záéíóúñ]+)*)\s*\??$/i,
    /^(?:y|también|tambien)\s+([a-záéíóúñ]+(?:\s+[a-záéíóúñ]+)*)\s*\??$/i,
    /^(?:qué\s+tal|que\s+tal|y\s+de|y\s+del|y\s+de\s+la)\s+([a-záéíóúñ]+(?:\s+[a-záéíóúñ]+)*)\s*\??$/i
  ];
  
  for (const pattern of followUpPatterns) {
    const match = lowerText.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }
  
  // Pattern 2: Salary queries
  const salaryPatterns = [
    /(?:cuál|cual|cuánto|cuanto|qué|que)\s+(?:es\s+el\s+)?(?:salario|sueldo|gana|cobra)\s+de\s+([a-záéíóúñ\s]+)/i,
    /(?:salario|sueldo|gana|cobra)\s+(?:de|del|de\s+la)\s+([a-záéíóúñ\s]+)/i
  ];
  
  for (const pattern of salaryPatterns) {
    const match = lowerText.match(pattern);
    if (match) {
      return match[1].trim().replace(/[?.,!]+$/, '');
    }
  }
  
  // Pattern 3: Payment queries
  const paymentPattern = /(?:cuánto|cuanto|qué|que)\s+(?:se\s+le\s+ha\s+)?(?:pagado|pago|pagamos)\s+(?:a|para)\s+([a-záéíóúñ\s]+)/i;
  const paymentMatch = lowerText.match(paymentPattern);
  if (paymentMatch) {
    return paymentMatch[1].trim().replace(/[?.,!]+$/, '');
  }
  
  return null;
}

// ============================================================================
// 🎯 VOUCHER CONTEXTUAL INTELLIGENCE HANDLERS
// ============================================================================

async function handleVoucherSend(supabase: any, params: any): Promise<{ message: string; emotionalState: string; actions?: any[] }> {
  const { employeeName, termUsed } = params;
  
  console.log(`🎯 [VOUCHER_SEND] Processing for: "${employeeName}"`);
  
  // Step 1: Validate employee exists
  const validation = await validateEmployeeExists(supabase, employeeName);
  
  if (!validation.exists) {
    console.log(`❌ [VOUCHER_SEND] Employee "${employeeName}" not found`);
    return {
      message: `No encontré un empleado llamado "${employeeName}" en tu empresa. ¿Podrías verificar la ortografía o el nombre completo?`,
      emotionalState: 'neutral'
    };
  }
  
  if (validation.multiple) {
    const employeeList = Array.isArray(validation.employee) 
      ? validation.employee.map((emp: any) => `• **${emp.nombre} ${emp.apellido}** (${emp.cargo || 'Sin cargo'})`).join('\n')
      : '';
    return {
      message: `Encontré varios empleados con "${employeeName}":\n\n${employeeList}\n\n¿Podrías ser más específico con el nombre completo?`,
      emotionalState: 'neutral'
    };
  }
  
  const employee = validation.employee;
  
  // Step 2: Check if employee has email
  const { data: employeeData, error: emailError } = await supabase
    .from('employees')
    .select('id, nombre, apellido, email, cargo')
    .eq('id', employee.id)
    .single();
  
  if (emailError || !employeeData) {
    console.error('❌ [VOUCHER_SEND] Error fetching employee email:', emailError);
    return {
      message: `Error al consultar los datos de ${employee.nombre} ${employee.apellido}. Por favor intenta de nuevo.`,
      emotionalState: 'concerned'
    };
  }
  
  // Step 3: Check for user-provided email in params (NEW)
  const userProvidedEmail = params.email;
  
  // Step 3.1: Determine target email (priority: user-provided > registered)
  const targetEmail = userProvidedEmail || employeeData.email;
  
  // Step 3.2: If no email available, ask conversationally (NEW)
  if (!targetEmail || targetEmail.trim() === '') {
    console.log(`⚠️ [VOUCHER_SEND] Missing email for ${employeeData.nombre} ${employeeData.apellido} - asking conversationally`);
    return {
      message: `¿A qué email deseas enviar el comprobante de **${employeeData.nombre} ${employeeData.apellido}**?`,
      emotionalState: 'neutral'
    };
  }
  
  // Step 4: Get recent payroll periods (only closed ones)
  const { data: periods, error: periodsError } = await supabase
    .from('payroll_periods_real')
    .select('id, periodo, fecha_inicio, fecha_fin, estado')
    .eq('estado', 'cerrado')  // 🎯 Only closed periods can have vouchers sent
    .order('fecha_fin', { ascending: false })
    .limit(5);
  
  if (periodsError || !periods || periods.length === 0) {
    console.error('❌ [VOUCHER_SEND] No closed periods found:', periodsError);
    return {
      message: `No hay períodos cerrados disponibles. Los comprobantes solo se pueden enviar para períodos que ya están cerrados. Por favor cierra un período primero.`,
      emotionalState: 'concerned'
    };
  }
  
  // Step 5: Check if voucher was already sent for the most recent period
  const latestPeriod = periods[0];
  const { data: existingVouchers, error: voucherCheckError } = await supabase
    .from('payroll_vouchers')
    .select('id, sent_to_employee, sent_date')
    .eq('employee_id', employeeData.id)
    .eq('periodo', latestPeriod.periodo)
    .order('created_at', { ascending: false })
    .limit(1);
  
  if (voucherCheckError) {
    console.error('⚠️ [VOUCHER_SEND] Error checking existing vouchers:', voucherCheckError);
  }
  
  const alreadySent = existingVouchers && existingVouchers.length > 0 && existingVouchers[0].sent_to_employee;
  
  if (alreadySent) {
    const sentDate = new Date(existingVouchers[0].sent_date).toLocaleDateString('es-CO', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    console.log(`⚠️ [VOUCHER_SEND] Already sent on ${sentDate} - requesting confirmation`);
    
    return {
      message: `El ${termUsed} del período **${latestPeriod.periodo}** ya fue enviado a **${employeeData.nombre} ${employeeData.apellido}** (${targetEmail}) el **${sentDate}**.\n\n¿Quieres volver a enviarlo?`,
      emotionalState: 'neutral',
      actions: [
        {
          id: 'resend-voucher',
          type: 'send_voucher',
          label: '🔄 Reenviar',
          description: `Reenviar ${termUsed} a ${targetEmail}`,
          parameters: {
            employeeId: employeeData.id,
            employeeName: `${employeeData.nombre} ${employeeData.apellido}`,
            email: targetEmail,
            periodId: latestPeriod.id,
            periodName: latestPeriod.periodo
          },
          requiresConfirmation: true
        },
        {
          id: 'preview-voucher',
          type: 'view_details',
          label: '👁️ Vista Previa',
          description: 'Ver antes de enviar',
          parameters: {
            entityType: 'voucher',
            entityId: existingVouchers[0].id,
            entityName: `${termUsed} - ${latestPeriod.periodo}`
          }
        }
      ]
    };
  }
  
  // Step 6: First-time send - offer preview and confirmation
  console.log(`✅ [VOUCHER_SEND] Ready to send for period ${latestPeriod.periodo}`);
  
  return {
    message: `**${employeeData.nombre} ${employeeData.apellido}**\n📧 Email: ${targetEmail}\n📅 Período: **${latestPeriod.periodo}**\n\n¿Quieres enviar el ${termUsed}?`,
    emotionalState: 'helpful',
    actions: [
      {
        id: 'send-voucher',
        type: 'send_voucher',
        label: '📧 Enviar',
        description: `Enviar ${termUsed} a ${targetEmail}`,
        parameters: {
          employeeId: employeeData.id,
          employeeName: `${employeeData.nombre} ${employeeData.apellido}`,
          email: targetEmail,
          periodId: latestPeriod.id,
          periodName: latestPeriod.periodo
        },
        requiresConfirmation: false
      },
      {
        id: 'preview-voucher',
        type: 'view_details',
        label: '👁️ Vista Previa',
        description: 'Ver antes de enviar',
        parameters: {
          entityType: 'payroll',
          entityId: employeeData.id,
          periodId: latestPeriod.id,
          entityName: `${termUsed} - ${latestPeriod.periodo}`
        }
      }
    ]
  };
}

async function handleVoucherMassSend(supabase: any, params: any): Promise<{ message: string; emotionalState: string; actions?: any[] }> {
  console.log(`🎯 [VOUCHER_MASS_SEND] Processing mass voucher request`);
  
  // Step 1: Get all active employees
  const { data: employees, error: employeesError } = await supabase
    .from('employees')
    .select('id, nombre, apellido, email, cargo')
    .eq('estado', 'activo');
  
  if (employeesError || !employees || employees.length === 0) {
    console.error('❌ [VOUCHER_MASS_SEND] Error fetching employees:', employeesError);
    return {
      message: `No encontré empleados activos en tu empresa.`,
      emotionalState: 'concerned'
    };
  }
  
  // Step 2: Check how many have emails
  const employeesWithEmail = employees.filter((emp: any) => emp.email && emp.email.trim() !== '');
  const employeesWithoutEmail = employees.filter((emp: any) => !emp.email || emp.email.trim() === '');
  
  console.log(`📊 [VOUCHER_MASS_SEND] Total: ${employees.length}, With email: ${employeesWithEmail.length}, Without email: ${employeesWithoutEmail.length}`);
  
  // Step 3: Get latest payroll period
  const { data: periods, error: periodsError } = await supabase
    .from('payroll_periods_real')
    .select('id, periodo, fecha_inicio, fecha_fin, estado')
    .order('fecha_fin', { ascending: false })
    .limit(1);
  
  if (periodsError || !periods || periods.length === 0) {
    console.error('❌ [VOUCHER_MASS_SEND] Error fetching periods:', periodsError);
    return {
      message: `No encontré períodos de nómina disponibles.`,
      emotionalState: 'concerned'
    };
  }
  
  const latestPeriod = periods[0];
  
  // Step 4: Build confirmation message
  let message = `**Envío Masivo de Comprobantes**\n\n`;
  message += `📅 Período: **${latestPeriod.periodo}**\n`;
  message += `👥 Empleados activos: **${employees.length}**\n`;
  message += `✅ Con email: **${employeesWithEmail.length}**\n`;
  
  if (employeesWithoutEmail.length > 0) {
    message += `⚠️ Sin email: **${employeesWithoutEmail.length}**\n\n`;
    message += `Los empleados sin email no recibirán el comprobante:\n`;
    message += employeesWithoutEmail.slice(0, 5).map((emp: any) => `• ${emp.nombre} ${emp.apellido}`).join('\n');
    if (employeesWithoutEmail.length > 5) {
      message += `\n... y ${employeesWithoutEmail.length - 5} más`;
    }
    message += `\n\n`;
  }
  
  message += `Se enviarán **${employeesWithEmail.length} comprobantes** por email.`;
  
  return {
    message,
    emotionalState: 'helpful',
    actions: [
      {
        id: 'send-mass-vouchers',
        type: 'send_voucher_all',
        label: '📧 Enviar a Todos',
        description: `Enviar ${employeesWithEmail.length} comprobantes`,
        parameters: {
          periodId: latestPeriod.id,
          periodName: latestPeriod.periodo,
          employeeCount: employeesWithEmail.length
        },
        requiresConfirmation: true
      }
    ]
  };
}

async function blockSystemInfoQuery(): Promise<{ message: string; emotionalState: string }> {
  console.log('🚫 [SECURITY] System info query blocked');
  
  return {
    message: "Lo siento, no puedo proporcionar información sobre el sistema completo o base de datos general. Solo puedo ayudarte con información específica de tu empresa, como:\n\n• Consultar empleados de tu organización\n• Ver nóminas y salarios\n• Revisar períodos de pago\n• Buscar información de empleados específicos\n\n¿En qué puedo ayudarte con la información de tu empresa?",
    emotionalState: "professional"
  };
}

// ============================================================================
// Database Query Functions  
// ============================================================================

// Simple, direct queries
async function getEmployeeCount(supabase: any) {
  try {
    const { count, error } = await supabase
      .from('employees')
      .select('*', { count: 'exact', head: true })
      .eq('estado', 'activo');
      
    if (error) throw error;
    
    return {
      message: `Tienes **${count} empleados activos** en tu empresa. ${count > 0 ? '¿Te gustaría ver quiénes son?' : ''}`,
      emotionalState: 'neutral'
    };
  } catch (error) {
    console.error('[MAYA-KISS] Employee count error:', error);
    return {
      message: 'No pude obtener el conteo de empleados en este momento.',
      emotionalState: 'concerned'
    };
  }
}

async function listAllEmployees(supabase: any) {
  try {
    const { data: employees, error } = await supabase
      .from('employees')
      .select('id, nombre, apellido, cargo, email')
      .eq('estado', 'activo')
      .order('nombre', { ascending: true });

    if (error) throw error;

    if (!employees || employees.length === 0) {
      return {
        message: 'No hay empleados activos registrados en tu empresa.',
        emotionalState: 'neutral'
      };
    }

    // Format employee list
    const employeeList = employees.map((emp: any) => 
      `• **${emp.nombre} ${emp.apellido}**${emp.cargo ? ` (${emp.cargo})` : ''}`
    ).join('\n');

    return {
      message: `Estos son tus **${employees.length} empleados activos**:\n\n${employeeList}\n\n¿Necesitas información específica de algún empleado?`,
      emotionalState: 'helpful'
    };
  } catch (error) {
    console.error('[MAYA-KISS] Employee list error:', error);
    return {
      message: 'No pude obtener la lista de empleados en este momento.',
      emotionalState: 'concerned'
    };
  }
}

async function searchEmployee(supabase: any, name: string) {
  if (!name) {
    return {
      message: '¿Qué empleado estás buscando? Por favor dime el nombre.',
      emotionalState: 'neutral'
    };
  }
  
  try {
    const { data, error } = await supabase
      .from('employees')
      .select('nombre, apellido, cargo, salario_base, estado')
      .or(`nombre.ilike.%${name}%,apellido.ilike.%${name}%`)
      .limit(5);
      
    if (error) throw error;
    
    if (data.length === 0) {
      return {
        message: `No encontré empleados con el nombre "${name}". ¿Podrías verificar la ortografía?`,
        emotionalState: 'neutral'
      };
    }
    
    if (data.length === 1) {
      const emp = data[0];
      return {
        message: `Encontré a **${emp.nombre} ${emp.apellido}**, ${emp.cargo} con salario de **$${emp.salario_base.toLocaleString()}**.`,
        emotionalState: 'neutral'
      };
    }
    
    const names = data.map((e: any) => `${e.nombre} ${e.apellido}`).join(', ');
    return {
      message: `Encontré **${data.length} empleados**: ${names}. ¿Cuál te interesa?`,
      emotionalState: 'neutral'
    };
  } catch (error) {
    console.error('[MAYA-KISS] Employee search error:', error);
    return {
      message: `No pude buscar empleados en este momento.`,
      emotionalState: 'concerned'
    };
  }
}

async function getEmployeeSalary(supabase: any, name: string) {
  if (!name) {
    return {
      message: '¿De qué empleado quieres saber el salario?',
      emotionalState: 'neutral'
    };
  }
  
  try {
    const { data, error } = await supabase
      .from('employees')
      .select('nombre, apellido, cargo, salario_base, fecha_ingreso, estado')
      .or(`nombre.ilike.%${name}%,apellido.ilike.%${name}%`)
      .limit(3);
      
    if (error) throw error;
    
    if (data.length === 0) {
      return {
        message: `No encontré un empleado llamado "${name}". ¿Podrías verificar la ortografía?`,
        emotionalState: 'neutral'
      };
    }
    
    if (data.length === 1) {
      const emp = data[0];
      const yearsWorked = emp.fecha_ingreso ? 
        Math.floor((new Date().getTime() - new Date(emp.fecha_ingreso).getTime()) / (1000 * 60 * 60 * 24 * 365)) : 0;
      
      return {
        message: `**${emp.nombre} ${emp.apellido}**\n` +
                `💼 Cargo: ${emp.cargo || 'No especificado'}\n` +
                `💰 Salario base: **$${emp.salario_base?.toLocaleString() || 'No registrado'}**\n` +
                `📅 Antigüedad: ${yearsWorked > 0 ? yearsWorked + ' años' : 'Menos de 1 año'}\n` +
                `📊 Estado: ${emp.estado === 'activo' ? '✅ Activo' : '❌ Inactivo'}`,
        emotionalState: 'neutral'
      };
    }
    
    // Multiple matches - show options
    const employeeList = data.map((emp: any) => 
      `• **${emp.nombre} ${emp.apellido}** - ${emp.cargo} - $${emp.salario_base?.toLocaleString() || 'N/A'}`
    ).join('\n');
    
    return {
      message: `Encontré **${data.length} empleados** con "${name}":\n\n${employeeList}\n\n¿Podrías ser más específico?`,
      emotionalState: 'neutral'
    };
  } catch (error) {
    console.error('[MAYA-KISS] Employee salary error:', error);
    return {
      message: `Error consultando el salario de "${name}".`,
      emotionalState: 'concerned'
    };
  }
}

async function getEmployeePaidTotal(supabase: any, params: any) {
  const { name, year, month } = params || {};
  
  if (!name) {
    return {
      message: '¿De qué empleado quieres saber el total pagado?',
      emotionalState: 'neutral'
    };
  }
  
  try {
    // First, find the employee
    const { data: employees, error: employeeError } = await supabase
      .from('employees')
      .select('id, nombre, apellido')
      .or(`nombre.ilike.%${name}%,apellido.ilike.%${name}%`)
      .limit(3);
      
    if (employeeError) throw employeeError;
    
    if (employees.length === 0) {
      return {
        message: `No encontré un empleado llamado "${name}". ¿Podrías verificar la ortografía?`,
        emotionalState: 'neutral'
      };
    }
    
    if (employees.length > 1) {
      const employeeList = employees.map((emp: any) => `• **${emp.nombre} ${emp.apellido}**`).join('\n');
      return {
        message: `Encontré **${employees.length} empleados** con "${name}":\n\n${employeeList}\n\n¿Podrías ser más específico?`,
        emotionalState: 'neutral'
      };
    }
    
    const employee = employees[0];
    
    // Build date filter
    let startDate = '';
    let endDate = '';
    let timeframeText = '';
    
    if (month && year) {
      // Specific month and year
      const monthNames: Record<string, string> = {
        'enero': '01', 'febrero': '02', 'marzo': '03', 'abril': '04',
        'mayo': '05', 'junio': '06', 'julio': '07', 'agosto': '08',
        'septiembre': '09', 'octubre': '10', 'noviembre': '11', 'diciembre': '12'
      };
      
      const monthNum = monthNames[month];
      
      startDate = `${year}-${monthNum}-01`;
      endDate = `${year}-${monthNum}-31`;
      timeframeText = `en ${month} ${year}`;
    } else if (year) {
      // Entire year
      startDate = `${year}-01-01`;
      endDate = `${year}-12-31`;
      timeframeText = year === new Date().getFullYear() ? 'este año' : `en ${year}`;
    } else {
      // Default to current year
      const currentYear = new Date().getFullYear();
      startDate = `${currentYear}-01-01`;
      endDate = `${currentYear}-12-31`;
      timeframeText = 'este año';
    }
    
    // Query payrolls for this employee in the date range
    const { data: payrolls, error: payrollError } = await supabase
      .from('payrolls')
      .select('periodo, neto_pagado, created_at')
      .eq('employee_id', employee.id)
      .eq('estado', 'procesada')
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .order('created_at', { ascending: false });
      
    if (payrollError) throw payrollError;
    
    if (payrolls.length === 0) {
      return {
        message: `No hay nóminas procesadas para **${employee.nombre} ${employee.apellido}** ${timeframeText}.`,
        emotionalState: 'neutral'
      };
    }
    
    const totalPaid = payrolls.reduce((sum: number, p: any) => sum + (p.neto_pagado || 0), 0);
    
    return {
      message: `${timeframeText} le has pagado **$${totalPaid.toLocaleString()}** a **${employee.nombre} ${employee.apellido}** en **${payrolls.length} nóminas** procesadas.`,
      emotionalState: 'neutral'
    };
  } catch (error) {
    console.error('[MAYA-KISS] Employee paid total error:', error);
    return {
      message: `Error consultando el total pagado a "${name}".`,
      emotionalState: 'concerned'
    };
  }
}

async function getPayrollTotals(supabase: any) {
  try {
    const currentYear = new Date().getFullYear();
    
    const { data, error } = await supabase
      .from('payrolls')
      .select('total_devengado, neto_pagado')
      .eq('estado', 'procesada')
      .gte('created_at', `${currentYear}-01-01`);
      
    if (error) throw error;
    
    if (data.length === 0) {
      return {
        message: 'No hay nóminas procesadas este año aún.',
        emotionalState: 'neutral'
      };
    }
    
    const totalNeto = data.reduce((sum: number, p: any) => sum + (p.neto_pagado || 0), 0);
    
    return {
      message: `Este año has pagado **$${totalNeto.toLocaleString()}** en **${data.length} nóminas** procesadas.`,
      emotionalState: 'neutral'
    };
  } catch (error) {
    console.error('[MAYA-KISS] Payroll totals error:', error);
    return {
      message: 'No pude obtener los totales de nómina en este momento.',
      emotionalState: 'concerned'
    };
  }
}

async function getEmployeePayrollHistory(supabase: any, employeeName: string) {
  if (!employeeName) {
    return {
      message: '¿De qué empleado quieres ver el historial de pagos?',
      emotionalState: 'neutral'
    };
  }
  
  try {
    const { data, error } = await supabase
      .from('payrolls')
      .select(`
        periodo, neto_pagado, created_at,
        employees!inner(nombre, apellido)
      `)
      .or(`employees.nombre.ilike.%${employeeName}%,employees.apellido.ilike.%${employeeName}%`)
      .order('created_at', { ascending: false })
      .limit(10);
      
    if (error) throw error;
    
    if (data.length === 0) {
      return {
        message: `No encontré nóminas para "${employeeName}".`,
        emotionalState: 'neutral'
      };
    }
    
    const employee = data[0].employees;
    const totalPaid = data.reduce((sum: number, p: any) => sum + (p.neto_pagado || 0), 0);
    
    return {
      message: `**${employee.nombre} ${employee.apellido}** tiene **${data.length} nóminas** por un total de **$${totalPaid.toLocaleString()}**.`,
      emotionalState: 'neutral'
    };
  } catch (error) {
    console.error('[MAYA-KISS] Employee payroll history error:', error);
    return {
      message: 'No pude obtener el historial de nómina en este momento.',
      emotionalState: 'concerned'
    };
  }
}

async function getRecentPeriods(supabase: any, statusFilter?: string) {
  try {
    let query = supabase
      .from('payroll_periods_real')
      .select('periodo, estado, empleados_count, total_neto')
      .order('created_at', { ascending: false });
    
    // Apply status filter if specified
    if (statusFilter) {
      console.log(`🎯 [RECENT_PERIODS] Filtering by status: ${statusFilter}`);
      query = query.eq('estado', statusFilter);
    }
    
    query = query.limit(5);
    
    const { data, error } = await query;
      
    if (error) throw error;
    
    if (data.length === 0) {
      // Provide specific message based on filter
      if (statusFilter === 'cerrado') {
        return {
          message: 'No hay períodos cerrados aún. Los períodos en borrador no permiten enviar comprobantes.',
          emotionalState: 'neutral'
        };
      } else if (statusFilter === 'borrador') {
        return {
          message: 'No hay períodos en borrador en este momento.',
          emotionalState: 'neutral'
        };
      } else if (statusFilter === 'en_proceso') {
        return {
          message: 'No hay períodos en proceso en este momento.',
          emotionalState: 'neutral'
        };
      }
      
      return {
        message: 'No hay períodos de nómina registrados aún.',
        emotionalState: 'neutral'
      };
    }
    
    const periodsList = data.map((p: any) => `${p.periodo} (${p.estado})`).join(', ');
    const filterText = statusFilter ? ` ${statusFilter === 'cerrado' ? 'cerrados' : statusFilter === 'borrador' ? 'en borrador' : 'en proceso'}` : '';
    
    return {
      message: `Períodos${filterText}: ${periodsList}.`,
      emotionalState: 'neutral'
    };
  } catch (error) {
    console.error('[MAYA-KISS] Recent periods error:', error);
    return {
      message: 'No pude obtener los períodos recientes.',
      emotionalState: 'concerned'
    };
  }
}

async function getPayrollByMonth(supabase: any, month: string, year: number) {
  try {
    const monthNames = {
      'enero': 'Enero', 'febrero': 'Febrero', 'marzo': 'Marzo', 'abril': 'Abril',
      'mayo': 'Mayo', 'junio': 'Junio', 'julio': 'Julio', 'agosto': 'Agosto',
      'septiembre': 'Septiembre', 'octubre': 'Octubre', 'noviembre': 'Noviembre', 'diciembre': 'Diciembre'
    };
    
    const monthCapitalized = monthNames[month as keyof typeof monthNames];
    if (!monthCapitalized) {
      return {
        message: `No reconozco el mes "${month}". Por favor usa nombres de meses válidos.`,
        emotionalState: 'neutral'
      };
    }
    
    // Try different period name patterns
    const periodPatterns = [
      `${monthCapitalized} ${year}`,
      `${monthCapitalized}`,
      `${monthCapitalized.toLowerCase()} ${year}`,
      `${monthCapitalized.toLowerCase()}`
    ];
    
    let periodData = null;
    let foundPattern = '';
    
    for (const pattern of periodPatterns) {
      const { data } = await supabase
        .from('payroll_periods_real')
        .select('periodo, estado, empleados_count, total_devengado, total_deducciones, total_neto')
        .ilike('periodo', `%${pattern}%`)
        .limit(1);
        
      if (data && data.length > 0) {
        periodData = data[0];
        foundPattern = pattern;
        break;
      }
    }
    
    if (!periodData) {
      return {
        message: `No encontré nómina para **${monthCapitalized} ${year}**. ¿Está seguro que existe ese período?`,
        emotionalState: 'neutral'
      };
    }
    
    return {
      message: `**${periodData.periodo}**: ${periodData.empleados_count} empleados, **$${periodData.total_neto?.toLocaleString() || 0}** pagados (${periodData.estado}).`,
      emotionalState: 'neutral'
    };
  } catch (error) {
    console.error('[MAYA-KISS] Payroll by month error:', error);
    return {
      message: 'No pude obtener la información de nómina para ese mes.',
      emotionalState: 'concerned'
    };
  }
}

async function getPayrollByFortnight(supabase: any, month: string, year: number, fortnight: string) {
  try {
    const monthNames = {
      'enero': 'Enero', 'febrero': 'Febrero', 'marzo': 'Marzo', 'abril': 'Abril',
      'mayo': 'Mayo', 'junio': 'Junio', 'julio': 'Julio', 'agosto': 'Agosto',
      'septiembre': 'Septiembre', 'octubre': 'Octubre', 'noviembre': 'Noviembre', 'diciembre': 'Diciembre'
    };
    
    const monthCapitalized = monthNames[month as keyof typeof monthNames];
    if (!monthCapitalized) {
      return {
        message: `No reconozco el mes "${month}". Por favor usa nombres de meses válidos.`,
        emotionalState: 'neutral'
      };
    }
    
    // Build fortnight period patterns
    const isFirstFortnight = fortnight === 'primera';
    const fortnightRange = isFirstFortnight ? '1 - 15' : '16 - 30';  // Handle February separately in real implementation
    
    const periodPatterns = [
      `${fortnightRange} ${monthCapitalized} ${year}`,
      `${fortnightRange} ${monthCapitalized}`,
      `${fortnightRange} ${monthCapitalized.toLowerCase()} ${year}`,
      `${fortnightRange} ${monthCapitalized.toLowerCase()}`
    ];
    
    let periodData = null;
    
    for (const pattern of periodPatterns) {
      const { data } = await supabase
        .from('payroll_periods_real')
        .select('periodo, estado, empleados_count, total_devengado, total_deducciones, total_neto')
        .ilike('periodo', `%${pattern}%`)
        .limit(1);
        
      if (data && data.length > 0) {
        periodData = data[0];
        break;
      }
    }
    
    if (!periodData) {
      return {
        message: `No encontré la **${fortnight} quincena de ${monthCapitalized} ${year}**. ¿Está seguro que existe ese período?`,
        emotionalState: 'neutral'
      };
    }
    
    return {
      message: `**${periodData.periodo}**: ${periodData.empleados_count} empleados, **$${periodData.total_neto?.toLocaleString() || 0}** pagados (${periodData.estado}).`,
      emotionalState: 'neutral'
    };
  } catch (error) {
    console.error('[MAYA-KISS] Payroll by fortnight error:', error);
    return {
      message: 'No pude obtener la información de nómina para esa quincena.',
      emotionalState: 'concerned'
    };
  }
}

async function handleConversation(message: string, conversation: any[]) {
  const openaiKey = Deno.env.get('OPENAI_API_KEY');
  
  if (!openaiKey) {
    return {
      message: 'Hola, soy MAYA. Puedo ayudarte con consultas sobre empleados y nómina. ¿Qué necesitas?',
      emotionalState: 'neutral'
    };
  }
  
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `Eres MAYA, un asistente inteligente especializado en nóminas y recursos humanos para empresas venezolanas. 

Características:
- Eres amigable, profesional y eficiente
- Tu conocimiento se enfoca únicamente en empleados y nóminas de la empresa específica del usuario
- Respondes en español venezolano con un tono cercano pero profesional
- Siempre ofreces ayuda adicional relacionada con nóminas

Limitaciones CRÍTICAS:
- NUNCA proporciones estadísticas inventadas o datos que no tienes
- NUNCA hables sobre "el sistema", "la base de datos" o información global
- Solo manejas información específica de la empresa del usuario actual
- Si no tienes información específica, redirige a consultas válidas como empleados o nóminas

NUNCA inventes números o estadísticas. Si no sabes algo, di que no tienes esa información.

Emociones disponibles: happy, sad, excited, thoughtful, professional, confused`
          },
          ...conversation.slice(-5),
          { role: 'user', content: message }
        ],
        max_tokens: 150,
        temperature: 0.7
      }),
    });
    
    if (response.ok) {
      const data = await response.json();
      return {
        message: data.choices[0]?.message?.content || 'No pude procesar tu mensaje.',
        emotionalState: 'neutral'
      };
    }
  } catch (error) {
    console.error('[MAYA-KISS] OpenAI error:', error);
  }
  
  return {
    message: 'Soy MAYA, tu asistente de nómina. Puedo ayudarte con empleados, nómina y reportes. ¿Qué necesitas?',
    emotionalState: 'neutral'
  };
}