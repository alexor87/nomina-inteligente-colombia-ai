// ============================================================================
// Maya Multi-Agent DAG v2.1 — Shared Types
// PRD v2.1 — Cost-Aware Routing + DAG Architecture
// ============================================================================

export type AgentType = 'nomina' | 'legal' | 'analytics' | 'alertas';
export type RoutingPath = 'kiss' | 'dag' | 'kiss_legal_fallback' | 'kiss_clarify' | 'kiss_configure';

// ── Cost-Aware Router ────────────────────────────────────────────────────────

export interface RoutingDecision {
  path: RoutingPath;
  confidence: number;           // 0.0–1.0 from SimpleIntentMatcher
  matched_intent?: string;      // if KISS resolved it, which intent
  kiss_params?: Record<string, unknown>; // params from SimpleIntentMatcher (e.g. { term: 'EPS' })
  threshold_used: number;       // configurable via VITE_KISS_CONFIDENCE_THRESHOLD
  reason: string;               // for debugging and telemetry
  estimated_cost: number;       // estimated USD cost if going through DAG
  from_cache?: boolean;
  // v2.2
  kiss_status?: KissResolutionStatus;
  data_sensitivity?: DataSensitivity;
  fallback_hint?: FallbackHint;
}

// ── Agent Communication Contract ────────────────────────────────────────────

export interface SideAlert {
  type: 'critical' | 'warning' | 'info';
  category: string;
  message: string;
  action_required: boolean;
  action_url?: string;
}

export interface UpstreamResult {
  agent: AgentType;
  invocation_id: string;
  data: Record<string, unknown>;
  summary: string;
  confidence: number;
}

/** Maya → Agent (input) */
export interface AgentRequest {
  // Traceability
  plan_id: string;
  invocation_id: string;
  company_id: string;
  user_id: string;
  session_id: string;

  // The query
  query: string;
  intent: string;
  params: Record<string, unknown>;

  // Outputs injected from prior DAG phases
  upstream_results: UpstreamResult[];

  // Conversational context (last N turns)
  conversation_history: Array<{ role: 'user' | 'assistant'; content: string }>;

  // Control
  max_tokens: number;
  timeout_ms: number;
}

/** Agent → Maya (output) */
export interface AgentResponse {
  invocation_id: string;
  data: Record<string, unknown>;
  summary: string;               // natural language summary for the Consolidator

  side_alerts: SideAlert[];      // opportunistic alerts detected during processing
  confidence: number;            // 0.0–1.0 — honesty metric
  sources: string[];             // tables, edge fns, legal articles used
  latency_ms: number;

  needs_escalation: boolean;
  escalation_reason?: string;
  suggested_followup?: string;

  // Backward compatibility with agent-nomina v2.0
  success?: boolean;
  explanation?: string;
  executable_actions?: unknown[];
  quick_replies?: string[];
  error?: string;
}

// ── DAG Plan Types ────────────────────────────────────────────────────────────

export interface AgentInvocation {
  invocation_id: string;
  agent: AgentType;
  intent: string;
  params: Record<string, unknown>;
  inject_from: AgentType[];  // which upstream agents' results to inject
  optional: boolean;          // if true, plan continues even if this agent fails
  cache_key?: string;
}

export interface ExecutionPhase {
  phase_id: number;
  label: string;
  run_parallel: boolean;         // true = Promise.all, false = sequential
  depends_on_phases: number[];   // phase_ids that must complete first
  timeout_ms: number;
  invocations: AgentInvocation[];
}

export interface ExecutionPlan {
  plan_id: string;
  query: string;
  intent: string;
  phases: ExecutionPhase[];
  estimated_ms: number;
  rationale: string;             // why this plan was chosen (for debug)
  created_at: string;
  fallback_to_kiss: boolean;
}

// ── Engine Request/Response (frontend ↔ maya-execution-engine) ───────────────

/** Request body accepted by maya-execution-engine */
export interface EngineRequest {
  query: string;
  conversation: Array<{ role: 'user' | 'assistant'; content: string }>;
  companyId: string;
  userId?: string;
  sessionId?: string;
  wantsStreaming?: boolean;
  // Forwarded context from frontend
  context?: {
    employees?: unknown[];
    currentPayroll?: unknown;
    dashboardData?: unknown;
    currentPeriodId?: string;
    smlmvActual?: number;
    empleadosCount?: number;
  };
}

/** Response body returned by maya-execution-engine (same shape as maya-intelligence) */
export interface EngineResponse {
  message: string;
  executableActions?: unknown[];
  quickReplies?: string[];
  emotionalState?: string;
  planId?: string;
  routing?: RoutingDecision;  // telemetry: which path was taken
}

// ============================================================================
// Maya v2.2 — KISS Resolution States & Fallback Strategies
// ============================================================================

export type KissResolutionStatus = 'resolved' | 'data_not_found' | 'low_confidence';

export type DataSensitivity = 'legal_critical' | 'company_data' | 'configuration' | 'historical';

export interface FallbackHint {
  sensitivity:         DataSensitivity;
  strategy:            'escalate_legal' | 'clarify' | 'configure' | 'inform_with_disclaimer';
  // escalate_legal
  legal_query?:        string;
  legal_cache_ttl?:    number;
  legal_source_hint?:  string;
  // clarify
  clarify_message?:    string;
  clarify_hint?:       string;
  // configure
  configure_message?:  string;
  configure_url?:      string;
  // inform_with_disclaimer
  disclaimer?:         string;
}

// ============================================================================
// Maya v2.2 — Quota System
// ============================================================================

export type PlanTier = 'esencial' | 'profesional' | 'empresarial';
export type QuotaAlertState = 'ok' | 'warning' | 'critical' | 'exhausted';

export interface QuotaStatus {
  plan:                 PlanTier;
  monthly_limit:        number | null;  // null = unlimited (empresarial)
  consumed_this_month:  number;
  remaining:            number | null;
  resets_at:            string;         // ISO date string
  percentage_used:      number;         // 0–100
  alert_state:          QuotaAlertState;
}

export interface BudgetDecision {
  can_consume:      boolean;
  quota_status:     QuotaStatus;
  fallback_mode:    'full_maya' | 'kiss_only' | 'kiss_with_upgrade_cta';
  upgrade_message?: string;
}
