// ============================================================================
// Cost-Aware Router — PRD v2.1
// ============================================================================
// Uses SimpleIntentMatcher (pure regex, zero AI cost) to decide:
//   confidence ≥ threshold  →  KISS path  ($0, <300ms)
//   confidence < threshold  →  DAG path   ($0.003–$0.140, 700ms–2500ms)
//
// Threshold default: 0.90 (configurable via KISS_CONFIDENCE_THRESHOLD env var)
// ============================================================================

import { SimpleIntentMatcher } from '../maya-intelligence/SimpleIntentMatcher.ts';
import type { RoutingDecision } from '../_shared/multiagent-types.ts';

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
}
