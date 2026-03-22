// ============================================================================
// Cost-Aware Router — PRD v2.2
// ============================================================================
// Uses SimpleIntentMatcher (pure regex, zero AI cost) to decide:
//   confidence ≥ threshold + data found   →  KISS path         ($0, <300ms)
//   confidence ≥ threshold + data missing →  kiss_legal_fallback / kiss_clarify / kiss_configure
//   confidence < threshold                →  DAG path           ($0.003–$0.140, 700ms–2500ms)
//
// Threshold default: 0.90 (configurable via KISS_CONFIDENCE_THRESHOLD env var)
// ============================================================================

import { SimpleIntentMatcher } from '../maya-intelligence/SimpleIntentMatcher.ts';
import type { RoutingDecision, FallbackHint } from '../_shared/multiagent-types.ts';

// Keywords that suggest multi-agent reasoning is needed (DAG path)
const COMPLEX_KEYWORDS = [
  'proyección', 'proyeccion',
  'comparar', 'comparación',
  'por qué', 'por que',
  'histórico', 'historico',
  'incremento salarial', 'incremento del smlmv',
  'cuánto costaría', 'cuanto costaria',
  'si subo', 'si aumentamos',
  'análisis', 'analisis',
  'qué pasa si', 'que pasa si',
  'simulación', 'simulacion',
  'what if',
  'impacto', 'proyectar',
];

// ── Fallback strategies per intent — source of truth for data_not_found ──────
// Any new intent MUST define its strategy here before being implemented.
export const FALLBACK_STRATEGIES: Record<string, FallbackHint> = {
  SMLMV_VALUE: {
    sensitivity: 'legal_critical', strategy: 'escalate_legal',
    legal_query: 'SMLMV salario mínimo mensual vigente decreto',
    legal_cache_ttl: 86400, legal_source_hint: 'Decreto SMLMV',
  },
  UVT_VALUE: {
    sensitivity: 'legal_critical', strategy: 'escalate_legal',
    legal_query: 'UVT unidad valor tributario resolución DIAN',
    legal_cache_ttl: 86400, legal_source_hint: 'Resolución DIAN UVT',
  },
  TRANSPORT_ALLOWANCE: {
    sensitivity: 'legal_critical', strategy: 'escalate_legal',
    legal_query: 'auxilio de transporte decreto vigente',
    legal_cache_ttl: 86400, legal_source_hint: 'Decreto auxilio transporte',
  },
  DOMAIN_DEFINITION: {
    sensitivity: 'legal_critical', strategy: 'escalate_legal',
    legal_query: 'porcentajes aportes salud pensión ARL SENA ICBF',
    legal_cache_ttl: 3600, legal_source_hint: 'Ley 100 CST aportes parafiscales',
  },
  EMPLOYEE_SEARCH: {
    sensitivity: 'company_data', strategy: 'clarify',
    clarify_message: 'No encontré ningún empleado con ese nombre.',
    clarify_hint: '¿Tienes su número de cédula o su apellido completo?',
  },
  EMPLOYEE_PAYROLL_HISTORY: {
    sensitivity: 'company_data', strategy: 'clarify',
    clarify_message: 'No encontré historial de nómina para ese empleado.',
    clarify_hint: '¿Puedes confirmar el nombre completo o la cédula?',
  },
  PAYROLL_TOTALS: {
    sensitivity: 'company_data', strategy: 'inform_with_disclaimer',
    disclaimer: 'No hay liquidaciones en ese rango. Prueba con un período diferente.',
  },
  ACTIVE_PERIOD: {
    sensitivity: 'configuration', strategy: 'configure',
    configure_message: 'No hay un período de nómina activo en este momento.',
    configure_url: '/modules/payroll',
  },
  EMPLOYEE_COUNT: {
    sensitivity: 'configuration', strategy: 'configure',
    configure_message: 'Aún no hay empleados registrados en la empresa.',
    configure_url: '/modules/employees/create',
  },
  PENDING_ALERTS: {
    sensitivity: 'company_data', strategy: 'inform_with_disclaimer',
    disclaimer: 'No hay alertas pendientes en este momento.',
  },
  EMPLOYEE_LIST: {
    sensitivity: 'company_data', strategy: 'configure',
    configure_message: 'No hay empleados registrados en la empresa.',
    configure_url: '/modules/employees/create',
  },
};

// Cache TTL per intent type (seconds)
export const KISS_CACHE_TTL: Record<string, number> = {
  EMPLOYEE_LIST:        300,   //  5 min
  EMPLOYEE_SEARCH:       60,   //  1 min
  EMPLOYEE_COUNT:       300,   //  5 min
  DOMAIN_DEFINITION:   3600,   //  1 hour — conceptual, rarely changes
  PAYROLL_TOTALS:       120,   //  2 min — can change with liquidations
  RECENT_PERIODS:       120,   //  2 min
  PAYROLL_BY_MONTH:     300,   //  5 min
  ACTIVE_PERIOD:        600,   // 10 min
  SMLMV_VALUE:        86400,   // 24 hours — changes once a year
  UVT_VALUE:          86400,   // 24 hours — changes once a year
  TRANSPORT_ALLOWANCE:86400,   // 24 hours — changes once a year
  PENDING_ALERTS:        60,   //  1 min — high volatility
  EMPLOYEE_SALARY:       60,   //  1 min — can change
};

