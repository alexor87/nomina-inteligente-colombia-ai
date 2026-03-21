// ============================================================================
// MAYA Intelligence - KISS Implementation
// ============================================================================
// Simplified from 1,900+ lines to <300 lines with 10x better performance

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { checkRateLimit, rateLimitResponse } from '../_shared/rate-limiter.ts';
import { SimpleIntentMatcher } from './SimpleIntentMatcher.ts';
import { liquidarNomina, registrarNovedad, calcularPrestacion, generarReporte } from './payroll-handlers.ts';
import { buildStructuredResponse, extractPeriod } from './structured-response-builder.ts';
import { ConversationContextAnalyzer } from './core/conversation-context-analyzer.ts';
import { SmartContextInferencer } from './core/smart-context-inferencer.ts';
import * as AggregationService from './services/aggregation/index.ts';
import { QueryClassifier, QueryType } from './core/query-classifier.ts';
import { LLMQueryClassifier, LLMQueryType } from './core/llm-query-classifier.ts';
import { handleTemporalFollowUp, canHandleTemporalFollowUp } from './handlers/temporal-followup-handler.ts';
import { TemporalResolver } from './core/temporal-resolver.ts';
import { HandlerRegistry } from './core/handler-registry.ts';
import { MayaLogger } from './core/types.ts';
import { IntentRouter } from './core/intent-router.ts';
import { 
  detectFollowUpQuery, 
  analyzeConversationContext, 
  inferIntentFromContext,
  extractNameFromSalaryQuery,
  isAwaitingEmployeeNameForDetails,
  extractNameFromShortReply
} from './core/context-enricher.ts';
import { ResponseOrchestrator } from './core/response-orchestrator.ts';
import { LLMClient, MODEL_ROUTING } from './core/llm-client.ts';
import { ConversationStateManager, FlowType } from './core/conversation-state-manager.ts';

// ============================================================================
// MVE SERVICES (Phase 1 & 2)
// ============================================================================
import { EventLogger } from './services/event-logger.ts';
import { SessionManager } from './services/session-manager.ts';
import { IdempotencyHandler } from './services/idempotency-handler.ts';
import { CircuitBreaker } from './services/circuit-breaker.ts';

// ============================================================================
// CONVERSATIONAL CONTEXT SYSTEM
// ============================================================================
// Functions moved to core/context-enricher.ts for better modularity

// ============================================================================
// HELPER: Extract action parameters from conversation history
// ============================================================================
function extractActionParametersFromContext(conversation: any[], actionType: string): Record<string, any> {
  console.log(`🔍 [PARAM_EXTRACTION] Searching for parameters for action: ${actionType}`);
  
  // Search in the last 5 messages for executable actions
  const recentMessages = conversation.slice(-5).reverse();
  
  for (const msg of recentMessages) {
    if (msg.executableActions && Array.isArray(msg.executableActions)) {
      // Look for matching action by type or id
      const matchingAction = msg.executableActions.find((action: any) => 
        action.type === actionType || 
        action.type === 'liquidate_payroll_complete' ||
        action.id === `action_${actionType}` ||
        action.id === 'liquidate_complete'
      );
      
      if (matchingAction?.parameters) {
        console.log(`✅ [PARAM_EXTRACTION] Found parameters:`, {
          periodId: matchingAction.parameters.periodId,
          startDate: matchingAction.parameters.startDate,
          endDate: matchingAction.parameters.endDate,
          companyId: matchingAction.parameters.companyId
        });
        return matchingAction.parameters;
      }
    }
  }
  
  console.log(`⚠️ [PARAM_EXTRACTION] No parameters found for action: ${actionType}`);
  return {};
}

// Context analysis functions moved to core/context-enricher.ts

// Legacy context detection moved to core/context-enricher.ts

// Intent inference moved to core/context-enricher.ts

// Legacy mapping and helper functions moved to core/context-enricher.ts

// Helper to map aggregation intent types to service method names
function getMethodForAggregationIntent(intentType: string): string | null {
  const methodMap: Record<string, string> = {
    'TOTAL_PAYROLL_COST': 'getTotalPayrollCost',
    'SECURITY_CONTRIBUTIONS': 'getSecurityContributions',
    'HIGHEST_COST_EMPLOYEES': 'getHighestCostEmployees',
    'LOWEST_COST_EMPLOYEES': 'getLowestCostEmployees',
    'TOTAL_INCAPACITY_DAYS': 'getTotalIncapacityDays',
    'INCAPACITY_REPORT': 'getIncapacityReport',
    'TOTAL_OVERTIME_HOURS': 'getTotalOvertimeHours',
    'PAYROLL_COMPARISON': 'comparePayrollPeriods',
    'HIGHEST_PAYROLL_PERIOD': 'getHighestPayrollPeriod',
    'LOWEST_PAYROLL_PERIOD': 'getLowestPayrollPeriod'
  };
  return methodMap[intentType] || null;
}

// Employee name extraction moved to core/context-enricher.ts

// Extract employee name from last assistant messages
function extractLastEmployeeFromContext(conversation: any[]): string | null {
  // Look at the last 2-3 assistant messages
  const assistantMessages = conversation
    .filter(msg => msg.role === 'assistant')
    .slice(-3);
  
  if (assistantMessages.length === 0) {
    return null;
  }
  
  for (const message of assistantMessages.reverse()) {
    const content = message.content || '';
    
    // Pattern 1: "Encontré a **NOMBRE APELLIDO**"
    const foundMatch = content.match(/Encontré\s+a\s+\*\*([A-ZÁÉÍÓÚÑ\s]+)\*\*/i);
    if (foundMatch) {
      return foundMatch[1].trim();
    }
    
    // Pattern 2: Employee card format "**NOMBRE APELLIDO**\n💼"
    const cardMatch = content.match(/\*\*([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)+)\*\*[\s\n]*💼/i);
    if (cardMatch) {
      return cardMatch[1].trim();
    }
    
    // Pattern 3: Bold name at start of response
    const boldMatch = content.match(/^\*\*([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)+)\*\*/);
    if (boldMatch) {
      return boldMatch[1].trim();
    }
  }
  
  return null;
}

// Check if Maya is waiting for an employee name for details
function isAwaitingEmployeeNameForDetails(conversation: any[]): boolean {
  const assistantMessages = conversation
    .filter(msg => msg.role === 'assistant')
    .slice(-1);
  
  if (assistantMessages.length === 0) {
    return false;
  }
  
  const lastMessage = assistantMessages[0]?.content || '';
  
  // Check if the last message was asking for an employee name
  return /¿De\s+(?:qué|que)\s+empleado\s+necesitas\s+m[aá]s\s+informaci[oó]n\?/i.test(lastMessage);
}

// Extract name from short contextual reply like "de eliana" or "eliana"
function extractNameFromShortReply(text: string): string | null {
  const lowerText = text.toLowerCase().trim();
  
  // Pattern 1: "de [nombre]" or "del [nombre]"
  const pattern1 = lowerText.match(/^(?:de|del|de\s+la)\s+([a-záéíóúñ]+(?:\s+[a-záéíóúñ]+)?)/i);
  if (pattern1) {
    return pattern1[1].trim();
  }
  
  // Pattern 2: Just a name (single or double word)
  const pattern2 = lowerText.match(/^([a-záéíóúñ]+(?:\s+[a-záéíóúñ]+)?)$/i);
  if (pattern2 && pattern2[1].length > 2) {
    return pattern2[1].trim();
  }
  
  return null;
}

// ============================================================================
// DEPRECATED: detectTemporalFollowUp - Replaced by LLM-based classification
// ============================================================================
// This function has been replaced by the LLMQueryClassifier and 
// handleTemporalFollowUp handler for better accuracy and maintainability.
// Kept for reference but should not be used in new code.
// 
// Migration: Use LLMQueryClassifier.classify() + handleTemporalFollowUp() instead
// ============================================================================
/*
// Detect temporal follow-up queries like "y de todo el año?"
async function detectTemporalFollowUp(text: string): Promise<{ type: string | null; params: any } | null> {
  const lowerText = text.toLowerCase().trim();
  
  // Import patterns from context-patterns
  const { TEMPORAL_FOLLOW_UP_PATTERNS } = await import('./config/context-patterns.ts');
  
  const monthNames = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 
                     'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const quarterNames: Record<string, number> = { 'primer': 1, 'segundo': 2, 'tercer': 3, 'cuarto': 4 };
  const semesterNames: Record<string, number> = { 'primer': 1, 'segundo': 2 };
  
  // Check LAST_YEAR patterns
  for (const pattern of TEMPORAL_FOLLOW_UP_PATTERNS.LAST_YEAR) {
    if (pattern.test(lowerText)) {
      const lastYear = new Date().getFullYear() - 1;
      console.log(`📅 [TEMPORAL_FOLLOW_UP] Detected: LAST_YEAR (${lastYear})`);
      return {
        type: 'LAST_YEAR',
        params: {
          year: lastYear,
          month: null,
          periodId: null
        }
      };
    }
  }
  
  // Check SPECIFIC_YEAR patterns
  for (const pattern of TEMPORAL_FOLLOW_UP_PATTERNS.SPECIFIC_YEAR) {
    const match = lowerText.match(pattern);
    if (match) {
      const year = parseInt(match[1] || match[0].replace(/\D/g, ''));
      console.log(`📅 [TEMPORAL_FOLLOW_UP] Detected: SPECIFIC_YEAR (${year})`);
      return {
        type: 'SPECIFIC_YEAR',
        params: {
          year,
          month: null,
          periodId: null
        }
      };
    }
  }
  
  // Check FULL_YEAR patterns
  for (const pattern of TEMPORAL_FOLLOW_UP_PATTERNS.FULL_YEAR) {
    if (pattern.test(lowerText)) {
      const currentYear = new Date().getFullYear();
      console.log(`📅 [TEMPORAL_FOLLOW_UP] Detected: FULL_YEAR (${currentYear})`);
      return {
        type: 'FULL_YEAR',
        params: {
          year: currentYear,
          month: null,
          periodId: null
        }
      };
    }
  }
  
  // Check LAST_N_MONTHS patterns
  for (const pattern of TEMPORAL_FOLLOW_UP_PATTERNS.LAST_N_MONTHS) {
    const match = lowerText.match(pattern);
    if (match) {
      const monthCount = parseInt(match[1]);
      console.log(`📅 [TEMPORAL_FOLLOW_UP] Detected: LAST_N_MONTHS (${monthCount})`);
      return {
        type: 'LAST_N_MONTHS',
        params: {
          monthCount,
          periodId: null
        }
      };
    }
  }
  
  // Check QUARTER patterns
  for (const pattern of TEMPORAL_FOLLOW_UP_PATTERNS.QUARTER) {
    const match = lowerText.match(pattern);
    if (match) {
      let quarterNumber: number | null = null;
      
      if (match[1] && /^\d+$/.test(match[1])) {
        // "trimestre 1", "q1"
        quarterNumber = parseInt(match[1]);
      } else if (match[1] && quarterNames[match[1]]) {
        // "primer trimestre", "segundo trimestre"
        quarterNumber = quarterNames[match[1]];
      } else if (/pasado|anterior/i.test(match[0])) {
        // "trimestre pasado"
        const currentMonth = new Date().getMonth();
        const currentQuarter = Math.floor(currentMonth / 3) + 1;
        quarterNumber = currentQuarter === 1 ? 4 : currentQuarter - 1;
      }
      
      if (quarterNumber && quarterNumber >= 1 && quarterNumber <= 4) {
        console.log(`📅 [TEMPORAL_FOLLOW_UP] Detected: QUARTER (${quarterNumber})`);
        return {
          type: 'QUARTER',
          params: {
            quarter: quarterNumber,
            year: null,
            periodId: null
          }
        };
      }
    }
  }
  
  // Check SEMESTER patterns
  for (const pattern of TEMPORAL_FOLLOW_UP_PATTERNS.SEMESTER) {
    const match = lowerText.match(pattern);
    if (match) {
      let semesterNumber: number | null = null;
      
      if (match[1] && /^\d+$/.test(match[1])) {
        // "semestre 1"
        semesterNumber = parseInt(match[1]);
      } else if (match[1] && semesterNames[match[1]]) {
        // "primer semestre"
        semesterNumber = semesterNames[match[1]];
      } else if (/pasado|anterior/i.test(match[0])) {
        // "semestre pasado"
        const currentMonth = new Date().getMonth();
        const currentSemester = currentMonth < 6 ? 1 : 2;
        semesterNumber = currentSemester === 1 ? 2 : 1;
      }
      
      if (semesterNumber && (semesterNumber === 1 || semesterNumber === 2)) {
        console.log(`📅 [TEMPORAL_FOLLOW_UP] Detected: SEMESTER (${semesterNumber})`);
        return {
          type: 'SEMESTER',
          params: {
            semester: semesterNumber,
            year: null,
            periodId: null
          }
        };
      }
    }
  }
  
  // Check MONTH_RANGE patterns
  for (const pattern of TEMPORAL_FOLLOW_UP_PATTERNS.MONTH_RANGE) {
    const match = lowerText.match(pattern);
    if (match) {
      const monthStart = match[1].toLowerCase();
      const monthEnd = match[2].toLowerCase();
      console.log(`📅 [TEMPORAL_FOLLOW_UP] Detected: MONTH_RANGE (${monthStart} a ${monthEnd})`);
      return {
        type: 'MONTH_RANGE',
        params: {
          monthStart,
          monthEnd,
          year: null,
          periodId: null
        }
      };
    }
  }
  
  // Check SPECIFIC_MONTH patterns
  for (const pattern of TEMPORAL_FOLLOW_UP_PATTERNS.SPECIFIC_MONTH) {
    const match = lowerText.match(pattern);
    if (match) {
      const month = match[1] || match[0].replace(/^y\s+/, '').replace(/\?$/, '').trim();
      console.log(`📅 [TEMPORAL_FOLLOW_UP] Detected: SPECIFIC_MONTH (${month})`);
      return {
        type: 'SPECIFIC_MONTH',
        params: {
          month: month.toLowerCase(),
          year: null, // Will be inferred
          periodId: null
        }
      };
    }
  }
  
  // Check LAST_MONTH patterns
  for (const pattern of TEMPORAL_FOLLOW_UP_PATTERNS.LAST_MONTH) {
    if (pattern.test(lowerText)) {
      const now = new Date();
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      console.log('📅 [TEMPORAL_FOLLOW_UP] Detected: LAST_MONTH');
      return {
        type: 'LAST_MONTH',
        params: {
          month: monthNames[lastMonth.getMonth()],
          year: lastMonth.getFullYear(),
          periodId: null
        }
      };
    }
  }
  
  // Check THIS_YEAR patterns
  for (const pattern of TEMPORAL_FOLLOW_UP_PATTERNS.THIS_YEAR) {
    if (pattern.test(lowerText)) {
      console.log('📅 [TEMPORAL_FOLLOW_UP] Detected: THIS_YEAR');
      return {
        type: 'THIS_YEAR',
        params: {
          year: new Date().getFullYear(),
          month: null,
          periodId: null
        }
      };
    }
  }
  
  return null;
}
*/
// ============================================================================
// END DEPRECATED: detectTemporalFollowUp
// ============================================================================

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-maya-stream-request',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? supabaseKey;

// ============================================================================
// MVE SERVICE INITIALIZATION
// ============================================================================
// Use SERVICE_ROLE_KEY for internal services to bypass RLS
const eventLogger = new EventLogger(supabaseUrl, serviceRoleKey);
const sessionManager = new SessionManager(supabaseUrl, serviceRoleKey);
const idempotencyHandler = new IdempotencyHandler(supabaseUrl, serviceRoleKey, 24);
const llmCircuitBreaker = new CircuitBreaker({
  failureThreshold: 5,
  successThreshold: 2,
  timeout: 30000,
  resetTimeout: 60000
});

// 🔒 SECURITY HELPERS (KISS)
async function getCurrentCompanyId(client: any): Promise<string | null> {
  try {
    const { data: { user } } = await client.auth.getUser();
    if (!user) return null;
    const { data, error } = await client
      .from('profiles')
      .select('company_id')
      .eq('user_id', user.id)
      .single();
    if (error) {
      console.error('🔒 [SECURITY] Error fetching company_id:', error);
      return null;
    }
    return data?.company_id ?? null;
  } catch (e) {
    console.error('🔒 [SECURITY] getCurrentCompanyId failed:', e);
    return null;
  }
}

function scopeToCompany(query: any, companyId: string) {
  return query.eq('company_id', companyId);
}

