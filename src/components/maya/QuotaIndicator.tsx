import React, { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import type { QuotaStatus, QuotaAlertState } from '../../../../supabase/functions/_shared/multiagent-types';

interface QuotaIndicatorProps {
  companyId: string;
  /** Optional: inject quota directly (useful in tests or when parent fetches it) */
  quota?: QuotaStatus;
}

// ── Hook to fetch quota from the execution engine / supabase ──────────────────
function useQuotaStatus(companyId: string, externalQuota?: QuotaStatus) {
  const [quota, setQuota] = useState<QuotaStatus | null>(externalQuota ?? null);

  useEffect(() => {
    if (externalQuota) {
      setQuota(externalQuota);
      return;
    }
    if (!companyId) return;

    // Lazy import to avoid circular deps
    import('@/integrations/supabase/client').then(({ supabase }) => {
      const today       = new Date();
      const periodStart = new Date(today.getFullYear(), today.getMonth(), 1)
        .toISOString().slice(0, 10);

      supabase
        .from('company_quota_usage')
        .select('maya_queries_used, plan_tier, period_start')
        .eq('company_id', companyId)
        .eq('period_start', periodStart)
        .maybeSingle()
        .then(({ data }) => {
          if (!data) {
            setQuota({
              plan: 'esencial', monthly_limit: 30,
              consumed_this_month: 0, remaining: 30,
              resets_at: new Date(today.getFullYear(), today.getMonth() + 1, 1).toISOString().slice(0, 10),
              percentage_used: 0, alert_state: 'ok',
            });
            return;
          }

          const tier    = (data.plan_tier ?? 'esencial') as QuotaStatus['plan'];
          const limits: Record<string, number | null> = { esencial: 30, profesional: 150, empresarial: null };
          const limit   = limits[tier] ?? 30;
          const used    = data.maya_queries_used ?? 0;
          const pct     = limit ? Math.min(100, Math.round((used / limit) * 100)) : 0;

          const alertState: QuotaAlertState =
            !limit         ? 'ok'
            : pct >= 100   ? 'exhausted'
            : pct >= 95    ? 'critical'
            : pct >= 80    ? 'warning'
            : 'ok';

          setQuota({
            plan: tier, monthly_limit: limit,
            consumed_this_month: used,
            remaining: limit !== null ? Math.max(0, limit - used) : null,
            resets_at: new Date(today.getFullYear(), today.getMonth() + 1, 1).toISOString().slice(0, 10),
            percentage_used: pct,
            alert_state: alertState,
          });
        });
    });
  }, [companyId, externalQuota]);

  return quota;
}

// ── Component ─────────────────────────────────────────────────────────────────

export const QuotaIndicator: React.FC<QuotaIndicatorProps> = ({ companyId, quota: externalQuota }) => {
  const quota = useQuotaStatus(companyId, externalQuota);

  // Plan empresarial or loading — render nothing
  if (!quota || quota.monthly_limit === null) return null;

  const { alert_state, remaining, percentage_used } = quota;

  // OK — subtle text
  if (alert_state === 'ok') {
    return (
      <span style={{ fontSize: 12, color: 'var(--muted-foreground)', userSelect: 'none' }}>
        {remaining} consultas Maya restantes
      </span>
    );
  }

  // Warning (80–94%) — amber progress bar
  if (alert_state === 'warning') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 80, height: 4, borderRadius: 2, background: 'var(--muted)' }}>
          <div
            style={{
              width: `${percentage_used}%`, height: '100%',
              borderRadius: 2, background: '#EF9F27', transition: 'width 0.3s ease',
            }}
          />
        </div>
        <span style={{ fontSize: 12, color: '#BA7517' }}>
          {remaining} restantes
        </span>
      </div>
    );
  }

  // Critical (95–99%) — amber badge
  if (alert_state === 'critical') {
    return (
      <Badge
        variant="outline"
        style={{
          fontSize: 11, padding: '2px 8px', borderRadius: 20,
          background: 'var(--amber-50, #fffbeb)',
          color: '#B45309',
          borderColor: '#FCD34D',
        }}
      >
        {remaining} consultas restantes
      </Badge>
    );
  }

  // Exhausted (100%) — red badge
  return (
    <Badge
      variant="outline"
      style={{
        fontSize: 11, padding: '2px 8px', borderRadius: 20,
        background: 'var(--destructive-50, #fef2f2)',
        color: 'var(--destructive, #DC2626)',
        borderColor: 'var(--destructive, #DC2626)',
      }}
    >
      Límite alcanzado
    </Badge>
  );
};

export default QuotaIndicator;
