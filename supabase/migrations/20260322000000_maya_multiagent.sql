-- Maya Multi-Agent DAG Architecture
-- Tables: agent_execution_plans, agent_invocations, agent_sessions, agent_alerts

-- ============================================================================
-- agent_execution_plans: persists complete DAG execution plan
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.agent_execution_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  original_query TEXT NOT NULL,
  plan JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_agent_plans_company ON public.agent_execution_plans(company_id, created_at DESC);
CREATE INDEX idx_agent_plans_session ON public.agent_execution_plans(session_id);

-- ============================================================================
-- agent_invocations: tracks individual agent calls within a plan
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.agent_invocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES public.agent_execution_plans(id) ON DELETE CASCADE,
  agent_name TEXT NOT NULL CHECK (agent_name IN ('nomina', 'legal', 'analytics', 'alertas')),
  phase_index INT NOT NULL,
  input JSONB NOT NULL DEFAULT '{}'::jsonb,
  output JSONB,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  error TEXT,
  duration_ms INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_agent_invocations_plan ON public.agent_invocations(plan_id);

-- ============================================================================
-- agent_sessions: multi-turn session state per user+company
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.agent_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  context JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_plan_id UUID REFERENCES public.agent_execution_plans(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, user_id)
);

CREATE INDEX idx_agent_sessions_user ON public.agent_sessions(user_id, company_id);

-- ============================================================================
-- agent_alerts: proactive alerts with deduplication (replaces maya_proactive_alerts_sent)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.agent_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL,
  alert_hash TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sent', 'dismissed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ,
  UNIQUE(company_id, alert_hash)
);

CREATE INDEX idx_agent_alerts_company ON public.agent_alerts(company_id, created_at DESC);

-- ============================================================================
-- RLS policies
-- ============================================================================
ALTER TABLE public.agent_execution_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_invocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_owns_plans"
  ON public.agent_execution_plans
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_owns_invocations"
  ON public.agent_invocations
  FOR ALL
  USING (
    plan_id IN (
      SELECT id FROM public.agent_execution_plans WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "user_owns_sessions"
  ON public.agent_sessions
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "company_owns_alerts"
  ON public.agent_alerts
  FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM public.profiles WHERE id = auth.uid()
    )
  );