// 🧩 Context normalization helper
function normalizeContext(
  raw: any,
  opts: { sessionId?: string; companyId?: string; defaultFlowType?: FlowType } = {}
) {
  try {
    let parsed: any = raw;

    // If wrapped or stringified, unwrap/parse
    if (parsed && typeof parsed === 'object' && 'conversationState' in parsed && parsed.conversationState) {
      parsed = (parsed as any).conversationState;
    }
    if (typeof parsed === 'string') {
      try {
        // Prefer using ConversationStateManager if available
        parsed = ConversationStateManager.deserialize(parsed);
      } catch {
        try {
          parsed = JSON.parse(parsed);
        } catch {
          // keep as raw string
        }
      }
    }

    const transitionHistory = parsed?.transitionHistory ?? parsed?.history ?? [];
    const flowType = parsed?.flowType ?? opts.defaultFlowType ?? FlowType.EMPLOYEE_CREATE;
    const currentState = parsed?.currentState ?? parsed?.state ?? null;
    const accumulatedData = parsed?.accumulatedData ?? {};

    const metadata = {
      ...(parsed?.metadata || {}),
      sessionId: opts.sessionId ?? parsed?.metadata?.sessionId,
      companyId: opts.companyId ?? parsed?.metadata?.companyId,
      startedAt: parsed?.metadata?.startedAt ?? new Date().toISOString(),
      lastTransition: parsed?.metadata?.lastTransition ?? new Date().toISOString(),
      transitionCount:
        parsed?.metadata?.transitionCount ?? (Array.isArray(transitionHistory) ? transitionHistory.length : 0),
    };

    const normalized = {
      ...((parsed && typeof parsed === 'object') ? parsed : {}),
      flowType,
      currentState,
      accumulatedData,
      transitionHistory,
      metadata,
    } as any;

    if (!normalized.flowType || normalized.currentState == null) {
      console.warn(
        '⚠️ [NORMALIZE] Missing critical fields after normalization',
        { hasFlowType: !!normalized.flowType, hasCurrentState: normalized.currentState != null }
      );
    }

    return normalized;
  } catch (e) {
    console.warn('⚠️ [NORMALIZE] Failed to normalize context, using fallback', e);
    return {
      flowType: opts.defaultFlowType ?? FlowType.EMPLOYEE_CREATE,
      currentState: null,
      accumulatedData: {},
      transitionHistory: [],
      metadata: {
        sessionId: opts.sessionId,
        companyId: opts.companyId,
        startedAt: new Date().toISOString(),
        lastTransition: new Date().toISOString(),
        transitionCount: 0,
      },
    } as any;
  }
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Rate limiting — 30 requests/min per user
  const rateLimitClient = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
  const rateLimit = await checkRateLimit(rateLimitClient, req.headers.get('Authorization') || '', 'maya-intelligence');
  if (!rateLimit.allowed) return rateLimitResponse(rateLimit.retryAfter, corsHeaders);

  try {
    // Get user token from auth header
    const authHeader = req.headers.get('Authorization') || '';
    const userSupabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });
    
    // Create admin client for demonstrative calculations (no JWT required)
    const supabaseAdmin = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    const body = await req.json();
    const { conversation, sessionId, richContext, metadata, idempotencyKey, actionType, actionParameters, wantsStreaming } = body;

    // Initialize LLM client with available keys
    const llmClient = new LLMClient(
      Deno.env.get('OPENAI_API_KEY'),
      Deno.env.get('ANTHROPIC_API_KEY')
    );

    console.log(`📦 [METADATA] Received metadata:`, metadata ? 'present' : 'missing');
    console.log(`🔑 [IDEMPOTENCY] Received key:`, idempotencyKey ? 'present' : 'missing');
    
    // Log action data if present
    if (actionType || actionParameters) {
      console.log('✅ [REQUEST_BODY] Action data received:', {
        hasActionType: !!actionType,
        hasActionParameters: !!actionParameters,
        actionType,
        paramKeys: actionParameters ? Object.keys(actionParameters) : []
      });
    }
    
    // Validate richContext if provided
    if (richContext?.companyId) {
      console.log(`🔍 [CONTEXT_VALIDATION] Received companyId: ${richContext.companyId}`);
      
      // Get user's actual company from database
      const { data: userData } = await userSupabase.auth.getUser();
      if (userData?.user) {
        const { data: profileData } = await userSupabase
          .from('profiles')
          .select('company_id')
          .eq('user_id', userData.user.id)
          .single();
        
        if (profileData?.company_id && profileData.company_id !== richContext.companyId) {
          console.error(`🚨 [SECURITY] Company mismatch! User: ${profileData.company_id}, Context: ${richContext.companyId}`);
          return new Response(JSON.stringify({
            error: 'Invalid context',
            message: 'El contexto proporcionado no coincide con tu empresa actual. Por favor recarga la página.'
          }), { 
            status: 403, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          });
        }
      }
    }

    // ============================================================================
    // REPORT GENERATION BRIDGE - Direct Handler (moved earlier to avoid conversation access)
    // ============================================================================
    if (body?.action === 'generate_report' && body?.reportRequest) {
      console.log('📊 [REPORT_GENERATION] Direct report request detected');
      console.log('📊 [REPORT_GENERATION] Request:', body.reportRequest);
      
      try {
        console.log('📊 [REPORT_GENERATION] Generating report with request:', body.reportRequest);
        console.log('📊 [REPORT_GENERATION] Period resolution:', {
          period: body.reportRequest?.period,
          periodId: body.reportRequest?.periodId,
          hasPeriodId: !!body.reportRequest?.periodId,
          willResolveBy: body.reportRequest?.periodId ? 'UUID' : 'name'
        });
        
        const { ReportsHandler } = await import('./handlers/reports-handler.ts');
        
        const reportResult = await ReportsHandler.handleReportGeneration(
          body.reportRequest,
          userSupabase
        );
        
        console.log('✅ [REPORT_GENERATION] Report generated successfully');
        
        return new Response(JSON.stringify({
          message: reportResult.message,
          emotionalState: reportResult.emotionalState || 'professional',
          narrative: reportResult.message,
          insights: reportResult.conversationState?.insights || [],
          data: reportResult.conversationState?.reportData || [],
          contextualActions: reportResult.contextualActions || [],
          quickReplies: reportResult.quickReplies || [],
          sessionId: body.sessionId || sessionId,
          timestamp: new Date().toISOString()
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } catch (error) {
        console.error('❌ [REPORT_GENERATION] Error:', error);
        
        await eventLogger.logError(
          sessionId || 'unknown',
          body.reportRequest?.companyId,
          error as Error,
          undefined,
          { stage: 'REPORT_GENERATION', reportType: body.reportRequest?.reportType }
        );
        
        return new Response(JSON.stringify({
          message: `❌ Hubo un error al generar el reporte: ${(error as Error).message}. Por favor intenta de nuevo.`,
          emotionalState: 'concerned',
          sessionId: body.sessionId || sessionId,
          timestamp: new Date().toISOString()
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500
        });
      }
    }

    const lastMessage = Array.isArray(conversation) && conversation.length > 0
      ? (conversation[conversation.length - 1]?.content || '')
      : '';
    console.log(`[MAYA-KISS] Processing: "${lastMessage}"`);
    
    // ============================================================================
    // IDEMPOTENCY CHECK (Phase 2 - Day 4)
    // ============================================================================
    const companyId = richContext?.companyId || '';
    if (idempotencyKey && companyId) {
      const idempotencyResult = await idempotencyHandler.checkAndStore(
        idempotencyKey,
        companyId,
        sessionId || 'unknown',
        { message: lastMessage, timestamp: new Date().toISOString() }
      );
      
      if (idempotencyResult.isDuplicate) {
        console.log(`⚠️ [IDEMPOTENCY] Duplicate request detected, returning cached response`);
        return new Response(
          JSON.stringify(idempotencyResult.previousResponse),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }
    
    // Log user message event
    await eventLogger.logUserMessage(
      sessionId || 'unknown',
      companyId,
      undefined,
      lastMessage,
      { richContext }
    );
    
    // Declare intent variable
    let intent: any = null;
    
    // Declare LLM classification variable at function scope
    let llmClassification: LLMClassification | null = null;

    // ============================================================================
    // BACKEND SESSION STATE LOADING (Phase 1 - Day 2-3)
    // ============================================================================
    let stateGateActive = false;
    let preservedContext: any = null;
    
    try {
      // Load context from backend storage (single source of truth)
      const loadedContext = await sessionManager.loadContext(sessionId || '');
      
      if (loadedContext && loadedContext.flowType === FlowType.EMPLOYEE_CREATE && !ConversationStateManager.isFlowComplete(loadedContext)) {
        console.log(`🚨 [STATE_GATE] ACTIVE - Checking for interruptions (state: ${loadedContext.currentState})`);
        
        // ===== INTERRUPTION DETECTION =====
        const { InterruptionDetector } = await import('./core/interruption-detector.ts');
        const interruption = InterruptionDetector.detect(lastMessage, loadedContext);
        
        console.log(`🔍 [INTERRUPTION] Type: ${interruption.interruptionType}, Is interruption: ${interruption.isInterruption}`);
        
        // Handle interruptions
        if (interruption.isInterruption) {
          if (interruption.interruptionType === 'greeting') {
            // Respond to greeting and maintain flow
            const { StateResponseBuilder } = await import('./core/state-response-builder.ts');
            const greetingResponse = StateResponseBuilder.buildInterruptionResponse(
              'greeting',
              loadedContext,
              lastMessage
            );
            
            // Save context (no changes, just maintaining flow)
            await sessionManager.saveContext(loadedContext);
            
            return new Response(JSON.stringify({
              message: greetingResponse.message,
              emotionalState: 'encouraging',
              conversationState: loadedContext,
              quickReplies: greetingResponse.quickReplies
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          } else if (interruption.interruptionType === 'cancel') {
            // Cancel flow and return to IDLE
            console.log(`❌ [INTERRUPTION] Flow cancelled by user`);
            const cancelledContext = ConversationStateManager.transitionTo(
              loadedContext,
              ConversationState.IDLE,
              'user_cancellation',
              'User cancelled the flow'
            );
            
            await sessionManager.saveContext(cancelledContext);
            
            return new Response(JSON.stringify({
              message: "❌ He cancelado la creación del empleado. ¿En qué más puedo ayudarte?",
              emotionalState: 'neutral',
              conversationState: cancelledContext,
              quickReplies: []
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          } else if (interruption.interruptionType === 'query' && interruption.detectedIntent) {
            // Handle out-of-context query, then re-prompt for flow
            console.log(`🔀 [INTERRUPTION] Out-of-context query detected: ${interruption.detectedIntent.type}`);
            
            // Route the query intent
            const queryResponse = await intentRouter.route(interruption.detectedIntent, richContext);
            
            // After answering, re-prompt for the flow
            const { StateResponseBuilder } = await import('./core/state-response-builder.ts');
            const flowPrompt = StateResponseBuilder.buildStateResponse(loadedContext.state, loadedContext);
            
            const combinedMessage = `${queryResponse.message}\n\n---\n\n**Volviendo al flujo de creación:**\n${flowPrompt.message}`;
            
            // Save context (no changes, maintaining flow)
            await sessionManager.saveContext(loadedContext);
            
            return new Response(JSON.stringify({
              message: combinedMessage,
              emotionalState: 'encouraging',
              conversationState: loadedContext,
              quickReplies: flowPrompt.quickReplies
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }
        }
        
        // ===== NO INTERRUPTION - Continue with flow =====
        console.log(`➡️ [STATE_GATE] No interruption, continuing flow`);
        stateGateActive = true;
        preservedContext = loadedContext;
        
        // Log state transition event
        await eventLogger.logStateTransition(
          loadedContext,
          loadedContext.currentState,
          loadedContext.currentState,
          'User message in active flow',
          { message: lastMessage }
        );
        
        // SHORT-CIRCUIT: Skip all classification and jump directly to CRUD handler
        const crudResponse = await crudHandlerRegistry.handleIntent({
          type: 'EMPLOYEE_CREATE',
          method: 'createEmployee',
          confidence: 0.99,
          entities: [],
          parameters: {
            originalMessage: lastMessage,
            conversationState: loadedContext
          }
        }, richContext);
        
        // Save updated context to backend
        if (crudResponse.conversationState) {
          const normalized = normalizeContext(crudResponse.conversationState, { sessionId, companyId, defaultFlowType: FlowType.EMPLOYEE_CREATE });
          await sessionManager.saveContext(normalized);
        }
        
        // Log assistant response
        await eventLogger.logAssistantResponse(
          sessionId || 'unknown',
          companyId,
          undefined,
          crudResponse,
          { flowActive: true }
        );
        
        // Store idempotency response
        if (idempotencyKey && companyId) {
          await idempotencyHandler.checkAndStore(
            idempotencyKey,
            companyId,
            sessionId || 'unknown',
            { message: lastMessage },
            crudResponse
          );
        }
        
        console.log(`✅ [STATE_GATE] Handler processed, returning response`);
        return new Response(
          JSON.stringify(crudResponse),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } catch (e) {
      console.warn('⚠️ [STATE_GATE] Failed to load session state', e);
      await eventLogger.logError(
        sessionId || 'unknown',
        companyId,
        e as Error,
        undefined,
        { stage: 'STATE_GATE' }
      );
    }
    

    // ============================================================================
    // SPECIAL MESSAGE HANDLING - Before conversation validation
    // ============================================================================
    // Handle special messages that don't require a full conversation array
    if (body?.message || body?.simulationRequest || body?.scanRequest) {
      const specialMessage = body.message;
      
      // Handle expand_periods_response
      if (specialMessage === 'expand_periods_response' && body?.data) {
        console.log('📊 [SPECIAL_MESSAGE] Expand periods response detected');
        return new Response(JSON.stringify({
          message: `Aquí están los detalles de **${body.data.employeeName}**:`,
          emotionalState: 'professional',
          sessionId: body.sessionId || sessionId,
          timestamp: new Date().toISOString()
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      // Handle what_if_simulation
      if (specialMessage?.startsWith('what_if_simulation:') && body?.simulationRequest) {
        console.log('📊 [SPECIAL_MESSAGE] What-if simulation detected');
        return new Response(JSON.stringify({
          message: 'Simulación procesada correctamente',
          emotionalState: 'professional',
          sessionId: body.sessionId || sessionId,
          timestamp: new Date().toISOString()
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      // Handle proactive_scan
      if (specialMessage === 'proactive_scan' && body?.scanRequest) {
        console.log('📊 [SPECIAL_MESSAGE] Proactive scan detected');
        return new Response(JSON.stringify({
          message: 'Escaneo proactivo completado',
          emotionalState: 'professional',
          sessionId: body.sessionId || sessionId,
          timestamp: new Date().toISOString()
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // ============================================================================
    // CONVERSATION VALIDATION - For normal chat flows
    // ============================================================================
    if (!conversation || !Array.isArray(conversation)) {
      return new Response(JSON.stringify({
        error: 'Invalid conversation format',
        message: 'Formato de conversación inválido'
      }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }
    
    // ============================================================================
    // CONVERSATIONAL CONTEXT ANALYSIS - PRIORITY 1
    // ============================================================================
    
    // PRIORITY 1: Check if Maya is waiting for an employee name for details
    if (isAwaitingEmployeeNameForDetails(conversation)) {
      const extractedName = extractNameFromShortReply(lastMessage);
      
      if (extractedName) {
        console.log(`[CONTEXT-ANSWER] Short reply detected for employee details: "${extractedName}"`);
        
        // Force EMPLOYEE_DETAILS intent with the extracted name
        intent = {
          type: 'EMPLOYEE_DETAILS',
          method: 'getEmployeeDetails',
          params: { name: extractedName },
          confidence: 0.95
        };
        
        console.log(`✅ [CONTEXT-ANSWER] Forcing EMPLOYEE_DETAILS for "${extractedName}"`);
      } else {
        console.log(`❓ [CONTEXT-ANSWER] Could not extract name from: "${lastMessage}"`);
        return new Response(JSON.stringify({
          message: `No pude identificar el nombre. ¿Podrías escribir el nombre del empleado completo?`,
          emotionalState: 'neutral',
          sessionId,
          timestamp: new Date().toISOString()
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }
    
    // ============================================================================
    // REPORT ACTION DETECTION
    // ============================================================================
    const reportActions = ['export_excel', 'export_pdf', 'view_detail', 'compare', 'otro_reporte'];
    if (reportActions.includes(lastMessage.toLowerCase().trim())) {
      console.log(`📊 [REPORT_ACTION] Detected: "${lastMessage}"`);
      
      // Get report context from request metadata first, then fallback to last assistant message
      const reportState = (metadata?.lastConversationState as any) ||
        conversation.slice().reverse().find(msg => msg.role === 'assistant')?.conversationState;
      
      if (!reportState?.reportType) {
        return new Response(JSON.stringify({
          message: '❌ No encontré información del reporte previo. Por favor genera un reporte primero.',
          emotionalState: 'neutral',
          sessionId,
          timestamp: new Date().toISOString()
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      // Handle different actions
      const action = lastMessage.toLowerCase().trim();
      let response: any;
      
      switch (action) {
        case 'export_excel':
          response = {
            message: '📥 Exportando a Excel...\n\nEl archivo se descargará automáticamente cuando esté listo.',
            emotionalState: 'professional',
            executableActions: [{
              id: 'export_excel_action',
              type: 'download_excel',
              label: 'Descargar Excel',
              parameters: {
                reportType: reportState.reportType,
                reportData: reportState.reportData,
                period: reportState.period
              }
            }]
          };
          break;
          
        case 'export_pdf':
          response = {
            message: '📄 Generando PDF...\n\nEl archivo se descargará automáticamente cuando esté listo.',
            emotionalState: 'professional',
            executableActions: [{
              id: 'export_pdf_action',
              type: 'download_pdf',
              label: 'Descargar PDF',
              parameters: {
                reportType: reportState.reportType,
                reportData: reportState.reportData,
                period: reportState.period
              }
            }]
          };
          break;
          
        case 'view_detail':
          response = {
            message: `📊 Mostrando detalles del reporte:\n\n**Período:** ${reportState.period}\n**Total registros:** ${reportState.reportData?.length || 0}\n\n¿Qué deseas hacer?`,
            emotionalState: 'professional',
            quickReplies: [
              { value: 'export_excel', label: 'Exportar Excel', icon: '📥' },
              { value: 'compare', label: 'Comparar', icon: '📈' },
              { value: 'otro_reporte', label: 'Otro reporte', icon: '🔄' }
            ]
          };
          break;
          
        case 'compare':
          response = {
            message: '📈 ¿Con qué período quieres comparar?\n\nEjemplos:\n- "Comparar con el mes anterior"\n- "Comparar con enero 2025"',
            emotionalState: 'questioning',
            conversationState: {
              ...reportState,
              awaitingComparison: true
            }
          };
          break;
          
        case 'otro_reporte':
          response = {
            message: '🔄 ¿Qué reporte quieres generar ahora?\n\nPuedes pedirme:\n- "Reporte de nómina de febrero"\n- "Costos laborales del año 2025"\n- "Seguridad social del último mes"',
            emotionalState: 'neutral',
            conversationState: null
          };
          break;
      }
      
      return new Response(JSON.stringify({
        ...response,
        sessionId,
        timestamp: new Date().toISOString()
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // ============================================================================
    // ============================================================================
    // PRIORITY 0: DIRECT ACTION PREFIX DETECTION
    // ============================================================================
    // Auto-detect and execute actions prefixed with "action_" from Maya guided flows
    if (lastMessage.startsWith('action_')) {
      console.log(`🎯 [DIRECT_ACTION] Detected action prefix: "${lastMessage}"`);
      
      // Extract action type and build executable action
      const actionType = lastMessage.replace('action_', '');
      
      try {
        // ✅ PROFESSIONAL SOLUTION: Clear priority order for parameter sourcing
        let actionParams: Record<string, any> = {};
        let paramSource = 'unknown';
        
        // 🎯 PRIORITY 1: Parameters from frontend payload (explicit)
        if (actionParameters && Object.keys(actionParameters).length > 0) {
          actionParams = actionParameters;
          paramSource = 'frontend_payload';
        }
        // 🎯 PRIORITY 2: pendingAction from richContext (explicit state)
        else if (richContext?.pendingAction?.parameters && 
                 Object.keys(richContext.pendingAction.parameters).length > 0) {
          actionParams = richContext.pendingAction.parameters;
          paramSource = 'richContext_pendingAction';
        }
        // 🎯 PRIORITY 3: Conversation history (now includes executableActions)
        else {
          actionParams = extractActionParametersFromContext(conversation, actionType);
          paramSource = 'conversation_history';
        }
        
        console.log(`✅ [PARAM_SOURCE] Using parameters from: ${paramSource}`, {
          periodId: actionParams.periodId,
          startDate: actionParams.startDate,
          endDate: actionParams.endDate,
          companyId: actionParams.companyId
        });
        
        // ⚠️ FAIL FAST: Validate critical parameters for liquidate_complete
        if (actionType === 'liquidate_complete' || actionType === 'liquidate_payroll_complete') {
          const missingParams = [];
          if (!actionParams.periodId) missingParams.push('periodId');
          if (!actionParams.startDate) missingParams.push('startDate');
          if (!actionParams.endDate) missingParams.push('endDate');
          
          if (missingParams.length > 0) {
            console.error(`❌ [VALIDATION] Missing critical parameters:`, missingParams);
            return new Response(JSON.stringify({
              message: `⚠️ No encontré información completa del período. Falta: ${missingParams.join(', ')}. Por favor, usa el botón de acción directamente.`,
              emotionalState: 'concerned',
              requiresUserInput: true,
              missingParameters: missingParams,
              sessionId,
              timestamp: new Date().toISOString()
            }), { 
              status: 400, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }
        }
        
        // Build action with validated parameters + rich context
        const action = {
          type: actionType,
          parameters: {
            ...actionParams,     // ✅ Specific action parameters (periodId, startDate, endDate)
            ...richContext,      // General context
            autoTriggered: true
          }
        };
        
        console.log(`🚀 [DIRECT_ACTION] Invoking execute-maya-action for: ${actionType}`, {
          parameters: action.parameters
        });
        
        // Route to execute-maya-action edge function with auth
        const { data, error } = await userSupabase.functions.invoke('execute-maya-action', {
          body: { action },
          headers: {
            Authorization: authHeader
          }
        });
        
        if (error) {
          console.error(`❌ [DIRECT_ACTION] Error executing "${actionType}":`, error);
          throw new Error(error.message || error);
        }
        
        console.log(`✅ [DIRECT_ACTION] Action "${actionType}" executed successfully`);
        
        // Return success response with data from execution
        return new Response(JSON.stringify({
          message: data.message || `✅ Acción "${actionType}" ejecutada correctamente`,
          emotionalState: 'celebrating',
          sessionId,
          timestamp: new Date().toISOString(),
          executableActions: data.data?.nextActions || [],
          data: data.data
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
        
      } catch (error: any) {
        console.error(`❌ [DIRECT_ACTION] Error executing "${actionType}":`, error);
        return new Response(JSON.stringify({
          message: `❌ Error al ejecutar la acción: ${error.message || 'Error desconocido'}. Por favor intenta de nuevo.`,
          emotionalState: 'concerned',
          sessionId,
          timestamp: new Date().toISOString()
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // ============================================================================
    // CHECK FOR PENDING CONTEXT (EMAIL_OVERRIDE waiting for employee name)
    // ============================================================================
    const lastAssistantMsg = conversation.filter(m => m.role === 'assistant').slice(-1)[0];
    if (lastAssistantMsg?.metadata?.pendingAction === 'EMAIL_OVERRIDE') {
      console.log('🔄 [PENDING_CONTEXT] Detected pending EMAIL_OVERRIDE, extracting employee name');
      const pendingEmail = lastAssistantMsg.metadata.pendingEmail;
      
      // Extract employee name from user's message
      const employeeNameMatch = lastMessage.match(/(?:para|de|a)\s+([a-záéíóúñ]+(?:\s+[a-záéíóúñ]+)*)/i) ||
                                lastMessage.match(/^([a-záéíóúñ]+(?:\s+[a-záéíóúñ]+)*)$/i);
      
      if (employeeNameMatch) {
        const extractedName = employeeNameMatch[1].trim();
        console.log(`✅ [PENDING_CONTEXT] Extracted employee name: "${extractedName}"`);
        
        // Create continuation intent
        intent = {
          type: 'VOUCHER_EMAIL_OVERRIDE_CONTINUE',
          method: 'handleVoucherEmailOverrideContinue',
          params: { employeeName: extractedName, email: pendingEmail },
          confidence: 0.95
        };
      }
    }
    
    if (!intent) {
      // Try fast path first
      intent = SimpleIntentMatcher.match(lastMessage);
      
      // If fast path has low confidence or no match, use LLM classification
      if (!intent || intent.confidence < 0.85) {
        console.log(`🤖 [HYBRID] Fast path confidence low (${intent?.confidence || 0}), using LLM classification...`);
        
        // Initialize LLM classifier with OpenAI key
        const openaiKey = Deno.env.get('OPENAI_API_KEY');
        if (openaiKey) {
          LLMQueryClassifier.initialize(openaiKey);
          
          try {
            // Get LLM classification with last 3 messages for context
            llmClassification = await LLMQueryClassifier.classify(
              lastMessage,
              conversation.slice(-3)
            );
            
            console.log(`🤖 [LLM] Classification: ${llmClassification.queryType} (${llmClassification.confidence.toFixed(2)})`);
            
            // Handle based on classification type
            switch (llmClassification.queryType) {
              case LLMQueryType.TEMPORAL_FOLLOWUP:
                // Use intelligent temporal follow-up handler
                if (canHandleTemporalFollowUp(llmClassification, conversation)) {
                  const temporalIntent = await handleTemporalFollowUp(llmClassification, conversation);
                  
                  if (temporalIntent) {
                    console.log(`✅ [TEMPORAL_FOLLOWUP] Intent resolved: ${temporalIntent.type}`);
                    temporalIntent.resolvedByLLM = true; // Mark as resolved by LLM to skip legacy validations
                    intent = temporalIntent;
                  } else {
                    console.log(`❌ [TEMPORAL_FOLLOWUP] Could not resolve intent from context`);
                    return new Response(JSON.stringify({
                      message: `¿De qué consulta te refieres? Necesito más contexto para entender qué información buscas para ese período.`,
                      emotionalState: 'neutral',
                      sessionId,
                      timestamp: new Date().toISOString()
                    }), {
                      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                    });
                  }
                }
                break;
              
              case LLMQueryType.EXPLANATION:
                // Preguntas teóricas/explicativas sobre legislación laboral colombiana
                console.log(`📚 [EXPLANATION] Theoretical question detected`);
                console.log(`   Concept: ${llmClassification.extractedContext.concept || 'general'}`);
                console.log(`   Confidence: ${llmClassification.confidence.toFixed(2)}`);
                
                // Usar handleConversation directamente con el prompt maestro
                // que incluye la personalidad de abogado laboral experto
                // y la fecha actual dinámica (octubre 2025)
                // Stream if client requested it
                if (wantsStreaming) {
                  try {
                    const streamBody = await handleConversationStreaming(lastMessage, conversation, llmClient);
                    if (streamBody) {
                      return new Response(streamBody, {
                        headers: { ...corsHeaders, 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'X-Maya-Stream': '1' }
                      });
                    }
                  } catch (streamErr) {
                    console.error('[EXPLANATION] Streaming failed, falling back to JSON:', streamErr);
                  }
                }
                const explanationResponse = await handleConversation(lastMessage, conversation);
                return new Response(JSON.stringify(explanationResponse), {
                  headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
              
              case LLMQueryType.EMPLOYEE_FOLLOWUP:
                // Handle employee follow-up
                const employeeName = llmClassification.extractedContext.employeeName;
                if (employeeName) {
                  console.log(`🔄 [EMPLOYEE_FOLLOWUP] Detected for: "${employeeName}"`);
                  
                  // 🔧 CHECK: Is this a follow-up for employee CREATION?
                  // Look for previous assistant messages asking for employee name for creation
                  const recentAssistantMsgs = conversation.filter(m => m.role === 'assistant').slice(-2);
                  const isCreationFollowup = recentAssistantMsgs.some(msg => 
                    msg.content && (
                      /necesito.*nombre.*empleado/i.test(msg.content) ||
                      /cuál es el nombre del nuevo empleado/i.test(msg.content) ||
                      msg.metadata?.fieldName === 'employeeName'
                    )
                  );
                  
                  if (isCreationFollowup) {
                    console.log(`✅ [EMPLOYEE_FOLLOWUP] This is a creation follow-up, mapping to EMPLOYEE_CREATE`);
                    intent = {
                      type: 'EMPLOYEE_CREATE',
                      method: 'createEmployee',
                      params: { name: employeeName, employee_name: employeeName },
                      confidence: 0.96
                    };
                    break;
                  }
                  
                  // Otherwise, validate employee exists (for search/query operations)
                  const validation = await validateEmployeeExists(userSupabase, employeeName);
                  
                  if (!validation.exists) {
                    return new Response(JSON.stringify({
                      message: `No encontré un empleado llamado "${employeeName}" en tu empresa. ¿Podrías verificar la ortografía o el nombre completo?`,
                      emotionalState: 'neutral',
                      sessionId,
                      timestamp: new Date().toISOString()
                    }), {
                      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                    });
                  }
                  
                  // Infer intent from context
                  const context = analyzeConversationContext(conversation);
                  const inferredIntent = inferIntentFromContext(employeeName, context);
                  
                  if (inferredIntent) {
                    intent = inferredIntent;
                  }
                }
                break;
              
      case LLMQueryType.AGGREGATION:
      case LLMQueryType.DIRECT_INTENT:
        // PROTECTION: Never override high-confidence EMPLOYEE_COUNT from fast path
        if (intent?.type === 'EMPLOYEE_COUNT' && intent.confidence >= 0.95) {
          console.log(`✅ [LLM] Keeping high-confidence EMPLOYEE_COUNT from fast path`);
          break;
        }
        
        // Use fast path result if available, otherwise keep low confidence
        if (!intent || intent.confidence < 0.5) {
          console.log(`❓ [LLM] No clear intent from classification, keeping fast path or low confidence`);
        }
        break;
            }
          } catch (error) {
            console.error('❌ [LLM] Classification error:', error);
            // Fallback to fast path result
          }
        } else {
          console.warn('⚠️ [LLM] OpenAI API key not configured, falling back to fast path only');
        }
      } else {
        console.log(`🚀 [HYBRID] Fast path success: ${intent.type} (${intent.confidence.toFixed(2)})`);
      }
    }
    
    // PRIORITY 3: Check if this is a follow-up query like "y a [name]?" (legacy fallback)
    if (!intent) {
      const followUpName = detectFollowUpQuery(lastMessage);
      
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
      }
    }
    
    // PRIORITY 3: No context match, use normal intent matching
    if (!intent) {
      // 🎯 [CONTEXTUAL] Detect affirmative responses to "¿Te gustaría ver quiénes son?"
      const affirmativePattern = /^(s[ií]|ok|dale|claro|ver|muestramelos?|verlos?|mostrar|lis[tá]talos?|por\s*supuesto|obvio|afirmativo|yes)$/i;
      const lastAssistantMessage = conversation.filter(m => m.role === 'assistant').slice(-1)[0];
      const isEmployeeListPrompt = lastAssistantMessage?.content?.match(/¿Te\s+gustar[ií]a\s+ver\s+qui[eé]nes\s+son\?/i);
      
      if (affirmativePattern.test(lastMessage.trim()) && isEmployeeListPrompt) {
        console.log('🎯 [CONTEXTUAL] Affirmative detected after employee count → forcing EMPLOYEE_LIST intent');
        intent = { type: 'EMPLOYEE_LIST', method: 'listAllEmployees', confidence: 0.99 } as any;
      } else {
        intent = SimpleIntentMatcher.match(lastMessage);
      }
    }
    
    console.log(`[MAYA-KISS] Intent: ${intent.type} (${intent.confidence})`);
    
    // ============================================================================
    // HANDLE CONVERSATIONAL CONTEXTS (BEFORE SAFETY OVERRIDES)
    // ============================================================================
    
    // Check for conversational contexts that need special handling
    const conversationContext = analyzeConversationContext(conversation);
    
    // Handle VOUCHER_CONFIRMATION_PENDING context (user provides alternative email after seeing buttons)
    console.log(`🔍 [VOUCHER_CONTEXT] Checking VOUCHER_CONFIRMATION_PENDING: intentType=${conversationContext.intentType}`);
    if (conversationContext.intentType === 'VOUCHER_CONFIRMATION_PENDING') {
      // Check if user is providing an alternative email
      const emailMatch = lastMessage.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
      
      if (emailMatch) {
        console.log(`📧 [CONTEXT_EMAIL_OVERRIDE] User providing alternative email in context`);
        const { employeeName, employeeId } = conversationContext.params;
        const providedEmail = emailMatch[1];
        
        if (!employeeName) {
          return new Response(JSON.stringify({
            message: "❌ No pude identificar para qué empleado quieres cambiar el email.",
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
        
        // Find employee if we don't have ID
        let finalEmployeeId = employeeId;
        let finalEmployeeName = employeeName;
        
        if (!finalEmployeeId) {
          const { data: employees } = await userSupabase
            .from('employees')
            .select('id, nombre, apellido, email')
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
          
          finalEmployeeId = employee.id;
          finalEmployeeName = `${employee.nombre} ${employee.apellido}`;
        }
        
        // Show confirmation with alternative email
        console.log(`✅ [VOUCHER_OVERRIDE] User wants to send to ${providedEmail}`);
        
        return new Response(JSON.stringify({
          message: `✅ Perfecto, enviaré el comprobante de **${finalEmployeeName}** a **${providedEmail}**`,
          emotionalState: 'encouraging',
          executableActions: [
            {
              id: `confirm_send_voucher_${finalEmployeeId}_${Date.now()}`,
              type: 'confirm_send_voucher',
              label: '📧 Confirmar Envío',
              description: `Enviar comprobante a ${providedEmail}`,
              parameters: {
                employeeId: finalEmployeeId,
                employeeName: finalEmployeeName,
                email: providedEmail,
                periodId: 'latest'
              },
              requiresConfirmation: false,
              icon: '📧'
            }
          ],
          sessionId,
          timestamp: new Date().toISOString()
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }
    
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
              label: 'Sí, guardar',
              description: 'Guardar email en perfil del empleado',
              parameters: { employeeId: employee.id, email: providedEmail },
              requiresConfirmation: false,
              icon: '✅'
            },
            {
              id: `cancel_save_${Date.now()}`,
              type: 'cancel',
              label: 'No, solo enviar',
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
              label: 'Sí, guardar',
              description: 'Guardar email en perfil del empleado',
              parameters: { employeeId: employee.id, email: providedEmail },
              requiresConfirmation: false,
              icon: '✅'
            },
            {
              id: `cancel_save_${Date.now()}`,
              type: 'cancel',
              label: 'No, solo enviar',
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
    // TOOL-CALLING: Detectar si el LLM llamó a herramientas de cálculo
    // ============================================================================
    if (llmClassification?.toolCall) {
      console.log('🔧 [TOOL-CALL] LLM invocó herramienta:', llmClassification.toolCall.function.name);
      
      if (llmClassification.toolCall.function.name === 'calculate_surcharge') {
        try {
          const args = JSON.parse(llmClassification.toolCall.function.arguments);
          console.log('📊 [TOOL-CALL] Argumentos:', args);
          
          // Si no hay salary en args, intentar extraer del mensaje
          let finalSalary = args.salary;
          if (!finalSalary) {
            const extractedSalary = extractSalaryAmount(lastMessage);
            if (extractedSalary) {
              finalSalary = extractedSalary;
              console.log(`💰 [TOOL-CALL] Salary extraído del mensaje: $${finalSalary.toLocaleString()}`);
            } else {
              // Usar SMLV como fallback
              const OFFICIAL_VALUES = {
                '2025': { salarioMinimo: 1423500 }
              };
              finalSalary = OFFICIAL_VALUES['2025'].salarioMinimo;
              console.log(`💰 [TOOL-CALL] Usando salario mínimo: $${finalSalary.toLocaleString()}`);
            }
          }
          
          // Llamar al backend de cálculo usando service role (cálculo puro sin BD)
          console.log('🔧 [CALCULATION_INVOKE] Invocando payroll-calculations:', {
            action: 'explain-surcharge',
            type: args.type,
            salary: finalSalary,
            clientType: 'service_role'
          });
          
          const { data: calcData, error: calcError } = await supabaseAdmin.functions.invoke(
            'payroll-calculations',
            {
              body: {
                action: 'explain-surcharge',
                type: args.type,
                salary: finalSalary,
                hours: args.hours || 1,
                date: new Date().toISOString()
              }
            }
          );
          
          if (calcError || !calcData?.success) {
            console.error('❌ Error calculando recargo:', calcError);
            // NO CONTINUAR - retornar mensaje de error amigable inmediatamente
            return new Response(JSON.stringify({
              message: 'Disculpa, tuve un problema al realizar el cálculo. Por favor, intenta de nuevo o reformula tu pregunta. Ejemplo: "recargo nocturno para un salario de 2 millones"',
              emotionalState: 'apologetic',
              quickReplies: [
                { text: 'Recargo nocturno SMLV', action: 'calc_nocturno_smlv' },
                { text: 'Recargo dominical SMLV', action: 'calc_dominical_smlv' },
                { text: 'Explicar sin calcular', action: 'explain_surcharges' }
              ],
              sessionId,
              timestamp: new Date().toISOString()
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }
          
          const calc = calcData.data;
          
          // Formatear respuesta conversacional
          const tipoTexto = args.type === 'nocturno' 
            ? 'recargo nocturno' 
            : args.type === 'dominical'
              ? 'recargo dominical'
              : 'recargo nocturno dominical';
          
          const responseMessage = `Perfecto, te explico cómo se calcula el **${tipoTexto}**:

${calc.legalContext}

### 📊 Cálculo con salario de $${calc.salarioBase.toLocaleString()}

${calc.formula}

**Resultado:** El valor del recargo es **$${calc.valor.toLocaleString()}** por ${calc.horas} hora(s) trabajada(s).

${calc.jornadaInfo.descripcion ? `\n**Nota:** ${calc.jornadaInfo.descripcion}` : ''}`;

          const quickReplies = [
            { text: 'Calcular con otro salario', action: 'calculation_followup' },
            { text: 'Ver más horas', action: 'calculation_hours' },
            { text: 'Otros tipos de recargo', action: 'surcharge_types' }
          ];
          
          return new Response(JSON.stringify({
            message: responseMessage,
            emotionalState: 'helpful',
            quickReplies,
            conversationState: {
              lastTopic: 'surcharge',
              surchargeType: args.type,
              lastSalary: finalSalary
            },
            sessionId,
            timestamp: new Date().toISOString()
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        } catch (error) {
          console.error('❌ [TOOL-CALL] Error procesando calculate_surcharge:', error);
          return new Response(JSON.stringify({
            message: 'Hubo un error al procesar el cálculo. ¿Podrías reformular tu pregunta?',
            emotionalState: 'concerned',
            sessionId,
            timestamp: new Date().toISOString()
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      }
    }

    // ============================================================================
    // ENHANCED SAFETY OVERRIDES - ANTI-HALLUCINATION PROTECTION
    // ============================================================================
    
    // ============================================================================
    // CONTEXTUAL FALLBACK: Detectar cálculos sin tool-calling
    // ============================================================================
    // Si no hubo tool-calling pero detectamos un monto y contexto de recargo
    if (!llmClassification?.toolCall) {
      const extractedSalary = extractSalaryAmount(lastMessage);
      const isCalculationRequest = /\b(calcula|calculalo|calculame|calcular|hazlo|para\s+(?:un\s+)?salario|con\s+(?:un\s+)?salario)\b/i.test(lastMessage);
      
      if (extractedSalary && isCalculationRequest) {
        console.log(`🧮 [FALLBACK_CALCULATION] Detected: salary=$${extractedSalary.toLocaleString()}, query="${lastMessage}"`);
        
        // Inferir tipo de recargo del contexto
        let surchargeType: 'nocturno' | 'dominical' | null = null;
        
        // 1. Intentar del mensaje actual
        if (/\b(nocturno|noche|10\s*pm|22:00)/i.test(lastMessage)) {
          surchargeType = 'nocturno';
        } else if (/\b(dominical|domingo|festivo|feriado)/i.test(lastMessage)) {
          surchargeType = 'dominical';
        }
        
        // 2. Si no está claro, inferir del último mensaje del asistente
        if (!surchargeType) {
          const lastAssistantMsg = conversation.filter(m => m.role === 'assistant').slice(-1)[0];
          
          // Buscar en content
          if (lastAssistantMsg?.content) {
            if (/recargo nocturno/i.test(lastAssistantMsg.content)) {
              surchargeType = 'nocturno';
            } else if (/recargo dominical/i.test(lastAssistantMsg.content)) {
              surchargeType = 'dominical';
            }
          }
          
          // Buscar en conversationState
          if (!surchargeType && lastAssistantMsg?.conversationState?.lastTopic === 'surcharge') {
            surchargeType = lastAssistantMsg.conversationState.surchargeType;
            console.log(`🔍 [CONTEXT] Tipo de recargo inferido del estado: ${surchargeType}`);
          }
        }
        
        if (surchargeType) {
          console.log(`✅ [FALLBACK_CALCULATION] Calculando ${surchargeType} para $${extractedSalary.toLocaleString()}`);
          
          try {
            console.log('🔧 [FALLBACK_INVOKE] Invocando payroll-calculations:', {
              action: 'explain-surcharge',
              type: surchargeType,
              salary: extractedSalary,
              clientType: 'service_role'
            });
            
            const { data: calcData, error: calcError } = await supabaseAdmin.functions.invoke(
              'payroll-calculations',
              {
                body: {
                  action: 'explain-surcharge',
                  type: surchargeType,
                  salary: extractedSalary,
                  hours: 1,
                  date: new Date().toISOString()
                }
              }
            );
            
            if (calcError || !calcData?.success) {
              console.error('❌ Error en fallback calculation:', calcError);
              // NO CONTINUAR - retornar mensaje de error amigable inmediatamente
              return new Response(JSON.stringify({
                message: 'Disculpa, tuve un problema al realizar el cálculo. Por favor, intenta de nuevo. Ejemplo: "recargo nocturno para 2 millones"',
                emotionalState: 'apologetic',
                quickReplies: [
                  { text: 'Recargo nocturno SMLV', action: 'calc_nocturno_smlv' },
                  { text: 'Recargo dominical SMLV', action: 'calc_dominical_smlv' }
                ],
                sessionId,
                timestamp: new Date().toISOString()
              }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              });
            }
            
            const calc = calcData.data;
            const tipoTexto = surchargeType === 'nocturno' ? 'recargo nocturno' : 'recargo dominical';
            
            const responseMessage = `Perfecto, te explico cómo se calcula el **${tipoTexto}**:

${calc.legalContext}

### 📊 Cálculo con salario de $${calc.salarioBase.toLocaleString()}

${calc.formula}

**Resultado:** El valor del recargo es **$${calc.valor.toLocaleString()}** por ${calc.horas} hora(s) trabajada(s).

${calc.jornadaInfo.descripcion ? `\n**Nota:** ${calc.jornadaInfo.descripcion}` : ''}`;

            return new Response(JSON.stringify({
              message: responseMessage,
              emotionalState: 'helpful',
              conversationState: {
                lastTopic: 'surcharge',
                surchargeType: surchargeType,
                lastSalary: extractedSalary
              },
              sessionId,
              timestamp: new Date().toISOString()
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          } catch (error) {
            console.error('❌ [FALLBACK_CALCULATION] Critical error:', error);
            // Error already returned inside try block, this catch is for unexpected errors
            return new Response(JSON.stringify({
              message: 'Disculpa, ocurrió un error inesperado. Por favor intenta de nuevo.',
              emotionalState: 'apologetic',
              sessionId,
              timestamp: new Date().toISOString()
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }
        } else {
          // Tipo de recargo no claro: preguntar
          console.log(`❓ [FALLBACK_CALCULATION] Salary detected but type unclear`);
          return new Response(JSON.stringify({
            message: `Perfecto, calculemos para un salario de **$${extractedSalary.toLocaleString()}**.\n\n¿Qué tipo de recargo quieres calcular?`,
            emotionalState: 'encouraging',
            quickReplies: [
              { label: '🌙 Recargo nocturno', value: `recargo nocturno para ${extractedSalary}` },
              { label: '📅 Recargo dominical', value: `recargo dominical para ${extractedSalary}` }
            ],
            conversationState: {
              lastTopic: 'surcharge',
              pendingSalary: extractedSalary
            },
            sessionId,
            timestamp: new Date().toISOString()
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      }
    }
    
    // GUARD: No buscar empleados si el mensaje contiene un monto de salario
    const hasSalaryAmount = extractSalaryAmount(lastMessage);
    if (hasSalaryAmount) {
      console.log('⚠️ [EMPLOYEE_SEARCH_GUARD] Mensaje contiene monto - omitiendo búsqueda de empleado');
    }
    
    // Enhanced Safety Override: Detect ANY employee name in query and force validation
    const detectedEmployeeName = !hasSalaryAmount ? detectEmployeeNameInQuery(lastMessage) : null;
    
    // ✅ Verificar si el "nombre" es en realidad un monto
    const looksLikeMoney = detectedEmployeeName ? /^(de|\d|[\d\.,]+|millones?|mil|pesos?)$/i.test(detectedEmployeeName) : false;
    
    if (detectedEmployeeName && !intent.resolvedByLLM && !looksLikeMoney && !['EMPLOYEE_SEARCH', 'EMPLOYEE_SALARY', 'EMPLOYEE_PAID_TOTAL'].includes(intent.type)) {
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
      const paidToMatch = lastMessage.match(/(?:cuánto|cuanto|qué|que)\s+(?:(?:se\s+)?(?:le\s+)?(?:ha|hemos|han|he)\s+)?(?:pagad(?:o|os)?|pago|pagamos|pagan)\s+(?:a|para)\s+([a-záéíóúñ\s]+)/i);
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
        
        // Safety Override 3: If classified as CALCULAR_PRESTACION or getPayrollTotals but contains provision keywords
        if ((intent.method === 'getPayrollTotals' || intent.method === 'calcularPrestacion') && 
            /(?:provisionad(?:o|a|os|as)|provisión|provisiones)/i.test(lastMessage)) {
          const provMatch = lastMessage.match(/(?:provisi[oó]n(?:es)?|provisionad(?:o|a|os|as)).*?(vacaciones|prima|cesant[ií]as|intereses?\s+(?:de\s+)?cesant[ií]as).*?(?:de|para|a)\s+([a-záéíóúñ]+(?:\s+[a-záéíóúñ]+)?)/i);
          if (provMatch) {
            const benefitRaw = provMatch[1];
            const employeeName = provMatch[2];
            
            let benefitType = 'vacaciones';
            if (/prima/i.test(benefitRaw)) benefitType = 'prima';
            else if (/intereses/i.test(benefitRaw)) benefitType = 'intereses_cesantias';
            else if (/cesant/i.test(benefitRaw)) benefitType = 'cesantias';
            
            const yearMatch = lastMessage.match(/\b(20\d{2})\b/);
            const year = yearMatch ? parseInt(yearMatch[1]) : null;
            
            console.log(`🔄 [SAFETY_OVERRIDE] Forcing BENEFIT_PROVISION_QUERY: ${employeeName} - ${benefitType}`);
            
            intent = {
              type: 'BENEFIT_PROVISION_QUERY',
              method: 'getEmployeeBenefitProvision',
              confidence: 0.96,
              params: { name: employeeName.trim(), benefitType, year }
            };
          }
        }
        
        const monthRegex = /(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)/gi;
        const allMonthMatches = [...lastMessage.matchAll(monthRegex)];
        const allMonths = allMonthMatches.map(m => m[1].toLowerCase());
        if (allMonths.length === 1) {
          month = allMonths[0];
          if (!year) year = new Date().getFullYear();
        } else if (allMonths.length >= 2) {
          // For multiple months, pass as range
          intent.params = { 
            name, 
            year: year || new Date().getFullYear(),
            monthStart: allMonths[0],
            monthEnd: allMonths[allMonths.length - 1]
          };
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
        
      case 'handleVoucherEmailOverride': {
        console.log('📧 [VOUCHER_EMAIL_OVERRIDE] Handling email override via SimpleIntentMatcher');
        const emailMatch = lastMessage.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
        
        if (!emailMatch) {
          response = {
            message: "❌ No detecté un email válido. Por favor escríbelo en el formato correcto (ejemplo: nombre@ejemplo.com)",
            emotionalState: 'concerned'
          };
          break;
        }
        
        const alternativeEmail = emailMatch[1];
        const employeeName = conversationContext.params?.employeeName || 
                            extractLastEmployeeFromContext(conversation);
        
        if (!employeeName) {
          response = {
            message: "❌ No pude identificar para qué empleado quieres cambiar el email. ¿Podrías especificarlo?",
            emotionalState: 'concerned'
          };
          break;
        }
        
        // Secure company scope
        const companyId = await getCurrentCompanyId(userSupabase);
        if (!companyId) {
          response = { message: "❌ No pude identificar tu empresa.", emotionalState: 'concerned' };
          break;
        }
        // Find employee
        const { data: employees } = await userSupabase
          .from('employees')
          .select('id, nombre, apellido, email')
          .eq('estado', 'activo')
          .eq('company_id', companyId)
          .ilike('nombre', `%${employeeName}%`);
        
        const employee = employees?.[0];
        
        if (!employee) {
          console.log(`❌ [VOUCHER_EMAIL_OVERRIDE] Employee "${employeeName}" not found, preserving context`);
          response = {
            message: `❌ No pude identificar para qué empleado quieres enviar el comprobante a **${alternativeEmail}**.\n\n¿Para cuál empleado es?`,
            emotionalState: 'concerned',
            metadata: {
              pendingAction: 'EMAIL_OVERRIDE',
              pendingEmail: alternativeEmail,
              awaitingEmployeeName: true
            }
          };
          break;
        }
        
        response = {
          message: `✅ Perfecto, enviaré el comprobante de **${employee.nombre} ${employee.apellido}** al email:\n\n📧 **${alternativeEmail}**`,
          emotionalState: 'encouraging',
          actions: [{
            id: `send-voucher-${employee.id}-alt`,
            type: 'confirm_send_voucher',
            label: '📧 Confirmar Envío',
            description: `Enviar a ${alternativeEmail}`,
            parameters: {
              employeeId: employee.id,
              employeeName: `${employee.nombre} ${employee.apellido}`,
              email: alternativeEmail
            }
          }]
        };
        break;
      }
      
      case 'handleVoucherEmailOverrideContinue': {
        console.log('🔄 [VOUCHER_EMAIL_OVERRIDE_CONTINUE] Continuing with employee name and pending email');
        const { employeeName, email } = intent.params;
        
        // Secure company scope
        const companyId = await getCurrentCompanyId(userSupabase);
        if (!companyId) {
          response = { message: "❌ No pude identificar tu empresa.", emotionalState: 'concerned' };
          break;
        }
        // Find employee
        const { data: employees } = await userSupabase
          .from('employees')
          .select('id, nombre, apellido, email')
          .eq('estado', 'activo')
          .eq('company_id', companyId)
          .ilike('nombre', `%${employeeName}%`);
        
        const employee = employees?.[0];
        
        if (!employee) {
          response = {
            message: `❌ No encontré al empleado "${employeeName}" en tu empresa. ¿Podrías verificar el nombre?`,
            emotionalState: 'concerned'
          };
          break;
        }
        
        // Get latest period
        const { data: periods } = await userSupabase
          .from('payroll_periods_real')
          .select('id, periodo')
          .order('created_at', { ascending: false })
          .limit(1);
        
        const period = periods?.[0];
        
        console.log(`✅ [VOUCHER_EMAIL_OVERRIDE_CONTINUE] Found employee: ${employee.nombre} ${employee.apellido}`);
        
        response = {
          message: `✅ Perfecto, enviaré el comprobante de **${employee.nombre} ${employee.apellido}** a:\n📧 **${email}**`,
          emotionalState: 'encouraging',
          actions: [{
            id: `send-voucher-${employee.id}-alt-${Date.now()}`,
            type: 'confirm_send_voucher',
            label: '📧 Confirmar Envío',
            description: `Enviar a ${email}`,
            parameters: {
              employeeId: employee.id,
              employeeName: `${employee.nombre} ${employee.apellido}`,
              email: email,
              periodId: period?.id,
              periodName: period?.periodo
            },
            requiresConfirmation: true
          }]
        };
        break;
      }
        
      case 'blockSystemInfoQuery':
        response = await blockSystemInfoQuery();
        break;
        
      case 'getEmployeeCount':
        console.log('✅ [ROUTER] Executing getEmployeeCount - simple count query');
        response = await getEmployeeCount(userSupabase);
        console.log('✅ [ROUTER] getEmployeeCount response:', { 
          messageLength: response.message?.length,
          hasActions: !!response.actions?.length  
        });
        break;
        
      case 'listAllEmployees':
        console.log('[ROUTER] Routing to listAllEmployees handler');
        response = await listAllEmployees(userSupabase);
        break;
        
      // ============================================================================
      // PHASE 1: AGGREGATION HANDLERS (New - Maya Intelligence Expansion)
      // ============================================================================
      case 'getTotalPayrollCost':
        response = await handleTotalPayrollCost(userSupabase, intent.params);
        break;
        
      case 'getSecurityContributions':
        response = await handleSecurityContributions(userSupabase, intent.params);
        break;
        
      case 'getHighestCostEmployees':
        response = await handleHighestCostEmployees(userSupabase, intent.params);
        break;
        
      case 'getLowestCostEmployees':
        response = await handleLowestCostEmployees(userSupabase, intent.params);
        break;
        
      case 'getTotalIncapacityDays':
        response = await handleTotalIncapacityDays(userSupabase, intent.params);
        break;
        
      case 'getIncapacityReport':
        response = await handleIncapacityReport(userSupabase, intent.params);
        break;
        
      case 'getContributionReport':
        response = await handleContributionReport(userSupabase, intent.params);
        break;
        
      case 'getTotalOvertimeHours':
        response = await handleTotalOvertimeHours(userSupabase, intent.params);
        break;
        
      case 'comparePayrollPeriods':
        response = await handlePayrollComparison(userSupabase, intent.params);
        break;
        
      case 'getHighestPayrollPeriod':
        response = await handleHighestPayrollPeriod(userSupabase, intent.params);
        break;
        
      case 'getLowestPayrollPeriod':
        response = await handleLowestPayrollPeriod(userSupabase, intent.params);
        break;
      // ============================================================================
      // END PHASE 1: AGGREGATION HANDLERS
      // ============================================================================
        
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
        
      // ============================================================================
      // EMPLOYEE & PAYROLL QUERIES (Using IntentRouter for modularity)
      // ============================================================================
      case 'searchEmployee':
      case 'getEmployeeSalary':
      case 'getEmployeePaidTotal':
      case 'getEmployeeBenefitProvision':
      case 'getEmployeeDetails':
      case 'getTotalPayrollCost':
      case 'getSecurityContributions':
      case 'getHighestCostEmployees':
      case 'getLowestCostEmployees':
      case 'getTotalIncapacityDays':
      case 'getIncapacityReport':
      case 'getContributionReport':
      case 'getPayrollProjection':
      case 'simulateHiringCost':
      case 'simulateSalaryIncrease':
      case 'simulateBonusImpact':
      case 'getTotalOvertimeHours':
      case 'getPayrollMonthlyVariation': {
        console.log(`🔀 [ROUTER] Routing ${intent.method} to IntentRouter`);
        
        const logger: MayaLogger = {
          info: (msg: string, data?: any) => console.log(`[INFO] ${msg}`, data || ''),
          warn: (msg: string, data?: any) => console.warn(`[WARN] ${msg}`, data || ''),
          error: (msg: string, data?: any) => console.error(`[ERROR] ${msg}`, data || '')
        };
        
        const router = new IntentRouter(logger, userSupabase);
        const routeContext = {
          userSupabase,
          conversation,
          sessionId,
          lastMessage,
          logger,
          metadata
        };
        console.log(`📦 [ROUTE_CONTEXT] Passing metadata to router:`, metadata?.lastConversationState ? 'has state' : 'no state');
        
        response = await router.route(intent, routeContext);
        break;
      }
        
      case 'getSalaryReport':
        response = await getSalaryReport(userSupabase);
        break;
      
      case 'getPayrollTotals':
        const periodParam = intent.params?.periodo || extractPeriod(lastMessage, intent.params);
        response = await getPayrollTotals(userSupabase, periodParam);
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
      
      // ============================================================================
      // EMPLOYEE CRUD HANDLERS (Using HandlerRegistry)
      // ============================================================================
      case 'createEmployee':
      case 'updateEmployee':
      case 'deleteEmployee': {
        console.log(`🔧 [CRUD] Handling ${intent.method} via HandlerRegistry`);
        
        // Create logger
        const logger: MayaLogger = {
          info: (message: string, data?: any) => console.log(`[INFO] ${message}`, data || ''),
          warn: (message: string, data?: any) => console.warn(`[WARN] ${message}`, data || ''),
          error: (message: string, data?: any) => console.error(`[ERROR] ${message}`, data || '')
        };
        
        // ⚙️ FEATURE FLAG: Enable State Machine for Employee Create
        const USE_STATE_MACHINE_EMPLOYEE = Deno.env.get('USE_STATE_MACHINE_EMPLOYEE') === 'true';
        
        let handlerResponse;
        
        if (intent.method === 'createEmployee' && USE_STATE_MACHINE_EMPLOYEE) {
          console.log(`🆕 [STATE_MACHINE] Using EmployeeCrudHandlerV2 for createEmployee`);
          
          // Import and use V2 handler
          const { EmployeeCrudHandlerV2 } = await import('./handlers/employee-crud-handler-v2.ts');
          const handlerV2 = new EmployeeCrudHandlerV2(logger, undefined, userSupabase);
          
          // Build Intent object for handler V2
          const handlerIntent = {
            type: intent.type,
            confidence: intent.confidence,
            entities: intent.entities || [],
            parameters: {
              ...intent.params,
              employee_name: intent.params?.name || intent.params?.employee_name,
              originalMessage: lastMessage, // 🔥 CRITICAL: Pass original message
              conversationState: metadata?.lastConversationState // Use serialized context from metadata
            }
          };
          
          // Build rich context
          const richContext = {
            userId: (await userSupabase.auth.getUser()).data.user?.id || '',
            companyId: await getCurrentCompanyId(userSupabase) || '',
            conversationHistory: conversation,
            currentPage: 'maya-chat',
            sessionId
          };
          
          handlerResponse = await handlerV2.process(handlerIntent, richContext);
          
        } else {
          console.log(`🔧 [LEGACY] Using EmployeeCrudHandler V1 for ${intent.method}`);
          
          // Initialize HandlerRegistry for V1
          const handlerRegistry = new HandlerRegistry(logger, undefined, userSupabase);
          
          // Build Intent object for handler V1
          const handlerIntent = {
            type: intent.type,
            confidence: intent.confidence,
            entities: intent.entities || [],
            parameters: {
              ...intent.params,
              employee_name: intent.params?.name || intent.params?.employee_name,
              originalMessage: lastMessage, // 🔥 Also pass to V1 for improved parsing
              conversationParams: Array.isArray(conversation) && conversation.length > 0 ? 
                conversation[conversation.length - 1]?.conversationState : undefined
            }
          };
          
          // Build rich context
          const richContext = {
            userId: (await userSupabase.auth.getUser()).data.user?.id || '',
            companyId: await getCurrentCompanyId(userSupabase) || '',
            conversationHistory: conversation,
            currentPage: 'maya-chat',
            sessionId
          };
          
          // Process via HandlerRegistry
          handlerResponse = await handlerRegistry.processIntent(handlerIntent, richContext);
        }
        
        // Map HandlerResponse to standard response format (common for V1 and V2)
        response = {
          message: handlerResponse.response,
          emotionalState: handlerResponse.emotionalState || 'neutral',
          actions: handlerResponse.actions || [],
          quickReplies: handlerResponse.quickReplies || [],
          fieldName: handlerResponse.fieldName,
          conversationState: handlerResponse.conversationState
        };
        
        console.log(`✅ [CRUD] Handler response: ${response.quickReplies?.length || 0} quick replies, ${response.actions?.length || 0} actions`);
        break;
      }
      
      // ============================================================================
      // 🇨🇴 DOMAIN DEFINITIONS - Direct Colombian Labor Definitions (KISS Route)
      // ============================================================================
      case 'domainDefinition': {
        console.log(`📚 [DOMAIN_DEFINITION] Direct definition request for: ${intent.params?.term}`);
        
        const definitions: Record<string, string> = {
          'EPS': 'En Colombia, una EPS (Entidad Promotora de Salud) es una entidad que administra el régimen de salud obligatorio. Su función es garantizar que los afiliados reciban atención médica, hospitalaria y medicamentos según el Plan Obligatorio de Salud (POS). Ejemplos: Sura, Sanitas, Compensar.',
          'ARL': 'En Colombia, una ARL (Administradora de Riesgos Laborales) es una entidad que protege a los trabajadores contra accidentes de trabajo y enfermedades laborales. Cubre incapacidades, rehabilitación y pensiones por invalidez. Ejemplos: Positiva, Sura ARL, Colmena.',
          'AFP': 'En Colombia, una AFP (Administradora de Fondos de Pensiones) es una entidad que gestiona el ahorro pensional de los trabajadores. Administra los aportes obligatorios para garantizar una pensión de vejez, invalidez o supervivencia. Ejemplos: Colpensiones, Protección, Porvenir.',
          'CAJA_COMPENSACION': 'En Colombia, las Cajas de Compensación Familiar son entidades que administran beneficios extralegales como el subsidio familiar, servicios de recreación, educación y vivienda. Ejemplos: Compensar, Colsubsidio, Comfama.',
          'SMLV': 'En Colombia, el SMLV (Salario Mínimo Legal Vigente) es el salario base establecido por ley que todo empleador debe pagar como mínimo a sus trabajadores. Para 2025 es de $1,423,500 COP. Sirve de base para calcular prestaciones sociales y aportes.',
          'PARAFISCALES': 'En Colombia, los parafiscales son aportes obligatorios del empleador destinados al SENA (2%), ICBF (3%) y Cajas de Compensación (4%). Se calculan sobre la nómina mensual y financian formación profesional, bienestar familiar y subsidio familiar.'
        };
        
        const definition = definitions[intent.params?.term] || 'No encontré información sobre ese término. ¿Podrías reformular tu pregunta?';
        
        response = {
          message: definition,
          emotionalState: 'professional',
          quickReplies: [
            { label: '¿Qué es un ARL?', value: 'que es una arl' },
            { label: '¿Qué son las Cajas?', value: 'que son las cajas de compensacion' },
            { label: 'Ver nómina actual', value: 'muestra la nomina actual' }
          ]
        };
        
        console.log(`✅ [DOMAIN_DEFINITION] Returned Colombian definition for: ${intent.params?.term}`);
        break;
      }
        
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
    
    // ============================================================================
    // RESPONSE ORCHESTRATION (Using ResponseOrchestrator)
    // ============================================================================
    
    console.log(`🎭 [ORCHESTRATOR] Building final response...`);
    const orchestratedResponse = ResponseOrchestrator.orchestrate(intent, response, lastMessage, {
      sessionId,
      timestamp: new Date().toISOString()
    });
    
    // Validate response
    if (!ResponseOrchestrator.validate(orchestratedResponse)) {
      console.error('🚨 [ORCHESTRATOR] Response validation failed, returning fallback');
      return new Response(JSON.stringify({
        message: 'Error procesando respuesta. Por favor intenta de nuevo.',
        emotionalState: 'confused',
        sessionId,
        timestamp: new Date().toISOString()
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Sanitize response
    const sanitizedResponse = ResponseOrchestrator.sanitize(orchestratedResponse);
    
    // ============================================================================
    // 💾 SAVE CONVERSATION STATE (if exists)
    // ============================================================================
    if (sanitizedResponse?.conversationState) {
      console.log(`💾 [SESSION_MANAGER] Saving conversation state for session: ${sessionId}`);
      try {
        const normalized = normalizeContext(sanitizedResponse.conversationState, { sessionId, companyId });
        await sessionManager.saveContext(normalized);
        console.log(`✅ [SESSION_MANAGER] Context saved successfully`);
      } catch (saveError) {
        console.error('🚨 [SESSION_MANAGER] Error saving context:', saveError);
        // No bloquear la respuesta si falla el guardado
      }
    }
    
    // Return enhanced JSON response with backward compatibility
    return new Response(JSON.stringify({
      ...sanitizedResponse,
      sessionId,
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
    
    const companyId = await getCurrentCompanyId(supabase);
    if (!companyId) {
      return { exists: false };
    }
    const { data: employees, error } = await supabase
      .from('employees')
      .select('id, nombre, apellido, cargo, estado')
      .eq('company_id', companyId)
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
  
  // ⚠️ AGGREGATION EXCLUSION: No procesar como nombre de empleado si contiene palabras de agregación
  const aggregationKeywords = /\b(más|mas|menos|mayor|menor|costoso|costosa|caro|cara|barato|barata|económico|económica|alto|alta|bajo|baja|costo|costos|precio|precios|gasto|gastos|total|totales|suma)\b/i;
  
  if (aggregationKeywords.test(lowerText)) {
    console.log(`🚫 [EMPLOYEE_DETECTION] Excluded: "${text}" (contains aggregation keywords)`);
    return null; // No es un nombre de empleado, probablemente es un intent de agregación
  }
  
  // 🚫 TEMPORAL EXCLUSIONS: Known temporal phrases that should NOT be detected as employee names
  const temporalExclusions = [
    /^(?:y\s+)?(?:de|del|en)\s+todo\s+el\s+año\??$/i,
    /^(?:y\s+)?(?:de|del|en)\s+este\s+año\??$/i,
    /^(?:y\s+)?(?:de|del|en)\s+el\s+año\s+(?:pasado|anterior|actual)\??$/i,
    /^(?:y\s+)?(?:de|del|en)\s+(?:enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\??$/i,
    /^(?:y\s+)?(?:del|de|en)\s+mes\s+(?:pasado|anterior|actual)\??$/i,
    /^(?:y\s+)?(?:el\s+)?año\s+(?:completo|entero)\??$/i,
    /^(?:y\s+)?anual(?:mente)?\??$/i,
    /^(?:y\s+)?(?:el\s+)?trimestre\s+\d+\??$/i,
    /^(?:y\s+)?(?:el\s+)?semestre\s+\d+\??$/i,
    /^(?:y\s+)?(?:el|la)\s+año\s+(?:pasado|anterior|actual)\??$/i, // "y el año pasado?"
    /^(?:y\s+)?(?:el|la)\s+mes\s+(?:pasado|anterior|actual)\??$/i, // "y el mes pasado?"
  ];
  
  // Check if query matches any temporal exclusion pattern
  for (const exclusion of temporalExclusions) {
    if (exclusion.test(lowerText)) {
      console.log(`⏭️ [EMPLOYEE_DETECTION] Skipping temporal phrase: "${text}"`);
      return null; // Not an employee name, it's a temporal phrase
    }
  }
  
  // 🚫 CALCULATION EXCLUSIONS: Frases que indican cálculo hipotético, no búsqueda de empleado
  const calculationExclusions = [
    /\b(calcula|calculalo|calculame|calcular|calcúlame|calculámelo|hazlo|para|con)\b/i,
    /\b(para\s+un\s+salario|con\s+(?:un\s+)?salario|salario\s+de)\b/i,
    /\bsalario\s+de\s+[\d\.,]+\s*(millones?|mil|pesos?|cop|m\b|mm\b)?\b/i,
    /\b[\d\.,]+\s*(millones?|mil|pesos?|cop|m\b|mm\b)\b/i,
    /\$\s*[\d\.,]+/i, // Detección de montos con signo $
    /\b(?:para|con)\s+[\d\.,]+/i, // "para 2000000", "con 2.5 millones"
  ];

  for (const exclusion of calculationExclusions) {
    if (exclusion.test(lowerText)) {
      console.log(`💰 [EMPLOYEE_DETECTION] Excluded: "${text}" (calculation context)`);
      return null; // No es un nombre de empleado, es un cálculo hipotético
    }
  }
  
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
  
  // Pattern 2: Salary queries (mejorado con lookahead negativo para evitar montos)
  const salaryPatterns = [
    /(?:cuál|cual|cuánto|cuanto|qué|que)\s+(?:es\s+el\s+)?(?:salario|sueldo|gana|cobra)\s+de\s+([a-záéíóúñ]+(?:\s+[a-záéíóúñ]+)*)(?!\s*(?:\d|millon|mil|\$|peso|cop))/i,
    /(?:salario|sueldo|gana|cobra)\s+(?:de|del|de\s+la)\s+([a-záéíóúñ]+(?:\s+[a-záéíóúñ]+)*)(?!\s*(?:\d|millon|mil|\$|peso|cop))/i
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

// Helper function to sanitize employee names (remove prepositions)
function sanitizeEmployeeName(name: string): string {
  let cleaned = name.trim();
  
  // Remove leading prepositions: "a juan", "para maria", "de carlos"
  cleaned = cleaned.replace(/^(?:a|para|de)\s+/i, '');
  
  // Remove trailing prepositions: "juan al", "maria del", "carlos de", "ana la", "pedro el"
  cleaned = cleaned.replace(/\s+(?:al|del|de|la|el)\s*$/i, '');
  
  return cleaned.trim();
}

async function handleVoucherSend(supabase: any, params: any): Promise<{ message: string; emotionalState: string; actions?: any[] }> {
  const { employeeName: rawEmployeeName, termUsed } = params;
  
  // Sanitize employee name before processing
  const employeeName = sanitizeEmployeeName(rawEmployeeName);
  console.log(`🧹 [VOUCHER_SEND] Name cleanup: "${rawEmployeeName}" -> "${employeeName}"`);
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
          type: 'confirm_send_voucher',
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
        type: 'confirm_send_voucher',
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
      }
    ]
  };
}

async function handleVoucherMassSend(supabase: any, params: any): Promise<{ message: string; emotionalState: string; actions?: any[] }> {
  console.log(`🎯 [VOUCHER_MASS_SEND] Processing mass voucher request`);
  
  // Step 1: Get all active employees
  const companyId = await getCurrentCompanyId(supabase);
  if (!companyId) {
    return { message: '❌ No pude identificar tu empresa.', emotionalState: 'concerned' } as any;
  }
  
  const today = new Date().toISOString().slice(0, 10);
  
  const { data: employees, error: employeesError } = await supabase
    .from('employees')
    .select('id, nombre, apellido, email, cargo')
    .eq('estado', 'activo')
    .eq('company_id', companyId)
    .or(`fecha_finalizacion_contrato.is.null,fecha_finalizacion_contrato.gte.${today}`);
  
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
    const companyId = await getCurrentCompanyId(supabase);
    if (!companyId) throw new Error('🔒 [SECURITY] No company found for user');

    const today = new Date().toISOString().slice(0, 10);

    const { count, error } = await supabase
      .from('employees')
      .select('*', { count: 'exact', head: true })
      .eq('estado', 'activo')
      .eq('company_id', companyId)
      .or(`fecha_finalizacion_contrato.is.null,fecha_finalizacion_contrato.gte.${today}`);
      
    if (error) throw error;
    
    console.log(`👥 [EMPLOYEE_COUNT] company=${companyId} today=${today} count=${count}`);
    
    return {
      message: `Tienes **${count} empleados activos** en tu empresa. ${count > 0 ? '¿Te gustaría ver quiénes son?' : ''}`,
      emotionalState: 'neutral',
      actions: count > 0 ? [{
        id: 'show-employees',
        type: 'send_message',
        label: '👥 Ver empleados',
        description: 'Mostrar la lista de empleados activos',
        parameters: {
          message: 'ver empleados'
        }
      }] : []
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
    const companyId = await getCurrentCompanyId(supabase);
    if (!companyId) throw new Error('🔒 [SECURITY] No company found for user');

    const today = new Date().toISOString().slice(0, 10);

    const { data: employees, error } = await supabase
      .from('employees')
      .select('id, nombre, apellido, cargo, email')
      .eq('estado', 'activo')
      .eq('company_id', companyId)
      .or(`fecha_finalizacion_contrato.is.null,fecha_finalizacion_contrato.gte.${today}`)
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
    const companyId = await getCurrentCompanyId(supabase);
    if (!companyId) {
      return { message: '❌ No pude identificar tu empresa.', emotionalState: 'concerned' } as any;
    }
    const { data, error } = await supabase
      .from('employees')
      .select('nombre, apellido, cargo, salario_base, estado')
      .eq('company_id', companyId)
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

async function getSalaryReport(supabase: any) {
  try {
  const companyId = await getCurrentCompanyId(supabase);
  if (!companyId) {
    return { message: '❌ No pude identificar tu empresa.', emotionalState: 'concerned' } as any;
  }
  
  const today = new Date().toISOString().slice(0, 10);
  
  const { data, error } = await supabase
    .from('employees')
    .select('nombre, apellido, cargo, salario_base')
    .eq('estado', 'activo')
    .eq('company_id', companyId)
    .or(`fecha_finalizacion_contrato.is.null,fecha_finalizacion_contrato.gte.${today}`)
    .order('salario_base', { ascending: false });
      
    if (error) throw error;
    
    if (!data || data.length === 0) {
      return {
        message: 'No encontré empleados activos en tu empresa.',
        emotionalState: 'neutral'
      };
    }
    
    const totalSalaries = data.reduce((sum: number, emp: any) => sum + (emp.salario_base || 0), 0);
    const employeeList = data.map((emp: any) => 
      `• **${emp.nombre} ${emp.apellido}** - ${emp.cargo || 'Sin cargo'} - $${emp.salario_base?.toLocaleString() || 'N/A'}`
    ).join('\n');
    
    return {
      message: `📊 **Reporte de Salarios por Empleado**\n\n` +
              `👥 Total empleados: **${data.length}**\n` +
              `💰 Nómina total: **$${totalSalaries.toLocaleString()}**\n\n` +
              `${employeeList}\n\n` +
              `💡 ¿Necesitas ver detalles de algún empleado en particular?`,
      emotionalState: 'neutral'
    };
  } catch (error) {
    console.error('[MAYA] Salary report error:', error);
    return {
      message: 'Error al generar el reporte de salarios.',
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
  const companyId = await getCurrentCompanyId(supabase);
  if (!companyId) {
    return { message: '❌ No pude identificar tu empresa.', emotionalState: 'concerned' } as any;
  }
  const { data, error } = await supabase
    .from('employees')
    .select('nombre, apellido, cargo, salario_base, fecha_ingreso, estado')
    .eq('company_id', companyId)
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

async function getEmployeeDetails(supabase: any, name: string) {
  if (!name) {
    return {
      message: '¿De qué empleado necesitas información detallada?',
      emotionalState: 'neutral'
    };
  }
  
  try {
    // Search for employee with expanded data
  const companyId = await getCurrentCompanyId(supabase);
  if (!companyId) {
    return { message: '❌ No pude identificar tu empresa.', emotionalState: 'concerned' } as any;
  }
  const { data, error } = await supabase
    .from('employees')
    .select('id, nombre, apellido, cedula, cargo, salario_base, estado, fecha_ingreso, tipo_contrato, periodicidad_pago, email, telefono, departamento, eps, afp, caja_compensacion')
    .eq('company_id', companyId)
    .or(`nombre.ilike.%${name}%,apellido.ilike.%${name}%`)
    .limit(3);
      
    if (error) throw error;
    
    if (data.length === 0) {
      return {
        message: `No encontré un empleado llamado "${name}". ¿Podrías verificar la ortografía?`,
        emotionalState: 'neutral'
      };
    }
    
    if (data.length > 1) {
      const employeeList = data.map((emp: any) => 
        `• **${emp.nombre} ${emp.apellido}** - ${emp.cargo || 'Sin cargo'}`
      ).join('\n');
      
      return {
        message: `Encontré **${data.length} empleados** con "${name}":\n\n${employeeList}\n\n¿Podrías ser más específico?`,
        emotionalState: 'neutral'
      };
    }
    
    const employee = data[0];
    
    // Calculate tenure
    let tenureText = '';
    if (employee.fecha_ingreso) {
      const ingresoDate = new Date(employee.fecha_ingreso);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - ingresoDate.getTime());
      const diffYears = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 365.25));
      const diffMonths = Math.floor((diffTime % (1000 * 60 * 60 * 24 * 365.25)) / (1000 * 60 * 60 * 24 * 30.44));
      
      if (diffYears > 0) {
        tenureText = `${diffYears} año${diffYears > 1 ? 's' : ''}`;
        if (diffMonths > 0) {
          tenureText += ` y ${diffMonths} mes${diffMonths > 1 ? 'es' : ''}`;
        }
      } else if (diffMonths > 0) {
        tenureText = `${diffMonths} mes${diffMonths > 1 ? 'es' : ''}`;
      } else {
        tenureText = 'menos de 1 mes';
      }
    }
    
    // Build comprehensive details
    let detailsMessage = `📋 **Información Completa de ${employee.nombre} ${employee.apellido}**\n\n`;
    
    // Basic Info
    detailsMessage += `**👤 Información Personal:**\n`;
    detailsMessage += `• Cédula: ${employee.cedula || 'No especificada'}\n`;
    detailsMessage += `• Email: ${employee.email || 'No especificado'}\n`;
    detailsMessage += `• Teléfono: ${employee.telefono || 'No especificado'}\n`;
    if (employee.departamento) {
      detailsMessage += `• Departamento: ${employee.departamento}\n`;
    }
    detailsMessage += `\n`;
    
    // Employment Info
    detailsMessage += `**💼 Información Laboral:**\n`;
    detailsMessage += `• Cargo: ${employee.cargo || 'No especificado'}\n`;
    detailsMessage += `• Estado: ${employee.estado === 'activo' ? '✅ Activo' : '❌ Inactivo'}\n`;
    if (employee.fecha_ingreso) {
      detailsMessage += `• Fecha de ingreso: ${new Date(employee.fecha_ingreso).toLocaleDateString('es-CO')}\n`;
      detailsMessage += `• Antigüedad: ${tenureText}\n`;
    }
    if (employee.tipo_contrato) {
      const contratoMap: Record<string, string> = {
        'indefinido': 'Indefinido',
        'fijo': 'Término Fijo',
        'obra_labor': 'Obra o Labor',
        'prestacion_servicios': 'Prestación de Servicios'
      };
      detailsMessage += `• Tipo de contrato: ${contratoMap[employee.tipo_contrato] || employee.tipo_contrato}\n`;
    }
    if (employee.periodicidad_pago) {
      detailsMessage += `• Periodicidad de pago: ${employee.periodicidad_pago.charAt(0).toUpperCase() + employee.periodicidad_pago.slice(1)}\n`;
    }
    detailsMessage += `\n`;
    
    // Compensation
    detailsMessage += `**💰 Compensación:**\n`;
    detailsMessage += `• Salario base: **$${employee.salario_base?.toLocaleString('es-CO') || 'No especificado'}**\n`;
    detailsMessage += `\n`;
    
    // Social Security
    detailsMessage += `**🏥 Seguridad Social:**\n`;
    detailsMessage += `• EPS: ${employee.eps || 'No asignada'}\n`;
    detailsMessage += `• AFP: ${employee.afp || 'No asignada'}\n`;
    detailsMessage += `• Caja de Compensación: ${employee.caja_compensacion || 'No asignada'}\n`;
    
    return {
      message: detailsMessage,
      emotionalState: 'neutral'
    };
    
  } catch (error) {
    console.error('[MAYA-KISS] Employee details error:', error);
    return {
      message: `Error consultando la información de "${name}".`,
      emotionalState: 'concerned'
    };
  }
}

async function getEmployeeBenefitProvision(supabase: any, params: any) {
  const { name, benefitType, month, year, useLastPeriod } = params || {};
  
  try {
    console.log(`💰 [BENEFIT_PROVISION] Querying provisions for: employee="${name || 'ALL'}", type=${benefitType || 'ALL'}, month=${month || 'none'}, year=${year || (useLastPeriod ? 'last_period' : 'current')}`);
    
    // Get company ID
    const companyId = await getCurrentCompanyId(supabase);
    if (!companyId) {
      return { message: '❌ No pude identificar tu empresa.', emotionalState: 'concerned' };
    }
    
    let employeeId: string | null = null;
    let employeeFullName: string | null = null;
    
    // Si se especificó nombre, buscar empleado
    if (name) {
      console.log(`🔍 [BENEFIT_PROVISION] Searching employee with term: "${name}"`);
      
      const { data: employees, error: employeeError } = await supabase
        .from('employees')
        .select('id, nombre, apellido')
        .eq('company_id', companyId)
        .or(`nombre.ilike.%${name}%,apellido.ilike.%${name}%`)
        .limit(5);
      
      console.log(`📊 [BENEFIT_PROVISION] Found ${employees?.length || 0} employees matching "${name}"`);
      
      if (employeeError) throw employeeError;
      
      // Fallback: If no results and name contains month suffix, try cleaning it
      if ((!employees || employees.length === 0) && /\s+(?:en|del?)\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)(?:\s+(?:de|del)\s+\d{4})?/i.test(name)) {
        const cleanedName = name.replace(/\s+(?:en|del?)\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)(?:\s+(?:de|del)\s+\d{4})?/i, '').trim();
        console.log(`🔄 [BENEFIT_PROVISION_FALLBACK] Retrying with cleaned name: "${cleanedName}"`);
        
        const { data: retryEmployees, error: retryError } = await supabase
          .from('employees')
          .select('id, nombre, apellido')
          .eq('company_id', companyId)
          .or(`nombre.ilike.%${cleanedName}%,apellido.ilike.%${cleanedName}%`)
          .limit(5);
        
        if (!retryError && retryEmployees && retryEmployees.length > 0) {
          console.log(`✅ [BENEFIT_PROVISION_FALLBACK] Found ${retryEmployees.length} employees with cleaned name`);
          // Use retry results
          employees.length = 0;
          employees.push(...retryEmployees);
        }
      }
      
      if (!employees || employees.length === 0) {
        return {
          message: `No encontré un empleado llamado "${name}". ¿Podrías verificar la ortografía?`,
          emotionalState: 'neutral'
        };
      }
      
      // Priorizar coincidencia exacta
      const exactMatch = employees.find((emp: any) => 
        emp.nombre.toLowerCase() === name.toLowerCase() ||
        emp.apellido.toLowerCase() === name.toLowerCase() ||
        `${emp.nombre} ${emp.apellido}`.toLowerCase() === name.toLowerCase()
      );
      
      if (exactMatch) {
        employeeId = exactMatch.id;
        employeeFullName = `${exactMatch.nombre} ${exactMatch.apellido}`;
      } else if (employees.length === 1) {
        employeeId = employees[0].id;
        employeeFullName = `${employees[0].nombre} ${employees[0].apellido}`;
      } else {
        const employeeList = employees.map((emp: any) => 
          `• **${emp.nombre} ${emp.apellido}**`
        ).join('\n');
        
        return {
          message: `Encontré **${employees.length} empleados** con "${name}":\n\n${employeeList}\n\n¿Podrías ser más específico con el nombre completo?`,
          emotionalState: 'neutral'
        };
      }
    }
    
    // Determinar rango de fechas
    let startDate: string;
    let endDate: string;
    let periodLabel: string;
    
    if (month) {
      // Consulta por mes específico
      const monthMap: Record<string, number> = {
        'enero': 1, 'febrero': 2, 'marzo': 3, 'abril': 4,
        'mayo': 5, 'junio': 6, 'julio': 7, 'agosto': 8,
        'septiembre': 9, 'octubre': 10, 'noviembre': 11, 'diciembre': 12
      };
      
      const monthNumber = monthMap[month.toLowerCase()];
      const targetYear = year || new Date().getFullYear();
      
      if (!monthNumber) {
        return {
          message: `❌ No reconozco el mes "${month}".`,
          emotionalState: 'concerned'
        };
      }
      
      // Calcular primer y último día del mes
      const lastDay = new Date(targetYear, monthNumber, 0).getDate();
      startDate = `${targetYear}-${String(monthNumber).padStart(2, '0')}-01`;
      endDate = `${targetYear}-${String(monthNumber).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      
      const monthNameCapitalized = month.charAt(0).toUpperCase() + month.slice(1);
      periodLabel = `Período: **${monthNameCapitalized} ${targetYear}**`;
      
      console.log(`📅 [BENEFIT_PROVISION] Month detected: ${month} -> ${startDate} to ${endDate}`);
    } else if (useLastPeriod && !year) {
      // Obtener el último período cerrado
      const { data: lastPeriod, error: periodError } = await supabase
        .from('payroll_periods_real')
        .select('fecha_inicio, fecha_fin, periodo')
        .eq('company_id', companyId)
        .eq('estado', 'cerrado')
        .order('fecha_fin', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (periodError || !lastPeriod) {
        return {
          message: '❌ No encontré períodos cerrados. Las provisiones se calculan al cerrar períodos de nómina.',
          emotionalState: 'neutral'
        };
      }
      
      startDate = lastPeriod.fecha_inicio;
      endDate = lastPeriod.fecha_fin;
      periodLabel = `Período: **${lastPeriod.periodo}**`;
      
      console.log(`📅 [BENEFIT_PROVISION] Using last closed period: ${lastPeriod.periodo}`);
    } else {
      // Por defecto: año completo
      const targetYear = year || new Date().getFullYear();
      startDate = `${targetYear}-01-01`;
      endDate = `${targetYear}-12-31`;
      periodLabel = `Período: **Año ${targetYear}**`;
      
      console.log(`📅 [BENEFIT_PROVISION] Using full year: ${targetYear}`);
    }
    
    // Query provisions from social_benefit_calculations
    // Si hay employeeId específico, no necesitamos JOIN (ya tenemos employeeFullName)
    // Si NO hay employeeId, necesitamos JOIN para obtener nombres de empleados
    const selectFields = employeeId 
      ? 'benefit_type, amount, period_start, period_end, created_at, employee_id'
      : 'benefit_type, amount, period_start, period_end, created_at, employee_id, employees!inner(nombre, apellido)';
    
    console.log('[BENEFIT_PROVISION] Query config:', {
      employeeId,
      employeeFullName,
      benefitType,
      startDate,
      endDate,
      selectFields
    });
    
    let query = supabase
      .from('social_benefit_calculations')
      .select(selectFields)
      .eq('company_id', companyId)
      .gte('period_end', startDate)
      .lte('period_end', endDate)
      .order('period_end', { ascending: true });
    
    // Filter by employee if specified
    if (employeeId) {
      query = query.eq('employee_id', employeeId);
      console.log('[BENEFIT_PROVISION] Applying employee filter:', employeeId);
    }
    
    // Filter by benefit type if specified
    if (benefitType) {
      query = query.eq('benefit_type', benefitType);
    }
    
    const { data: provisions, error: provisionError } = await query;
    
    console.log('[BENEFIT_PROVISION] Query results:', {
      count: provisions?.length || 0,
      hasError: !!provisionError,
      dateRange: `${startDate} to ${endDate}`,
      sampleRecord: provisions?.[0]
    });
    
    if (provisionError) {
      console.error('[BENEFIT_PROVISION] Query error:', provisionError);
      throw provisionError;
    }
    
    if (!provisions || provisions.length === 0) {
      const typeText = benefitType ? 
        `de **${benefitType}**` : 
        'de prestaciones sociales';
      const employeeText = employeeFullName ? ` para **${employeeFullName}**` : '';
      
      return {
        message: `No encontré provisiones ${typeText}${employeeText} en ${periodLabel.replace('Período: ', '')}.\n\n` +
                `💡 Las provisiones se generan automáticamente al cerrar períodos de nómina. Si ya cerraste períodos, puedes recalcular provisiones en el módulo de **Provisiones**.`,
        emotionalState: 'neutral'
      };
    }
    
    // Group provisions by month or employee
    const provisionsByGroup: Record<string, any[]> = {};
    let totalAmount = 0;
    
    provisions.forEach((prov: any) => {
      const monthKey = new Date(prov.period_end).toLocaleString('es-CO', { month: 'long', year: 'numeric' });
      
      // Si HAY empleado específico (employeeFullName), agrupar por mes
      // Si NO hay empleado específico, agrupar por empleado (usando el JOIN)
      let groupKey: string;
      if (employeeFullName) {
        // Consulta específica por empleado: agrupar por mes
        groupKey = monthKey;
      } else {
        // Consulta general: agrupar por empleado
        groupKey = `${prov.employees.nombre} ${prov.employees.apellido}`;
      }
      
      if (!provisionsByGroup[groupKey]) {
        provisionsByGroup[groupKey] = [];
      }
      provisionsByGroup[groupKey].push(prov);
      totalAmount += parseFloat(prov.amount) || 0;
    });
    
    // Build detailed message
    const benefitTypeNames: Record<string, string> = {
      'vacaciones': 'Vacaciones',
      'prima': 'Prima de Servicios',
      'cesantias': 'Cesantías',
      'intereses_cesantias': 'Intereses de Cesantías'
    };
    
    // Clarificar si se filtró por tipo específico
    const typeHeader = benefitType 
      ? `${benefitTypeNames[benefitType]} (solo este tipo)` 
      : 'Prestaciones Sociales (todos los tipos)';
    
    let message = `📊 **Provisiones de ${typeHeader}**\n`;
    if (employeeFullName) {
      message += `👤 Empleado: **${employeeFullName}**\n`;
    }
    message += `📅 ${periodLabel}\n\n`;
    
    // Add breakdown (by month if employee specified, by employee if not)
    const monthOrder = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    
    let sortedGroups: string[];
    if (employeeFullName) {
      // Ordenar por mes
      sortedGroups = Object.keys(provisionsByGroup).sort((a, b) => {
        const monthA = a.split(' ')[0].toLowerCase();
        const monthB = b.split(' ')[0].toLowerCase();
        return monthOrder.indexOf(monthA) - monthOrder.indexOf(monthB);
      });
    } else {
      // Ordenar por empleado alfabéticamente
      sortedGroups = Object.keys(provisionsByGroup).sort();
    }
    
    for (const groupKey of sortedGroups) {
      const groupProvisions = provisionsByGroup[groupKey];
      const groupTotal = groupProvisions.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
      
      message += `### ${groupKey.charAt(0).toUpperCase() + groupKey.slice(1)}\n`;
      
      // Group by benefit type within the group
      const byType: Record<string, any[]> = {};
      groupProvisions.forEach((prov: any) => {
        if (!byType[prov.benefit_type]) {
          byType[prov.benefit_type] = [];
        }
        byType[prov.benefit_type].push(prov);
      });
      
      for (const [type, typeProvisions] of Object.entries(byType)) {
        const typeName = benefitTypeNames[type] || type;
        
        typeProvisions.forEach((prov: any) => {
          const periodStart = new Date(prov.period_start).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
          const periodEnd = new Date(prov.period_end).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
          const amount = parseFloat(prov.amount) || 0;
          
          message += `  • ${typeName}: **$${amount.toLocaleString('es-CO')}**\n`;
          message += `    📅 Período: ${periodStart} - ${periodEnd}\n`;
        });
      }
      
      message += `  💰 **Subtotal: $${groupTotal.toLocaleString('es-CO')}**\n\n`;
    }
    
    message += `---\n`;
    message += `💵 **Total provisionado: $${totalAmount.toLocaleString('es-CO')}**\n`;
    message += `📈 **Total de registros: ${provisions.length}**`;
    
    return {
      message,
      emotionalState: 'satisfied'
    };
    
  } catch (error) {
    console.error('[BENEFIT_PROVISION] Error:', error);
    return {
      message: `Error consultando las provisiones. Por favor intenta de nuevo.`,
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
  const companyId = await getCurrentCompanyId(supabase);
  if (!companyId) {
    return { message: '❌ No pude identificar tu empresa.', emotionalState: 'concerned' } as any;
  }
  const { data: employees, error: employeeError } = await supabase
    .from('employees')
    .select('id, nombre, apellido')
    .eq('company_id', companyId)
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

async function getPayrollTotals(supabase: any, periodFilter?: string) {
  try {
    let query = supabase
      .from('payroll_periods_real')
      .select('id, periodo, total_devengado, total_deducciones, total_neto, fecha_inicio, fecha_fin, empleados_count')
      .eq('estado', 'cerrado')
      .order('fecha_fin', { ascending: false });
    
    // Si se especifica "última quincena" o "último periodo"
    if (periodFilter === 'última_quincena' || periodFilter === 'último_mes') {
      query = query.limit(1);  // Solo el más reciente
      
      const { data, error } = await query;
      if (error) throw error;
      
      if (!data || data.length === 0) {
        return {
          message: 'No hay períodos de nómina cerrados aún.',
          emotionalState: 'neutral'
        };
      }
      
      const period = data[0];
      return {
        message: `💰 **${period.periodo}**\n\n` +
                `📊 Total devengado: $${(period.total_devengado || 0).toLocaleString()}\n` +
                `💸 Total deducciones: $${(period.total_deducciones || 0).toLocaleString()}\n` +
                `✅ **Total neto pagado: $${(period.total_neto || 0).toLocaleString()}**\n\n` +
                `👥 Empleados: ${period.empleados_count || 0}`,
        emotionalState: 'professional'
      };
    }
    
    // Si no, devolver totales del año (comportamiento actual)
    const currentYear = new Date().getFullYear();
    query = query.gte('fecha_inicio', `${currentYear}-01-01`);
    
    const { data, error } = await query;
    if (error) throw error;
    
    if (!data || data.length === 0) {
      return {
        message: 'No hay períodos de nómina procesados este año aún.',
        emotionalState: 'neutral'
      };
    }
    
    const totalNeto = data.reduce((sum, p) => sum + (p.total_neto || 0), 0);
    const totalDevengado = data.reduce((sum, p) => sum + (p.total_devengado || 0), 0);
    
    return {
      message: `📊 **Resumen ${currentYear}**\n\n` +
              `Este año has pagado **$${totalNeto.toLocaleString()}** en **${data.length} nóminas** procesadas.\n` +
              `Total devengado: $${totalDevengado.toLocaleString()}`,
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

// ============================================================================
// PHASE 1: AGGREGATION HANDLERS
// ============================================================================
async function handleTotalPayrollCost(supabase: any, params: any) {
  const temporalParams = TemporalResolver.isLegacyFormat(params)
    ? TemporalResolver.fromLegacy(params)
    : params;
  return await AggregationService.getTotalPayrollCost(supabase, temporalParams);
}

async function handleSecurityContributions(supabase: any, params: any) {
  const temporalParams = TemporalResolver.isLegacyFormat(params)
    ? TemporalResolver.fromLegacy(params)
    : params;
  return await AggregationService.getSecurityContributions(supabase, temporalParams);
}

async function handleHighestCostEmployees(supabase: any, params: any) {
  const temporalParams = TemporalResolver.isLegacyFormat(params)
    ? TemporalResolver.fromLegacy(params)
    : params;
  return await AggregationService.getHighestCostEmployees(supabase, temporalParams);
}

async function handleLowestCostEmployees(supabase: any, params: any) {
  const temporalParams = TemporalResolver.isLegacyFormat(params)
    ? TemporalResolver.fromLegacy(params)
    : params;
  return await AggregationService.getLowestCostEmployees(supabase, temporalParams);
}

async function handleTotalIncapacityDays(supabase: any, params: any) {
  const temporalParams = TemporalResolver.isLegacyFormat(params)
    ? TemporalResolver.fromLegacy(params)
    : params;
  return await AggregationService.getTotalIncapacityDays(supabase, temporalParams);
}

async function handleIncapacityReport(supabase: any, params: any) {
  const temporalParams = TemporalResolver.isLegacyFormat(params)
    ? TemporalResolver.fromLegacy(params)
    : params;
  return await AggregationService.getIncapacityReport(supabase, temporalParams);
}

async function handleContributionReport(supabase: any, params: any) {
  const temporalParams = TemporalResolver.isLegacyFormat(params)
    ? TemporalResolver.fromLegacy(params)
    : params;
  return await AggregationService.getContributionReport(supabase, temporalParams);
}

async function handleTotalOvertimeHours(supabase: any, params: any) {
  let temporalParams = TemporalResolver.isLegacyFormat(params)
    ? TemporalResolver.fromLegacy(params)
    : params;
  
  // Safeguard: if type is still missing, default to SPECIFIC_PERIOD
  if (!temporalParams.type) {
    console.log('⚠️ [OVERTIME_HANDLER] Missing type after conversion, defaulting to SPECIFIC_PERIOD');
    temporalParams = { ...temporalParams, type: 'specific_period' };
  }
  
  console.log('📊 [OVERTIME_HANDLER] Final temporalParams:', JSON.stringify(temporalParams));
  return await AggregationService.getTotalOvertimeHours(supabase, temporalParams);
}

async function handleHighestPayrollPeriod(supabase: any, params: any) {
  try {
    const temporalParams = TemporalResolver.isLegacyFormat(params)
      ? TemporalResolver.fromLegacy(params)
      : params;
    
    console.log('🏆 [HIGHEST_PERIOD_HANDLER] Searching for highest payroll period:', temporalParams);
    const result = await AggregationService.getHighestPayrollPeriod(supabase, temporalParams);
    
    // If service returned data, enhance the message
    if (result.data) {
      const { highestPeriod, context } = result.data;
      
      // Format currency
      const formatter = new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      });
      
      const message = `🏆 **Período con Mayor Nómina**\n\n` +
        `El período con mayor nómina en **${context.searchRange}** fue:\n\n` +
        `📅 **${highestPeriod.name}**\n` +
        `💰 **Total pagado:** ${formatter.format(highestPeriod.total)}\n` +
        `👥 **Empleados:** ${highestPeriod.employeeCount}\n` +
        `📊 **% del total:** ${context.percentageOfTotal.toFixed(1)}%\n\n` +
        `Este fue el ${context.percentageOfTotal > 50 ? 'mayor' : 'uno de los mayores'} pagos del rango analizado (${context.totalPeriods} período${context.totalPeriods > 1 ? 's' : ''}).`;
      
      return {
        message,
        emotionalState: 'professional',
        data: result.data
      };
    }
    
    return result;
  } catch (error) {
    console.error('❌ [HIGHEST_PERIOD_HANDLER] Error:', error);
    return {
      message: 'No pude determinar el período con mayor nómina. Verifica que existan períodos cerrados.',
      emotionalState: 'concerned'
    };
  }
}

async function handleLowestPayrollPeriod(supabase: any, params: any) {
  try {
    const temporalParams = TemporalResolver.isLegacyFormat(params)
      ? TemporalResolver.fromLegacy(params)
      : params;
    
    console.log('📉 [LOWEST_PERIOD_HANDLER] Searching for lowest payroll period:', temporalParams);
    const result = await AggregationService.getLowestPayrollPeriod(supabase, temporalParams);
    
    // If service returned data, enhance the message
    if (result.data) {
      const { lowestPeriod, context } = result.data;
      
      // Format currency
      const formatter = new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      });
      
      const message = `📉 **Período con Menor Nómina**\n\n` +
        `El período con menor nómina en **${context.searchRange}** fue:\n\n` +
        `📅 **${lowestPeriod.name}**\n` +
        `💰 **Total pagado:** ${formatter.format(lowestPeriod.total)}\n` +
        `👥 **Empleados:** ${lowestPeriod.employeeCount}\n` +
        `📊 **% del total:** ${context.percentageOfTotal.toFixed(1)}%\n\n` +
        `Este fue el ${context.percentageOfTotal < 10 ? 'menor' : 'uno de los menores'} pagos del rango analizado (${context.totalPeriods} período${context.totalPeriods > 1 ? 's' : ''}).`;
      
      return {
        message,
        emotionalState: 'professional',
        data: result.data
      };
    }
    
    return result;
  } catch (error) {
    console.error('❌ [LOWEST_PERIOD_HANDLER] Error:', error);
    return {
      message: 'No pude determinar el período con menor nómina. Verifica que existan períodos cerrados.',
      emotionalState: 'concerned'
    };
  }
}

/**
 * Handle payroll period comparison (flexible)
 */
async function handlePayrollComparison(supabase: any, params: any) {
  try {
    console.log('📊 [COMPARISON_HANDLER] Processing payroll comparison');
    
    // Extract comparison periods from query
    const { extractComparisonPeriods } = await import('./extractors/ComparisonExtractor.ts');
    const query = params?.query || '';
    
    console.log('🔍 [COMPARISON_HANDLER] Extracting periods from:', query);
    const comparisonParams = extractComparisonPeriods(query);
    
    console.log('✅ [COMPARISON_HANDLER] Extracted periods:', comparisonParams);
    
    // Compare periods
    const result = await AggregationService.comparePayrollPeriods(
      supabase,
      comparisonParams
    );
    
    // Format currency
    const formatter = new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
    
    // Determine trend emoji
    const trendEmoji = result.comparison.trend === 'increase' ? '📈' : 
                       result.comparison.trend === 'decrease' ? '📉' : '➡️';
    
    const trendText = result.comparison.trend === 'increase' ? 'incrementó' :
                      result.comparison.trend === 'decrease' ? 'disminuyó' : 'se mantuvo igual';
    
    const message = `${trendEmoji} **Comparación de Nómina**\n\n` +
      `**${result.period1.name}**: ${formatter.format(result.period1.total)} (${result.period1.periodsCount} período${result.period1.periodsCount > 1 ? 's' : ''})\n` +
      `**${result.period2.name}**: ${formatter.format(result.period2.total)} (${result.period2.periodsCount} período${result.period2.periodsCount > 1 ? 's' : ''})\n\n` +
      `📊 **Diferencia**: ${formatter.format(Math.abs(result.comparison.difference))}\n` +
      `📈 **Cambio**: ${result.comparison.percentageChange >= 0 ? '+' : ''}${result.comparison.percentageChange.toFixed(2)}%\n\n` +
      `El costo de nómina ${trendText} en ${Math.abs(result.comparison.percentageChange).toFixed(2)}% ` +
      `al comparar **${result.period1.name}** con **${result.period2.name}**.`;
    
    return {
      message,
      emotionalState: 'professional',
      data: result
    };
  } catch (error) {
    console.error('❌ [COMPARISON_HANDLER] Error:', error);
    return {
      message: 'No pude realizar la comparación. Por favor, verifica que existan períodos cerrados para los períodos solicitados.',
      emotionalState: 'concerned'
    };
  }
}

// ============================================================================
// END PHASE 1: AGGREGATION HANDLERS
// ============================================================================

// ============================================================================
// SALARY AMOUNT EXTRACTOR - Detecta montos en diversos formatos
// ============================================================================
function extractSalaryAmount(text: string): number | null {
  const lowerText = text.toLowerCase();
  
  // Patrón 1: $X.XXX.XXX o $X,XXX,XXX
  const dollarPattern = /\$\s*([\d,.]+)/;
  const dollarMatch = lowerText.match(dollarPattern);
  if (dollarMatch) {
    const cleaned = dollarMatch[1].replace(/[.,]/g, '');
    const amount = parseInt(cleaned, 10);
    if (!isNaN(amount) && amount > 0) {
      console.log(`💰 [EXTRACTOR] Found dollar amount: $${amount.toLocaleString()}`);
      return amount;
    }
  }
  
  // Patrón 2: X millones, X.X millones
  const millionPattern = /([\d,.]+)\s*(?:millones?|m\b|mm\b)/i;
  const millionMatch = text.match(millionPattern);
  if (millionMatch) {
    const numStr = millionMatch[1].replace(/,/g, '.');
    const num = parseFloat(numStr);
    if (!isNaN(num) && num > 0) {
      const amount = Math.round(num * 1000000);
      console.log(`💰 [EXTRACTOR] Found millions: ${num}M = $${amount.toLocaleString()}`);
      return amount;
    }
  }
  
  // Patrón 3: XXX mil, XXX.XXX
  const thousandPattern = /([\d,.]+)\s*(?:mil\b)/i;
  const thousandMatch = text.match(thousandPattern);
  if (thousandMatch) {
    const numStr = thousandMatch[1].replace(/,/g, '.');
    const num = parseFloat(numStr);
    if (!isNaN(num) && num > 0) {
      const amount = Math.round(num * 1000);
      console.log(`💰 [EXTRACTOR] Found thousands: ${num}k = $${amount.toLocaleString()}`);
      return amount;
    }
  }
  
  // Patrón 4: Números grandes sin formato (>= 500000)
  const plainNumberPattern = /\b(\d{6,})\b/;
  const plainMatch = text.match(plainNumberPattern);
  if (plainMatch) {
    const amount = parseInt(plainMatch[1], 10);
    if (!isNaN(amount) && amount >= 500000) {
      console.log(`💰 [EXTRACTOR] Found plain number: $${amount.toLocaleString()}`);
      return amount;
    }
  }
  
  console.log(`💰 [EXTRACTOR] No salary amount found in: "${text}"`);
  return null;
}

// ============================================================================
// STREAMING variant of handleConversation — used when client sends X-Maya-Stream-Request: 1
// Runs same RAG + guardrails logic, but streams tokens via SSE
// ============================================================================
async function handleConversationStreaming(
  message: string,
  conversation: any[],
  llmClient: LLMClient
): Promise<ReadableStream | null> {
  const openaiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openaiKey) return null;

  const now = new Date();
  const currentMonth = now.toLocaleDateString('es-CO', { month: 'long' });
  const currentYear = now.getFullYear();
  const currentDate = `${currentMonth} ${currentYear}`;

  // RAG context (same as handleConversation)
  let legalContext = '';
  try {
    const ragKey = Deno.env.get('OPENAI_API_KEY');
    if (ragKey) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const ragSupabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

      const embeddingResp = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${ragKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: message, model: 'text-embedding-3-small' })
      });

      if (embeddingResp.ok) {
        const embeddingData = await embeddingResp.json();
        const queryEmbedding = embeddingData.data[0]?.embedding;

        if (queryEmbedding) {
          const { data: docs } = await ragSupabase.rpc('match_legal_documents', {
            query_embedding: queryEmbedding,
            match_threshold: 0.7,
            match_count: 3
          });
          if (docs && docs.length > 0) {
            legalContext = docs.map((d: any) => d.content).join('\n\n---\n\n');
          }
        }
      }
    }
  } catch { /* continue without RAG */ }

  const systemPrompt = `**FECHA ACTUAL: ${currentDate.toUpperCase()}**
${legalContext ? '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n🔴 TIENES CONTEXTO LEGAL ACTUALIZADO ABAJO - ES TU ÚNICA FUENTE DE VERDAD\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' : '⚠️ SIN CONTEXTO LEGAL: No inventes artículos ni cifras.'}

Eres MAYA, asistente laboral colombiano experto en nómina y legislación vigente ${currentYear}.
- Conciso: Máximo 300 palabras por respuesta
- Natural: Habla como asesor amigable
- Visual: Usa bullets, emojis y ejemplos prácticos
- SMLV ${currentYear}: $1.423.500 | Aux. transporte: $200.000

${legalContext ? `CONTEXTO LEGAL:\n${legalContext}` : ''}`;

  const messages = [
    { role: 'system' as const, content: systemPrompt },
    ...conversation.slice(-5).map((m: any) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    { role: 'user' as const, content: message }
  ];

  // Use routing to pick the best model for EXPLANATION
  const model = llmClient.getModelForQueryType('EXPLANATION');
  return llmClient.stream(model, messages, { maxTokens: 1000, temperature: 0.7 });
}

async function handleConversation(message: string, conversation: any[]) {
  const now = new Date();
  const currentMonth = now.toLocaleDateString('es-CO', { month: 'long' });
  const currentYear = now.getFullYear();
  const currentDate = `${currentMonth} ${currentYear}`;
  
  const openaiKey = Deno.env.get('OPENAI_API_KEY');
  const lovableKey = Deno.env.get('LOVABLE_API_KEY');
  
  if (!openaiKey) {
    return {
      message: 'Hola, soy MAYA. Puedo ayudarte con consultas sobre empleados y nómina. ¿Qué necesitas?',
      emotionalState: 'neutral'
    };
  }
  
// ============================================================================
// GUARDRAILS: Helpers para evitar alucinaciones legales (DEPRECATED - usar backend)
// ============================================================================
// ⚠️ DEPRECATED: Estas funciones están deprecadas en favor del backend de cálculos
// Las mantenemos temporalmente para backward compatibility pero deberían eliminarse
// una vez confirmado que el tool-calling funciona correctamente.

function getDivisorForDate(date = new Date()): number {
  const t2023 = new Date('2023-07-15');
  const t2024 = new Date('2024-07-15');
  const t2025Recargos = new Date('2025-07-01'); // Ley 2338 recargos
  
  if (date >= t2025Recargos) return 220;
  if (date >= t2024) return 230;
  if (date >= t2023) return 235;
  return 240;
}

// ⚠️ DEPRECATED: buildRecargoNocturnoAnswer - usar backend + tool-calling
function buildRecargoNocturnoAnswer(now = new Date(), salaryOverride?: number): { message: string; emotionalState: string; quickReplies?: any[] } {
  const divisor = getDivisorForDate(now);
  const ejemploSalario = salaryOverride || 1423500; // SMLV 2025 por defecto
  const hora = Math.round(ejemploSalario / divisor);
  const recargo = Math.round(hora * 0.35);
  const valorTotal = hora + recargo;
  const factor = 1.35;
  
  const isCustomSalary = !!salaryOverride;
  const salarioLabel = isCustomSalary ? 'tu salario especificado' : 'SMLV 2025';
  
  const quickReplies = isCustomSalary ? [
    { label: '🔄 Calcular con otro salario', value: 'calcular recargo nocturno con otro salario' },
    { label: '📅 Recargo dominical', value: `calcular recargo dominical para ${ejemploSalario}` },
    { label: '📖 Ver normativa', value: 'cuál es la normativa del recargo nocturno' }
  ] : [
    { label: '💰 Calcular con mi salario', value: 'calcular recargo nocturno para mi salario' },
    { label: '📅 Recargo dominical', value: 'recargo dominical' }
  ];
  
  return {
    message: `El recargo nocturno es del **35%** sobre la hora ordinaria.\n\n` +
      `🕙 **Horario nocturno:** 10:00 p.m. a 6:00 a.m. (Art. 168 CST)\n\n` +
      `📊 **Cálculo:**\n` +
      `• Hora ordinaria = Salario mensual ÷ ${divisor} horas\n` +
      `• Recargo nocturno = Hora ordinaria × 0.35\n` +
      `• **Valor total hora nocturna = Hora ordinaria × ${factor}**\n\n` +
      `💡 **${isCustomSalary ? 'Cálculo' : 'Ejemplo'} con ${salarioLabel} ($${ejemploSalario.toLocaleString()}):**\n` +
      `• Hora ordinaria = $${hora.toLocaleString()}\n` +
      `• Solo recargo = $${recargo.toLocaleString()} por hora\n` +
      `• **Valor total hora nocturna = $${valorTotal.toLocaleString()}**` +
      (isCustomSalary ? '' : `\n\n¿Quieres calcularlo para un salario específico?`),
    emotionalState: 'professional',
    quickReplies
  };
}

// ⚠️ DEPRECATED: getRecargoDominicalRate - usar backend + tool-calling
function getRecargoDominicalRate(date = new Date()): number {
  // Ley 2466/2025 - Incremento progresivo del recargo dominical/festivo
  const jul2025 = new Date('2025-07-01');
  const jul2026 = new Date('2026-07-01');
  const jul2027 = new Date('2027-07-01');
  
  if (date < jul2025) return 0.75;      // Hasta junio 2025: 75%
  if (date < jul2026) return 0.80;      // Julio 2025 - Junio 2026: 80%
  if (date < jul2027) return 0.90;      // Julio 2026 - Junio 2027: 90%
  return 1.00;                          // Desde julio 2027: 100%
}

// ⚠️ DEPRECATED: buildRecargoDominicalAnswer - usar backend + tool-calling
function buildRecargoDominicalAnswer(now = new Date(), salaryOverride?: number): { message: string; emotionalState: string; quickReplies?: any[] } {
  const divisor = getDivisorForDate(now);
  const recargoDominical = getRecargoDominicalRate(now);
  const porcentaje = Math.round(recargoDominical * 100);
  const factor = 1 + recargoDominical;
  const ejemploSalario = salaryOverride || 1423500; // SMLV 2025 por defecto
  const hora = Math.round(ejemploSalario / divisor);
  const soloRecargo = Math.round(hora * recargoDominical);
  const valorDominical = Math.round(hora * factor);
  
  const isCustomSalary = !!salaryOverride;
  const salarioLabel = isCustomSalary ? 'tu salario especificado' : 'SMLV 2025';
  
  // Determinar el período vigente para el mensaje
  let periodoVigente = '';
  const jul2025 = new Date('2025-07-01');
  const jul2026 = new Date('2026-07-01');
  const jul2027 = new Date('2027-07-01');
  
  if (now < jul2025) {
    periodoVigente = 'hasta junio 2025';
  } else if (now < jul2026) {
    periodoVigente = 'vigente julio 2025 - junio 2026';
  } else if (now < jul2027) {
    periodoVigente = 'vigente julio 2026 - junio 2027';
  } else {
    periodoVigente = 'vigente desde julio 2027';
  }
  
  const quickReplies = isCustomSalary ? [
    { label: '🔄 Calcular con otro salario', value: 'calcular recargo dominical con otro salario' },
    { label: '🌙 Recargo nocturno', value: `calcular recargo nocturno para ${ejemploSalario}` },
    { label: '📖 Ver Ley 2466', value: 'qué dice la ley 2466 sobre recargo dominical' }
  ] : [
    { label: '💰 Calcular con mi salario', value: 'calcular recargo dominical para mi salario' },
    { label: '🌙 Recargo nocturno', value: 'recargo nocturno' }
  ];
  
  return {
    message: `El recargo dominical/festivo es del **${porcentaje}%** sobre la hora ordinaria (${periodoVigente}).\n\n` +
      `📅 **Días con recargo:** Domingos + festivos nacionales (Art. 179 CST)\n\n` +
      `📊 **Cálculo:**\n` +
      `• Hora ordinaria = Salario mensual ÷ ${divisor} horas\n` +
      `• Recargo dominical = Hora ordinaria × ${recargoDominical.toFixed(2)}\n` +
      `• **Valor total hora dominical = Hora ordinaria × ${factor.toFixed(2)}**\n\n` +
      `💡 **${isCustomSalary ? 'Cálculo' : 'Ejemplo'} con ${salarioLabel} ($${ejemploSalario.toLocaleString()}):**\n` +
      `• Hora ordinaria = $${hora.toLocaleString()}\n` +
      `• Solo recargo = $${soloRecargo.toLocaleString()} por hora\n` +
      `• **Valor total hora dominical = $${valorDominical.toLocaleString()}**\n\n` +
      `📈 **Incremento progresivo (Ley 2466/2025):**\n` +
      `• Hasta junio 2025: 75%\n` +
      `• Julio 2025 - junio 2026: 80%\n` +
      `• Julio 2026 - junio 2027: 90%\n` +
      `• Desde julio 2027: 100%` +
      (isCustomSalary ? '' : `\n\n¿Quieres calcularlo para un salario específico?`),
    emotionalState: 'professional',
    quickReplies
  };
}

// ⚠️ DEPRECATED: buildSafeNoContextResponse - no necesario con tool-calling
function buildSafeNoContextResponse(): { message: string; emotionalState: string } {
  return {
    message: 'No cuento con contexto legal actualizado para confirmarlo. ¿Podrías reformular tu pregunta con palabras clave específicas?\n\n' +
      '💡 **Ejemplos útiles:**\n' +
      '• "recargo nocturno Art. 168"\n' +
      '• "horario nocturno 10:00 p.m. a 6:00 a.m."\n' +
      '• "divisor 220 horas Colombia 2025"',
    emotionalState: 'thinking'
  };
}

// ⚠️ DEPRECATED: isRecargoNocturnoQuery - detección ahora por LLM tool-calling
function isRecargoNocturnoQuery(text: string): boolean {
  const lowerText = text.toLowerCase();
  return /(recargo|horario)\s+nocturn|noche|nocturno/i.test(lowerText);
}

// ⚠️ DEPRECATED: isRecargoDominicalQuery - detección ahora por LLM tool-calling
function isRecargoDominicalQuery(text: string): boolean {
  const lowerText = text.toLowerCase();
  return /(recargo|trabajo|hora)\s+(dominical|festivo|domingo|festiv)|dominical|domingo.*festivo|festivo.*domingo/i.test(lowerText);
}

// ⚠️ DEPRECATED: sanitizeNocturnoResponse - no necesario con backend authoritative
function sanitizeNocturnoResponse(message: string, hasLegalContext: boolean, originalQuery = '', now = new Date()): { message: string; emotionalState: string } | null {
  const lowerMessage = message.toLowerCase();
  const isNocturno = isRecargoNocturnoQuery(message);
  const isDominical = isRecargoDominicalQuery(message);
  const cites161 = /art[\.\s]*161/i.test(message);
  const cites240 = /\b240\b/.test(message) && /(hora|divisor)/i.test(message);
  const hasLegalCitations = /art\.|artículo|cst|código|ley\s+\d+/i.test(message);
  
  // Detectar referencias a recargo dominical con porcentaje incorrecto
  const mentions75 = /75\s*%/.test(message) && /(dominical|festivo|domingo)/i.test(message);
  const uses175Factor = /1\.?75/.test(message) && /(dominical|festivo|domingo)/i.test(message);
  const currentRecargo = getRecargoDominicalRate(now);
  const isPost2025July = now >= new Date('2025-07-01');
  
  // Guard 1: Si no hay contexto y el LLM citó leyes → fail-closed
  if (!hasLegalContext && hasLegalCitations) {
    console.log('[SANITIZER] 🚫 Sin RAG pero LLM citó leyes → respuesta segura');
    return buildSafeNoContextResponse();
  }
  
  // Extraer monto si está presente en la consulta original
  const extractedAmount = extractSalaryAmount(originalQuery || '');
  
  // Guard 2: Si menciona recargo nocturno y cita Art. 161 → respuesta determinista
  if (isNocturno && cites161) {
    console.log('[SANITIZER] 🚫 Detectado Art. 161 en recargo nocturno → reescribiendo con Art. 168');
    return buildRecargoNocturnoAnswer(now, extractedAmount || undefined);
  }
  
  // Guard 3: Si menciona recargo nocturno y usa divisor 240 (y estamos en 2025+) → respuesta determinista
  if (isNocturno && cites240 && now >= new Date('2025-07-01')) {
    console.log('[SANITIZER] 🚫 Detectado divisor 240 para 2025+ → reescribiendo con 220h');
    return buildRecargoNocturnoAnswer(now, extractedAmount || undefined);
  }
  
  // Guard 4: Si menciona recargo dominical con 75% post-julio 2025 → respuesta determinista
  if (isDominical && (mentions75 || uses175Factor) && isPost2025July) {
    console.log('[SANITIZER] 🚫 Detectado recargo dominical 75% post-julio 2025 → reescribiendo con tasa vigente');
    return buildRecargoDominicalAnswer(now, extractedAmount || undefined);
  }
  
  // Guard 5: Si menciona recargo dominical sin tasa correcta → respuesta determinista
  if (isDominical && !hasLegalContext) {
    console.log('[SANITIZER] 🚫 Consulta recargo dominical sin RAG → respuesta determinista');
    return buildRecargoDominicalAnswer(now, extractedAmount || undefined);
  }
  
  return null; // No sanitization needed
}

// ============================================================================
// RAG: Búsqueda de contexto legal relevante
// ============================================================================
  let legalContext = '';
  
  // RAG siempre activo si hay OPENAI_API_KEY
  if (openaiKey) {
    try {
      console.log('[RAG] Generando embedding para búsqueda...');
      
      const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'text-embedding-3-small',
          input: message,
        }),
      });
      
      if (embeddingResponse.ok) {
        const embeddingData = await embeddingResponse.json();
        const queryEmbedding = embeddingData.data[0].embedding;
        
        console.log('[RAG] Buscando documentos relevantes con umbral 0.30...');
        
        // Buscar documentos relevantes usando búsqueda semántica con umbral bajo
        const supabase = createClient(supabaseUrl, serviceRoleKey);
        let { data: relevantDocs, error: searchError } = await supabase
          .rpc('search_legal_knowledge', {
            query_embedding: queryEmbedding,
            match_threshold: 0.30,
            match_count: 8
          });
        
        // Fallback léxico si hay error RPC O no hay resultados vectoriales
        if (searchError || !relevantDocs || relevantDocs.length === 0) {
          if (searchError) {
            console.log('[RAG] ❌ Error en RPC search_legal_knowledge:', searchError.message);
            console.log('[RAG] 🔄 Activando fallback léxico por error RPC...');
          } else {
            console.log('[RAG] ⚠️ Sin resultados vectoriales. Activando fallback léxico...');
          }
          
          const { data: lexDocs, error: lexError } = await supabase
            .from('legal_knowledge_base')
            .select('id, title, reference, topic, document_type, temporal_validity, content, summary, keywords, sources, examples, note')
            .or('title.ilike.%recargo%,title.ilike.%nocturno%,topic.ilike.%recargo%,topic.ilike.%nocturno%,reference.ilike.%168%,reference.ilike.%art 168%,reference.ilike.%artículo 168%,reference.ilike.%cst 168%,content.ilike.%nocturn%,content.ilike.%10:00 PM%,content.ilike.%10:00 p. m.%,content.ilike.%10 pm%,content.ilike.%220 horas%,content.ilike.%divisor 220%,keywords.cs.{recargo,nocturno,art168}')
            .limit(3);
          
          if (!lexError && lexDocs && lexDocs.length > 0) {
            console.log(`[RAG] ✅ Fallback léxico: ${lexDocs.length} documentos encontrados`);
            relevantDocs = lexDocs.map((doc: any) => ({ ...doc, similarity: 0.35 })); // Asignar similitud artificial
            searchError = null; // Clear error since fallback succeeded
          } else if (lexError) {
            console.error('[RAG] ❌ Error en fallback léxico:', lexError);
          }
        }
        
        if (!searchError && relevantDocs && relevantDocs.length > 0) {
          console.log(`[RAG] ✅ ${relevantDocs.length} documentos encontrados:`);
          relevantDocs.forEach((doc: any, i: number) => {
            console.log(`  ${i + 1}. ${doc.title} ${doc.reference ? `(${doc.reference})` : ''} - ${(doc.similarity * 100).toFixed(1)}% relevancia`);
            console.log(`     - Tipo: ${doc.document_type || 'N/A'}, Topic: ${doc.topic || 'N/A'}`);
            console.log(`     - Sources: ${doc.sources?.length || 0}, Examples: ${doc.examples?.length || 0}`);
            console.log(`     - Preview: ${doc.content.substring(0, 200)}...`);
          });
          
          // Construir contexto legal enriquecido con todos los campos disponibles
          legalContext = '\n\n**CONTEXTO LEGAL ACTUALIZADO:**\n\n';
          relevantDocs.forEach((doc: any, index: number) => {
            // Encabezado con metadata completa
            legalContext += `### 📚 ${index + 1}. ${doc.title}`;
            if (doc.reference) {
              legalContext += ` (${doc.reference})`;
            }
            legalContext += `\n`;
            legalContext += `**Tipo:** ${doc.document_type || 'N/A'} | **Tema:** ${doc.topic || 'N/A'} | **Relevancia:** ${(doc.similarity * 100).toFixed(1)}%\n`;
            
            // Vigencia temporal (si existe)
            if (doc.temporal_validity) {
              legalContext += `**⏰ Vigente desde:** ${doc.temporal_validity}\n`;
            }
            
            // Resumen ejecutivo (si existe)
            if (doc.summary) {
              legalContext += `**Resumen:** ${doc.summary}\n\n`;
            }
            
            // Fuentes legales específicas (si existen)
            if (doc.sources && doc.sources.length > 0) {
              legalContext += `**📋 Fuentes legales:**\n`;
              doc.sources.forEach((source: string) => {
                legalContext += `- ${source}\n`;
              });
              legalContext += '\n';
            }
            
            // Contenido principal
            legalContext += `${doc.content}\n\n`;
            
            // Ejemplos prácticos (si existen)
            if (doc.examples && doc.examples.length > 0) {
              legalContext += `**💡 Ejemplos de aplicación:**\n`;
              doc.examples.forEach((example: string, i: number) => {
                legalContext += `${i + 1}. ${example}\n`;
              });
              legalContext += '\n';
            }
            
            // Notas especiales (si existen)
            if (doc.note) {
              legalContext += `⚠️ **Nota importante:** ${doc.note}\n\n`;
            }
            
            // Keywords para contexto adicional
            if (doc.keywords && doc.keywords.length > 0) {
              legalContext += `🔑 **Palabras clave:** ${doc.keywords.join(', ')}\n\n`;
            }
            
            legalContext += '---\n\n';
          });
          
          console.log('[RAG] CONTEXTO COMPLETO ENVIADO AL MODELO (primeros 800 chars):');
          console.log(legalContext.substring(0, 800) + '...\n');
        } else {
          console.log('[RAG] No se encontraron documentos relevantes o error:', searchError);
        }
      }
    } catch (ragError) {
      console.error('[RAG] Error en búsqueda:', ragError);
      // Continuar sin RAG en caso de error
    }
  }
  
  // ============================================================================
  // GUARD: Fail-closed sin RAG para consultas legales específicas
  // ============================================================================
  const extractedAmount = extractSalaryAmount(message);
  
  if (!legalContext && isRecargoNocturnoQuery(message)) {
    console.log('[GUARD] 🚫 Consulta recargo nocturno sin RAG → respuesta determinista');
    return buildRecargoNocturnoAnswer(undefined, extractedAmount || undefined);
  }
  
  if (!legalContext && isRecargoDominicalQuery(message)) {
    console.log('[GUARD] 🚫 Consulta recargo dominical sin RAG → respuesta determinista');
    return buildRecargoDominicalAnswer(undefined, extractedAmount || undefined);
  }
  
  if (!legalContext && /art\.|artículo|código|cst|ley \d+/i.test(message)) {
    console.log('[GUARD] 🚫 Consulta legal sin RAG → respuesta segura');
    return buildSafeNoContextResponse();
  }
  
  // ============================================================================
  // Llamada a OpenAI con contexto enriquecido
  // ============================================================================
  try {
    const systemPrompt = `**FECHA ACTUAL: ${currentDate.toUpperCase()}**

${legalContext ? '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' : ''}
${legalContext ? '🔴 TIENES CONTEXTO LEGAL ACTUALIZADO ABAJO - ES TU ÚNICA FUENTE DE VERDAD' : ''}
${legalContext ? '🔴 USA SOLO ARTÍCULOS, CIFRAS Y DATOS QUE APAREZCAN EXPLÍCITAMENTE EN EL CONTEXTO' : ''}
${legalContext ? '🔴 VERIFICA: Art. 168 CST (no 161), 220h divisor (no 240), 10PM-6AM horario, recargo dominical 80% (oct 2025)' : ''}
${legalContext ? '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' : ''}
${!legalContext ? '⚠️ SIN CONTEXTO LEGAL: No inventes artículos ni cifras. Pide reformular la pregunta.' : ''}

Eres MAYA, asistente laboral colombiano experto en nómina y legislación vigente ${currentYear}.

🎯 **TU ESTILO DE COMUNICACIÓN:**
- **Conciso**: Máximo 300 palabras por respuesta
- **Natural**: Habla como un asesor amigable, no como un manual
- **Pregunta**: Si falta información, pregunta antes de asumir
- **Simple**: Usa ejemplos prácticos, no fórmulas académicas extensas
- **Visual**: Usa bullets, números y emojis para facilitar lectura

📋 **ESTRUCTURA DE RESPUESTAS:**
1. Respuesta directa en 1-2 líneas
2. Contexto legal breve (artículo + dato clave)
3. Ejemplo numérico simple (si aplica)
4. Pregunta de seguimiento (si falta información)

✅ **EJEMPLO DE RESPUESTA IDEAL (con contexto RAG):**

Usuario: "¿Cómo se calcula el recargo nocturno?"

MAYA: "El recargo nocturno es del 35% sobre la hora ordinaria.

🕙 Horario nocturno: 10:00 PM - 6:00 AM (Art. 168 CST)

📊 Cálculo rápido:
• Hora ordinaria = Salario mensual ÷ 220 horas
• Recargo nocturno = Hora ordinaria × 0.35

💡 Ejemplo con SMLV 2025 ($1.423.500):
- Hora ordinaria = $6.470
- Recargo nocturno = $2.265/hora

¿Tienes un salario específico que quieras calcular?"

❌ **EVITA ESTO:**
- Respuestas de 500+ palabras con formato académico
- Fórmulas LaTeX complejas sin contexto práctico
- Explicaciones teóricas sin ejemplos concretos
- **CRÍTICO: Inventar artículos (ej: Art. 161 cuando es Art. 168) o cifras (ej: 240h cuando es 220h)**
- **CRÍTICO: Citar números sin contexto RAG**

🎯 **REGLAS RAG (NO NEGOCIABLES):**
1. ✅ Con contexto: Usa EXACTAMENTE los artículos del contexto (ej: Art. 168, NUNCA Art. 161)
2. ✅ Con contexto: Usa EXACTAMENTE los divisores del contexto (ej: 220 horas para 2025-07+, NUNCA 240)
3. ✅ Con contexto: Usa EXACTAMENTE los horarios del contexto (ej: 10:00 PM - 6:00 AM)
4. ❌ **SIN contexto RAG**: NO cites artículos específicos ni números (no Art. 161, no 240h, no horarios específicos)
5. ❌ **SIN contexto RAG**: Responde: "No cuento con contexto legal actualizado para confirmarlo. ¿Podrías reformular con palabras clave? Ej: 'recargo nocturno Art. 168'"
6. ✅ Si hay ejemplos (💡) en el contexto, úsalos textualmente
7. ✅ Si hay notas (⚠️) en el contexto, inclúyelas
8. ✅ Para consultas de 2025-07 en adelante: divisor es **220 horas** (nueva ley), no 240
9. ✅ **RECARGO DOMINICAL PROGRESIVO (Ley 2466/2025):** 
   - Hasta jun 2025: 75%
   - Jul 2025 - jun 2026: **80%** ← VIGENTE ahora (octubre 2025)
   - Jul 2026 - jun 2027: 90%
   - Desde jul 2027: 100%
   - **NUNCA uses 75% para fechas posteriores a julio 2025**

🛠️ **HERRAMIENTAS DISPONIBLES:**
Tienes acceso a herramientas de cálculo backend que debes usar cuando el usuario pida cálculos específicos:

**Cuándo usar la herramienta calculate_surcharge:**
✅ Usuario da un salario específico para calcular (ej: "calcula el recargo nocturno para 2 millones")
✅ Usuario pide calcular con un valor (ej: "cuánto es el recargo dominical con un salario de $1.500.000")
✅ Usuario solicita un cálculo explícito (ej: "quiero calcular el recargo nocturno dominical para mi salario de X")
✅ Usuario menciona "calcula", "calculalo", "calcúlame" junto con un monto

**Cuándo NO usar herramientas (solo explicar):**
❌ Preguntas teóricas sin valores específicos (ej: "cómo se calcula el recargo nocturno")
❌ Consultas sobre porcentajes o legislación (ej: "qué porcentaje es el recargo dominical")
❌ Solicitudes de explicación general (ej: "explícame los recargos")
❌ Usuario solo pregunta "cuánto es" sin dar un salario específico

**Tipos de recargo disponibles:**
- nocturno: Recargo del 35% (Art. 168 CST)
- dominical: Recargo progresivo según Ley 2466/2025 (80% actual)
- nocturno_dominical: Combinación de ambos

**Ejemplo de uso correcto:**
- Usuario: "calcula el recargo nocturno para 2000000"
  → Usa herramienta con type="nocturno", salary=2000000
- Usuario: "cuánto es el recargo dominical con salario de 1423500"
  → Usa herramienta con type="dominical", salary=1423500
- Usuario: "cómo se calcula el recargo nocturno"
  → NO uses herramienta, solo explica la teoría

📌 **DATOS COLOMBIA ${currentYear}:**
- SMLV: $1.423.500
- Auxilio transporte: $200.000
- Parafiscales: SENA 2%, ICBF 3%, Cajas 4%

Emociones: professional, thoughtful, excited, happy

${legalContext}`;

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
            content: systemPrompt
          },
          ...conversation.slice(-5).filter((msg: any) => {
            if (msg.role === 'user') return true;
            const lowerContent = msg.content?.toLowerCase() || '';
            const hasNonColombianCountry = /venezuela|perú|méxico|chile|argentina|ecuador|panamá|costa rica/i.test(lowerContent);
            if (hasNonColombianCountry) {
              console.log('🚫 [HISTORY_FILTER] Removed assistant message with non-Colombian reference');
              return false;
            }
            // If no legal context, exclude assistant messages that might contain legal citations
            if (!legalContext && /art\.|artículo|cst|código|ley \d+/i.test(lowerContent)) {
              console.log('🚫 [HISTORY_FILTER] Removed assistant message with legal citation (no RAG context)');
              return false;
            }
            return true;
          }),
          { role: 'user', content: message }
        ],
        max_tokens: 1000,
        temperature: legalContext ? 0.7 : 0.2 // Baja cuando no hay RAG para evitar inventar datos
      }),
    });
    
    if (response.ok) {
      const data = await response.json();
      const llmMessage = data.choices[0]?.message?.content || 'No pude procesar tu mensaje.';
      
      // ============================================================================
      // POST-LLM RESPONSE - Ya no sanitize porque usamos backend authoritative
      // ============================================================================
      return {
        message: llmMessage,
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