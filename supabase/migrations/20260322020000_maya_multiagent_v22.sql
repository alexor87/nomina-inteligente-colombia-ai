-- ============================================================================
-- Maya PRD v2.2 — Telemetría de routing + Sistema de Cuotas
-- ============================================================================

-- ── Telemetría de routing en agent_execution_plans ────────────────────────
ALTER TABLE agent_execution_plans
  ADD COLUMN IF NOT EXISTS routing_path text
    CHECK (routing_path IN ('kiss', 'kiss_legal_fallback', 'kiss_clarify', 'kiss_configure', 'dag')),
  ADD COLUMN IF NOT EXISTS routing_confidence numeric(3,2),
  ADD COLUMN IF NOT EXISTS kiss_status text
    CHECK (kiss_status IN ('resolved', 'data_not_found', 'low_confidence')),
  ADD COLUMN IF NOT EXISTS from_cache boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS data_sensitivity text
    CHECK (data_sensitivity IN ('legal_critical', 'company_data', 'configuration', 'historical'));

-- ── Tabla de cuotas por empresa ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS company_quota_usage (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id          uuid        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  plan_tier           text        NOT NULL CHECK (plan_tier IN ('esencial', 'profesional', 'empresarial')),
  period_start        date        NOT NULL,
  period_end          date        NOT NULL,
  -- Counters
  maya_queries_used   integer     NOT NULL DEFAULT 0,   -- queries that consumed quota (DAG / legal miss)
  kiss_queries_total  integer     NOT NULL DEFAULT 0,   -- free queries (telemetry only)
  total_tokens_used   bigint      NOT NULL DEFAULT 0,
  estimated_cost_usd  numeric(8,4) NOT NULL DEFAULT 0,
  -- Control
  last_query_at       timestamptz,
  anomaly_flagged     boolean     DEFAULT false,
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now(),
  UNIQUE (company_id, period_start)
);

CREATE INDEX IF NOT EXISTS idx_quota_company_period
  ON company_quota_usage (company_id, period_start DESC);

CREATE INDEX IF NOT EXISTS idx_quota_anomaly
  ON company_quota_usage (anomaly_flagged)
  WHERE anomaly_flagged = true;

ALTER TABLE company_quota_usage ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'company_quota_usage'
      AND policyname = 'company_rls'
  ) THEN
    CREATE POLICY company_rls ON company_quota_usage
      USING (
        company_id = (
          SELECT company_id FROM user_roles
          WHERE user_id = auth.uid()
          LIMIT 1
        )
      );
  END IF;
END;
$$;

-- ── RPC para incremento atómico del contador ───────────────────────────────
CREATE OR REPLACE FUNCTION increment_quota_usage(
  p_company_id   uuid,
  p_period_start date,
  p_cost         numeric DEFAULT 0
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE company_quota_usage
  SET
    maya_queries_used   = maya_queries_used + 1,
    estimated_cost_usd  = estimated_cost_usd + p_cost,
    last_query_at       = now(),
    updated_at          = now()
  WHERE
    company_id   = p_company_id
    AND period_start = p_period_start;
END;
$$;
