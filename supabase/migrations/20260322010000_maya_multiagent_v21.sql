-- Maya Multi-Agent v2.1 schema update
-- Adds Cost-Aware Router columns, KISS cache table, and enriches existing tables

-- ============================================================================
-- agent_execution_plans — add v2.1 columns
-- ============================================================================
ALTER TABLE public.agent_execution_plans
  ADD COLUMN IF NOT EXISTS query TEXT,                -- readable alias; populate from original_query
  ADD COLUMN IF NOT EXISTS intent TEXT,
  ADD COLUMN IF NOT EXISTS plan_json JSONB,           -- v2.1 name; populated alongside existing plan column
  ADD COLUMN IF NOT EXISTS total_latency_ms INTEGER,
  ADD COLUMN IF NOT EXISTS fallback_used BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS routing_path TEXT CHECK (routing_path IN ('kiss','dag')),
  ADD COLUMN IF NOT EXISTS routing_confidence NUMERIC(3,2),
  ADD COLUMN IF NOT EXISTS from_cache BOOLEAN NOT NULL DEFAULT false;

-- status: expand to include 'partial'
ALTER TABLE public.agent_execution_plans
  DROP CONSTRAINT IF EXISTS agent_execution_plans_status_check;
ALTER TABLE public.agent_execution_plans
  ADD CONSTRAINT agent_execution_plans_status_check
    CHECK (status IN ('pending','running','completed','failed','partial'));

-- ============================================================================
-- agent_invocations — add v2.1 columns
-- ============================================================================
ALTER TABLE public.agent_invocations
  ADD COLUMN IF NOT EXISTS invocation_id UUID DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS upstream_agents TEXT[],
  ADD COLUMN IF NOT EXISTS response_summary TEXT,
  ADD COLUMN IF NOT EXISTS confidence NUMERIC(3,2),
  ADD COLUMN IF NOT EXISTS tokens_used INTEGER;

-- status: expand to match v2.1 (success/failed/timeout/skipped)
ALTER TABLE public.agent_invocations
  DROP CONSTRAINT IF EXISTS agent_invocations_status_check;
ALTER TABLE public.agent_invocations
  ADD CONSTRAINT agent_invocations_status_check
    CHECK (status IN ('pending','running','completed','failed','success','timeout','skipped'));

-- Unique constraint on invocation_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_agent_invocations_invocation_id
  ON public.agent_invocations(invocation_id);

-- ============================================================================
-- agent_sessions — add v2.1 columns
-- ============================================================================
ALTER TABLE public.agent_sessions
  ADD COLUMN IF NOT EXISTS active_agents TEXT[],
  ADD COLUMN IF NOT EXISTS last_activity TIMESTAMPTZ DEFAULT now();

-- ============================================================================
-- agent_alerts — add v2.1 richer structure columns
-- ============================================================================
ALTER TABLE public.agent_alerts
  ADD COLUMN IF NOT EXISTS plan_id UUID REFERENCES public.agent_execution_plans(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS agent TEXT,
  ADD COLUMN IF NOT EXISTS alert_type_v21 TEXT CHECK (alert_type_v21 IN ('critical','warning','info')),
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS action_url TEXT,
  ADD COLUMN IF NOT EXISTS dismissed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;

-- ============================================================================
-- maya_kiss_cache — new table for KISS response caching with TTL
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.maya_kiss_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  cache_key TEXT NOT NULL,          -- "{company_id}:{intent}:{params_hash}"
  intent TEXT NOT NULL,
  response JSONB NOT NULL,          -- serialized EngineResponse
  ttl_seconds INTEGER NOT NULL DEFAULT 300,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, cache_key)
);

CREATE INDEX IF NOT EXISTS idx_kiss_cache_lookup
  ON public.maya_kiss_cache(company_id, cache_key, expires_at DESC);

CREATE INDEX IF NOT EXISTS idx_kiss_cache_expiry
  ON public.maya_kiss_cache(expires_at);

ALTER TABLE public.maya_kiss_cache ENABLE ROW LEVEL SECURITY;

-- Users can read/write cache for their own company
CREATE POLICY "company_owns_kiss_cache"
  ON public.maya_kiss_cache
  FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM public.profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- ============================================================================
-- cleanup_maya_kiss_cache — helper function to purge expired entries
-- Call this from a pg_cron job: SELECT cron.schedule('cleanup-kiss-cache', '0 * * * *', 'SELECT public.cleanup_maya_kiss_cache()');
-- ============================================================================
CREATE OR REPLACE FUNCTION public.cleanup_maya_kiss_cache()
RETURNS INTEGER LANGUAGE plpgsql AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.maya_kiss_cache WHERE expires_at < now();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;
