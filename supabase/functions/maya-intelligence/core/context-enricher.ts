/**
 * Context Enricher Module
 * Handles conversation context analysis and enrichment
 */

import { QueryClassifier, QueryType } from './query-classifier.ts';
import { ConversationContextAnalyzer } from './conversation-context-analyzer.ts';
import { SmartContextInferencer } from './smart-context-inferencer.ts';

export interface ConversationContext {
  intentType: string | null;
  params: any;
}

export interface InferredIntent {
  type: string;
  method: string;
  params: any;
  confidence: number;
}

/**
 * Detect follow-up queries like "y a [name]?", "y [name]?", etc.
 */
export function detectFollowUpQuery(text: string): string | null {
  const lowerText = text.toLowerCase().trim();
  
  // Use QueryClassifier to determine if this is an employee follow-up
  const classification = QueryClassifier.classify(text);
  
  console.log(`🤖 [CLASSIFIER] Query: "${text}" -> Type: ${QueryType[classification.type]} (${classification.confidence.toFixed(2)})`);
  console.log(`   Indicators: ${classification.indicators.join(', ')}`);
  
  // Only proceed if classified as EMPLOYEE_FOLLOW_UP
  if (classification.type !== QueryType.EMPLOYEE_FOLLOW_UP) {
    console.log(`🚫 [FOLLOW_UP] Not an employee follow-up (classified as ${QueryType[classification.type]})`);
    return null;
  }
  
  // Extract name patterns
  // Pattern 1: "y a [name]?" / "y para [name]?"
  const pattern1 = lowerText.match(/^(?:y\s+)?(?:a|para)\s+([a-záéíóúñ]+(?:\s+[a-záéíóúñ]+)*)\s*\??$/i);
  if (pattern1) return pattern1[1].trim();
  
  // Pattern 2: "y [name]?" / "también [name]?"
  const pattern2 = lowerText.match(/^(?:y|también|tambien)\s+([a-záéíóúñ]+(?:\s+[a-záéíóúñ]+)*)\s*\??$/i);
  if (pattern2) return pattern2[1].trim();
  
  // Pattern 3: "qué tal [name]?" / "y de [name]?"
  const pattern3 = lowerText.match(/^(?:qué\s+tal|que\s+tal|y\s+de|y\s+del|y\s+de\s+la)\s+([a-záéíóúñ]+(?:\s+[a-záéíóúñ]+)*)\s*\??$/i);
  if (pattern3) return pattern3[1].trim();
  
  return null;
}

/**
 * Analyze conversation context to extract intent and parameters
 */
export function analyzeConversationContext(conversation: any[]): ConversationContext {
  // Use the intelligent analyzer
  const context = ConversationContextAnalyzer.analyze(conversation);
  
  // Check if we have valid context
  if (!ConversationContextAnalyzer.hasValidContext(context)) {
    return legacyContextDetection(conversation);
  }
  
  console.log(`🔍 [CONTEXT] Detected ${context.contextType} (confidence: ${context.confidence})`);
  
  // Extract params based on context type
  let params: any = {};
  
  if (context.contextType === 'PAYROLL_INFO' && context.entities) {
    const responseText = context.lastResponseText;
    if (/este\s+año/i.test(responseText)) {
      params.year = new Date().getFullYear();
    }
    const monthRegex = /en\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)/gi;
    const allMonthMatches = [...responseText.matchAll(monthRegex)];
    const allMonths = allMonthMatches.map(m => m[1].toLowerCase());
    if (allMonths.length === 1) {
      params.month = allMonths[0];
    } else if (allMonths.length >= 2) {
      params.monthStart = allMonths[0];
      params.monthEnd = allMonths[allMonths.length - 1];
    }
  }
  
  if (context.contextType === 'CONFIRMATION' && context.entities.employeeName) {
    params.employeeName = context.entities.employeeName;
  }
  
  if (context.contextType === 'VOUCHER_CONFIRMATION_PENDING' && context.entities) {
    if (context.entities.employeeName) params.employeeName = context.entities.employeeName;
    if (context.entities.employeeId) params.employeeId = context.entities.employeeId;
  }
  
  return {
    intentType: context.contextType,
    params
  };
}

