// ============================================================================
// TokenBudgetService — Maya PRD v2.2 — Quota System
// ============================================================================
// Tracks "Maya queries" consumed per company per month.
// Only DAG and kiss_legal_fallback (cache miss) consume quota.
// KISS hits and cache hits are always free.
//
// Plans:
//   esencial:    30 queries/month
//   profesional: 150 queries/month
//   empresarial: unlimited (monitored for anomalies)
// ============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type { BudgetDecision, QuotaStatus, QuotaAlertState, PlanTier } from './multiagent-types.ts';

export const PLAN_LIMITS: Record<PlanTier, number | null> = {
  esencial:    30,
  profesional: 150,
  empresarial: null,  // unlimited
};

// Alert thresholds (percentage of monthly quota)
const ALERT_THRESHOLDS = {
  warning:   80,
  critical:  95,
  exhausted: 100,
} as const;

function startOfMonth(d: Date): string {
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

function endOfMonth(d: Date): string {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10);
}

function startOfNextMonth(d: Date): string {
  return new Date(d.getFullYear(), d.getMonth() + 1, 1).toISOString().slice(0, 10);
}

function getAlertState(pct: number, limit: number | null): QuotaAlertState {
  if (!limit) return 'ok';
  if (pct >= ALERT_THRESHOLDS.exhausted) return 'exhausted';
  if (pct >= ALERT_THRESHOLDS.critical)  return 'critical';
  if (pct >= ALERT_THRESHOLDS.warning)   return 'warning';
  return 'ok';
}

function buildUpgradeMessage(quota: QuotaStatus): string {
  const resetDate = new Date(quota.resets_at).toLocaleDateString('es-CO', {
    day: 'numeric', month: 'long'
  });
  const nextPlan = quota.plan === 'esencial' ? 'Profesional' : 'Empresarial';
  const nextLimit = quota.plan === 'esencial' ? '150' : 'ilimitadas';
  return (
    `Alcanzaste tus ${quota.monthly_limit} consultas Maya de este mes. ` +
    `Tu cuota se renueva el ${resetDate}. ` +
    `Con el Plan ${nextPlan} tendrías ${nextLimit} consultas al mes.`
  );
}

export class TokenBudgetService {
  private readonly adminClient: ReturnType<typeof createClient>;

  constructor(supabaseUrl: string, serviceRoleKey: string) {
    this.adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });
  }

  /**
   * Check if the company can consume one more Maya query.
   * Never throws — defaults to can_consume: true on error (fail open).
   */
  async checkBudget(companyId: string): Promise<BudgetDecision> {
    try {
      const quota = await this.getQuotaStatus(companyId);

      // Empresarial = unlimited
      if (quota.monthly_limit === null) {
        return { can_consume: true, quota_status: quota, fallback_mode: 'full_maya' };
      }

      if (quota.percentage_used < 100) {
        return { can_consume: true, quota_status: quota, fallback_mode: 'full_maya' };
      }

      // Quota exhausted
      return {
        can_consume:     false,
        quota_status:    quota,
        fallback_mode:   'kiss_with_upgrade_cta',
        upgrade_message: buildUpgradeMessage(quota),
      };
    } catch {
      // Fail open — never block the user due to a quota check error
      return {
        can_consume:   true,
        quota_status:  { plan: 'empresarial', monthly_limit: null, consumed_this_month: 0,
                         remaining: null, resets_at: startOfNextMonth(new Date()),
                         percentage_used: 0, alert_state: 'ok' },
        fallback_mode: 'full_maya',
      };
    }
  }

  /**
   * Increment the consumed counter by 1.
   * Only call this AFTER a successful DAG or kiss_legal_fallback (cache miss).
   */
  async consume(event: {
    companyId:        string;
    routingPath:      string;
    agentCount?:      number;
    estimatedCostUsd?: number;
  }): Promise<void> {
    const now = new Date();
    const periodStart = startOfMonth(now);
    const periodEnd   = endOfMonth(now);

    // Get current plan from companies table (graceful fallback to 'esencial')
    let planTier: PlanTier = 'esencial';
    try {
      const { data } = await this.adminClient
        .from('companies')
        .select('plan_tier')
        .eq('id', event.companyId)
        .single();
      if (data?.plan_tier && data.plan_tier in PLAN_LIMITS) {
        planTier = data.plan_tier as PlanTier;
      }
    } catch { /* use default */ }

    await this.adminClient
      .from('company_quota_usage')
      .upsert(
        {
          company_id:         event.companyId,
          plan_tier:          planTier,
          period_start:       periodStart,
          period_end:         periodEnd,
          maya_queries_used:  1,
          estimated_cost_usd: event.estimatedCostUsd ?? 0,
          last_query_at:      now.toISOString(),
          updated_at:         now.toISOString(),
        },
        {
          onConflict:         'company_id,period_start',
          ignoreDuplicates:   false,
        }
      );

    // Increment with raw SQL to avoid race conditions on the counter
    await this.adminClient.rpc('increment_quota_usage', {
      p_company_id:   event.companyId,
      p_period_start: periodStart,
      p_cost:         event.estimatedCostUsd ?? 0,
    });
  }

  /** Get current quota status for a company */
  async getQuotaStatus(companyId: string): Promise<QuotaStatus> {
    const now          = new Date();
    const periodStart  = startOfMonth(now);

    // Get plan
    let plan: PlanTier = 'esencial';
    try {
      const { data } = await this.adminClient
        .from('companies')
        .select('plan_tier')
        .eq('id', companyId)
        .single();
      if (data?.plan_tier && data.plan_tier in PLAN_LIMITS) {
        plan = data.plan_tier as PlanTier;
      }
    } catch { /* use default */ }

    // Get usage for current month
    const { data: usage } = await this.adminClient
      .from('company_quota_usage')
      .select('maya_queries_used')
      .eq('company_id', companyId)
      .eq('period_start', periodStart)
      .single();

    const consumed = usage?.maya_queries_used ?? 0;
    const limit    = PLAN_LIMITS[plan];
    const pct      = limit ? Math.min(100, Math.round((consumed / limit) * 100)) : 0;

    return {
      plan,
      monthly_limit:        limit,
      consumed_this_month:  consumed,
      remaining:            limit !== null ? Math.max(0, limit - consumed) : null,
      resets_at:            startOfNextMonth(now),
      percentage_used:      pct,
      alert_state:          getAlertState(pct, limit),
    };
  }
}