export class CostAwareRouter {
  private readonly threshold: number;

  constructor(threshold = 0.90) {
    this.threshold = Math.max(0, Math.min(1, threshold));
  }

  /**
   * Evaluate a query and decide whether it should go through KISS or DAG.
   * Never throws — always returns a routing decision.
   */
  route(query: string): RoutingDecision {
    let kissResult: ReturnType<typeof SimpleIntentMatcher.match> | null = null;

    try {
      kissResult = SimpleIntentMatcher.match(query);
    } catch {
      // SimpleIntentMatcher failed — route to DAG as safe fallback
      return {
        path: 'dag',
        confidence: 0,
        threshold_used: this.threshold,
        reason: 'SimpleIntentMatcher threw — defaulting to DAG',
        estimated_cost: 0.003,
      };
    }

    // Force DAG if query contains complex analytical keywords — regardless of KISS confidence
    const lq = query.toLowerCase();
    const complexHit = COMPLEX_KEYWORDS.find(k => lq.includes(k));
    if (complexHit) {
      const estimatedCost = this.estimateDagCost(query);
      return {
        path: 'dag',
        confidence: kissResult?.confidence ?? 0,
        matched_intent: kissResult?.type,
        threshold_used: this.threshold,
        reason: `complex keyword "${complexHit}" detected — forced DAG`,
        estimated_cost: estimatedCost,
      };
    }

    if (kissResult && kissResult.confidence >= this.threshold) {
      return {
        path: 'kiss',
        confidence: kissResult.confidence,
        matched_intent: kissResult.type,
        kiss_params: kissResult.params ?? {},
        threshold_used: this.threshold,
        reason: `SimpleIntentMatcher matched ${kissResult.type} (confidence ${kissResult.confidence.toFixed(2)})`,
        estimated_cost: 0,
      };
    }

    const estimatedCost = this.estimateDagCost(query);
    return {
      path: 'dag',
      confidence: kissResult?.confidence ?? 0,
      matched_intent: kissResult?.type,
      threshold_used: this.threshold,
      reason: `confidence ${(kissResult?.confidence ?? 0).toFixed(2)} < ${this.threshold} — requires DAG`,
      estimated_cost: estimatedCost,
    };
  }

  /** Heuristic cost estimation based on query complexity keywords */
  private estimateDagCost(query: string): number {
    const lq = query.toLowerCase();
    const hits = COMPLEX_KEYWORDS.filter(k => lq.includes(k)).length;
    if (hits === 0) return 0.003;   // 1 agent, simple
    if (hits <= 2)  return 0.058;   // 2 agents in parallel
    return 0.140;                   // full DAG, 3–4 agents
  }

  /** Cache TTL for a given KISS intent (seconds) */
  getCacheTTL(intent: string): number {
    return KISS_CACHE_TTL[intent] ?? 120;
  }

  /** Build cache key: deterministic hash of company + intent + params */
  buildCacheKey(companyId: string, intent: string, params: Record<string, unknown>): string {
    const paramsStr = JSON.stringify(params, Object.keys(params).sort());
    return `${companyId}:${intent}:${paramsStr}`;
  }

  /**
   * Build legal cache key — shared across ALL companies.
   * The decree is the same for every company: key has no company_id.
   * Example: "legal:smlmv_value:2026"
   */
  buildLegalCacheKey(intent: string, year: string | number): string {
    return `legal:${intent.toLowerCase()}:${year}`;
  }

  /**
   * Given a KISS intent where data was NOT found in DB, return the correct
   * routing decision based on the FALLBACK_STRATEGIES map.
   */
  routeDataNotFound(
    intent: string,
    confidence: number,
    kissParams: Record<string, unknown>
  ): RoutingDecision {
    const hint = FALLBACK_STRATEGIES[intent];

    if (!hint) {
      // No strategy defined → escalate to DAG for safety
      return {
        path: 'dag',
        confidence,
        matched_intent: intent,
        kiss_params: kissParams,
        threshold_used: this.threshold,
        reason: `data_not_found — no strategy defined for ${intent} — escalating to DAG`,
        estimated_cost: 0.003,
        kiss_status: 'data_not_found',
      };
    }

    const pathMap: Record<string, RoutingDecision['path']> = {
      escalate_legal:          'kiss_legal_fallback',
      clarify:                 'kiss_clarify',
      configure:               'kiss_configure',
      inform_with_disclaimer:  'kiss',
    };

    return {
      path:            pathMap[hint.strategy] ?? 'kiss_clarify',
      confidence,
      matched_intent:  intent,
      kiss_params:     kissParams,
      threshold_used:  this.threshold,
      reason:          `data_not_found — strategy: ${hint.strategy}`,
      estimated_cost:  hint.strategy === 'escalate_legal' ? 0.001 : 0,
      kiss_status:     'data_not_found',
      data_sensitivity: hint.sensitivity,
      fallback_hint:   hint,
    };
  }
}