/**
 * Legacy context detection for backward compatibility
 */
function legacyContextDetection(conversation: any[]): ConversationContext {
  const assistantMessages = conversation.filter(msg => msg.role === 'assistant').slice(-3);
  if (assistantMessages.length === 0) return { intentType: null, params: {} };
  
  const lastAssistantMessage = assistantMessages[assistantMessages.length - 1]?.content || '';
  
  // Detect PENDING_EMAIL_FOR_VOUCHER context
  if (/¿A\s+qué\s+email\s+deseas\s+enviar\s+el\s+comprobante\s+de\s+\*\*(.+?)\*\*\?/i.test(lastAssistantMessage)) {
    const employeeMatch = lastAssistantMessage.match(/\*\*(.+?)\*\*/);
    return { 
      intentType: 'PENDING_EMAIL_FOR_VOUCHER', 
      params: { employeeName: employeeMatch?.[1] || null }
    };
  }

  // Detect PENDING_SAVE_EMAIL_CONFIRMATION context
  if (/¿Deseas\s+guardar.*como\s+el\s+email\s+de\s+\*\*(.+?)\*\*\?/i.test(lastAssistantMessage)) {
    const emailMatch = lastAssistantMessage.match(/guardar\s+([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
    const employeeNameMatch = lastAssistantMessage.match(/de\s+\*\*(.+?)\*\*\?/);
    return { 
      intentType: 'PENDING_SAVE_EMAIL_CONFIRMATION', 
      params: { 
        employeeName: employeeNameMatch?.[1] || null,
        email: emailMatch?.[1] || null
      }
    };
  }
  
  return { intentType: null, params: {} };
}

/**
 * Infer intent from follow-up query and context
 */
export function inferIntentFromContext(
  followUpName: string, 
  context: ConversationContext
): InferredIntent | null {
  if (!context.intentType) return null;
  
  console.log(`🧠 [INFERENCE] Follow-up for "${followUpName}" with context: ${context.intentType}`);
  
  // Use intelligent inferencer
  const contextForInferencer = ConversationContextAnalyzer.analyze([
    { role: 'assistant', content: `Context: ${context.intentType}` }
  ]);
  
  const inferredIntent = SmartContextInferencer.infer(
    followUpName,
    contextForInferencer,
    followUpName
  );
  
  if (inferredIntent) {
    return {
      type: inferredIntent.type,
      method: getMethodForIntent(inferredIntent.type),
      params: inferredIntent.parameters,
      confidence: inferredIntent.confidence
    };
  }
  
  // Fallback to legacy mapping
  return legacyIntentMapping(followUpName, context);
}

/**
 * Legacy intent mapping for backward compatibility
 */
function legacyIntentMapping(followUpName: string, context: ConversationContext): InferredIntent | null {
  switch (context.intentType) {
    case 'EMPLOYEE_INFO':
    case 'EMPLOYEE_SEARCH':
      return {
        type: 'EMPLOYEE_SEARCH',
        method: 'searchEmployee',
        params: { name: followUpName },
        confidence: 0.95
      };
      
    case 'SALARY_INFO':
      return {
        type: 'EMPLOYEE_SALARY',
        method: 'getEmployeeSalary',
        params: { name: followUpName },
        confidence: 0.95
      };
    
    case 'PAYROLL_INFO':
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
      
    default:
      return null;
  }
}

/**
 * Helper to get method name from intent type
 */
function getMethodForIntent(intentType: string): string {
  const methodMap: Record<string, string> = {
    'EMPLOYEE_SEARCH': 'searchEmployee',
    'EMPLOYEE_SALARY': 'getEmployeeSalary',
    'EMPLOYEE_PAID_TOTAL': 'getEmployeePaidTotal',
    'EMPLOYEE_DETAILS': 'getEmployeeDetails',
    'BENEFIT_QUERY': 'getBenefitInfo',
    'REPORT_GENERATE': 'generateReport',
    'BENEFIT_PROVISION_QUERY': 'getEmployeeBenefitProvision'
  };
  return methodMap[intentType] || 'searchEmployee';
}

/**
 * Extract employee name from last assistant messages
 */
export function extractLastEmployeeFromContext(conversation: any[]): string | null {
  const assistantMessages = conversation
    .filter(msg => msg.role === 'assistant')
    .slice(-3);
  
  if (assistantMessages.length === 0) return null;
  
  for (const message of assistantMessages.reverse()) {
    const content = message.content || '';
    
    // Pattern 1: "Encontré a **NOMBRE APELLIDO**"
    const foundMatch = content.match(/Encontré\s+a\s+\*\*([A-ZÁÉÍÓÚÑ\s]+)\*\*/i);
    if (foundMatch) return foundMatch[1].trim();
    
    // Pattern 2: Employee card format "**NOMBRE APELLIDO**\n💼"
    const cardMatch = content.match(/\*\*([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)+)\*\*[\s\n]*💼/i);
    if (cardMatch) return cardMatch[1].trim();
    
    // Pattern 3: Bold name at start of response
    const boldMatch = content.match(/^\*\*([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)+)\*\*/);
    if (boldMatch) return boldMatch[1].trim();
  }
  
  return null;
}

/**
 * Extract name from short contextual reply
 */
export function extractNameFromShortReply(text: string): string | null {
  const lowerText = text.toLowerCase().trim();
  
  // Pattern 1: "de [nombre]" or "del [nombre]"
  const pattern1 = lowerText.match(/^(?:de|del|de\s+la)\s+([a-záéíóúñ]+(?:\s+[a-záéíóúñ]+)?)/i);
  if (pattern1) return pattern1[1].trim();
  
  // Pattern 2: Just a name (single or double word)
  const pattern2 = lowerText.match(/^([a-záéíóúñ]+(?:\s+[a-záéíóúñ]+)?)$/i);
  if (pattern2 && pattern2[1].length > 2) return pattern2[1].trim();
  
  return null;
}

/**
 * Check if Maya is waiting for employee name
 */
export function isAwaitingEmployeeNameForDetails(conversation: any[]): boolean {
  const assistantMessages = conversation
    .filter(msg => msg.role === 'assistant')
    .slice(-1);
  
  if (assistantMessages.length === 0) return false;
  
  const lastMessage = assistantMessages[0]?.content || '';
  return /¿De\s+(?:qué|que)\s+empleado\s+necesitas\s+m[aá]s\s+informaci[oó]n\?/i.test(lastMessage);
}

/**
 * Extract employee name from salary query
 */
export function extractNameFromSalaryQuery(text: string): string | null {
  const lowerText = text.toLowerCase().trim();
  
  // Pattern 1: "cual es el salario de eliana"
  const pattern1Match = lowerText.match(/(?:cuál|cual|cuánto|cuanto|qué|que)\s+(?:es\s+el\s+)?(?:salario|sueldo|gana|cobra)\s+de\s+([a-záéíóúñ\s]+)/i);
  if (pattern1Match) return pattern1Match[1]?.trim().replace(/[?.,!]+$/, '') || null;
  
  // Pattern 2: "salario de eliana"
  const pattern2Match = lowerText.match(/(?:salario|sueldo|gana|cobra)\s+(?:de|del|de\s+la)\s+([a-záéíóúñ\s]+)/i);
  if (pattern2Match) return pattern2Match[1]?.trim().replace(/[?.,!]+$/, '') || null;
  
  // Pattern 3: "sueldo eliana"
  if (!/nomina|total|cuanto|mes|año|periodo/i.test(lowerText)) {
    const pattern3Match = lowerText.match(/(?:salario|sueldo)\s+([a-záéíóúñ]+(?:\s+[a-záéíóúñ]+)?)/i);
    if (pattern3Match) return pattern3Match[1]?.trim().replace(/[?.,!]+$/, '') || null;
  }
  
  return null;
}
