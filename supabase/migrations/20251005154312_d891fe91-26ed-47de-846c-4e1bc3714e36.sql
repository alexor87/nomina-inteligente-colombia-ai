-- ============================================================================
-- MVE PHASE 1 & 2: Event Store + Session State + Idempotency
-- ============================================================================

-- ----------------------------------------------------------------------------
-- DAY 1: Event Store Foundation (conversation_events)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.conversation_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  flow_type TEXT,
  state_before JSONB,
  state_after JSONB,
  transition_reason TEXT,
  error_data JSONB,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_conversation_events_session ON public.conversation_events(session_id);
CREATE INDEX idx_conversation_events_company ON public.conversation_events(company_id);
CREATE INDEX idx_conversation_events_created ON public.conversation_events(created_at DESC);
CREATE INDEX idx_conversation_events_type ON public.conversation_events(event_type);

-- RLS Policies
ALTER TABLE public.conversation_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their company conversation events"
  ON public.conversation_events
  FOR SELECT
  USING (company_id = get_current_user_company_id());

CREATE POLICY "System can insert conversation events"
  ON public.conversation_events
  FOR INSERT
  WITH CHECK (true);

-- ----------------------------------------------------------------------------
-- DAY 2: Backend Session State Storage (session_states)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.session_states (
  session_id TEXT PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  flow_type TEXT NOT NULL,
  current_state JSONB NOT NULL DEFAULT '{}'::jsonb,
  accumulated_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  checksum TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_session_states_company ON public.session_states(company_id);
CREATE INDEX idx_session_states_activity ON public.session_states(last_activity_at DESC);
CREATE INDEX idx_session_states_user ON public.session_states(user_id);

-- RLS Policies
ALTER TABLE public.session_states ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their company session states"
  ON public.session_states
  FOR SELECT
  USING (company_id = get_current_user_company_id());

CREATE POLICY "System can manage session states"
  ON public.session_states
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_session_states_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  NEW.last_activity_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_session_states_updated_at
  BEFORE UPDATE ON public.session_states
  FOR EACH ROW
  EXECUTE FUNCTION update_session_states_timestamp();

-- ----------------------------------------------------------------------------
-- DAY 4: Idempotency Keys (processed_commands)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.processed_commands (
  idempotency_key TEXT PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  request_data JSONB NOT NULL,
  response_data JSONB NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '24 hours')
);

-- Index for cleanup
CREATE INDEX idx_processed_commands_expires ON public.processed_commands(expires_at);
CREATE INDEX idx_processed_commands_session ON public.processed_commands(session_id);

-- RLS Policies
ALTER TABLE public.processed_commands ENABLE ROW LEVEL SECURITY;

CREATE POLICY "System can manage processed commands"
  ON public.processed_commands
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Automatic cleanup function (runs daily via pg_cron or manually)
CREATE OR REPLACE FUNCTION cleanup_expired_commands()
RETURNS void AS $$
BEGIN
  DELETE FROM public.processed_commands
  WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION cleanup_expired_commands() TO authenticated;

COMMENT ON TABLE public.conversation_events IS 'Event Store: Complete audit trail of all Maya conversation state transitions';
COMMENT ON TABLE public.session_states IS 'Backend Session Storage: Single source of truth for conversation state';
COMMENT ON TABLE public.processed_commands IS 'Idempotency: Prevents duplicate command execution within 24h TTL';