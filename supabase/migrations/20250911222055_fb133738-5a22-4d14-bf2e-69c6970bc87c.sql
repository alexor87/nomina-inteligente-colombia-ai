-- Create table for period editing sessions
CREATE TABLE public.period_edit_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id UUID NOT NULL,
  company_id UUID NOT NULL,
  user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  changes JSONB NOT NULL DEFAULT '{}',
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  CONSTRAINT period_edit_sessions_status_check 
    CHECK (status IN ('active', 'saving', 'completed', 'cancelled', 'expired'))
);

-- Create table for temporary snapshots
CREATE TABLE public.period_edit_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id UUID NOT NULL,
  company_id UUID NOT NULL,
  user_id UUID NOT NULL,
  snapshot_data JSONB NOT NULL,
  session_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS for period_edit_sessions
ALTER TABLE public.period_edit_sessions ENABLE ROW LEVEL SECURITY;

-- RLS policies for period_edit_sessions
CREATE POLICY "Users can create editing sessions for their company"
ON public.period_edit_sessions
FOR INSERT
WITH CHECK (company_id = get_current_user_company_id() AND user_id = auth.uid());

CREATE POLICY "Users can view editing sessions for their company"
ON public.period_edit_sessions
FOR SELECT
USING (company_id = get_current_user_company_id());

CREATE POLICY "Users can update their own editing sessions"
ON public.period_edit_sessions
FOR UPDATE
USING (company_id = get_current_user_company_id() AND user_id = auth.uid());

-- Enable RLS for period_edit_snapshots  
ALTER TABLE public.period_edit_snapshots ENABLE ROW LEVEL SECURITY;

-- RLS policies for period_edit_snapshots
CREATE POLICY "Users can create snapshots for their company"
ON public.period_edit_snapshots
FOR INSERT
WITH CHECK (company_id = get_current_user_company_id() AND user_id = auth.uid());

CREATE POLICY "Users can view snapshots for their company"
ON public.period_edit_snapshots
FOR SELECT
USING (company_id = get_current_user_company_id());

-- Create indexes for performance
CREATE INDEX idx_period_edit_sessions_period_id ON public.period_edit_sessions(period_id);
CREATE INDEX idx_period_edit_sessions_status ON public.period_edit_sessions(status);
CREATE INDEX idx_period_edit_sessions_company_id ON public.period_edit_sessions(company_id);
CREATE INDEX idx_period_edit_snapshots_period_id ON public.period_edit_snapshots(period_id);

-- Add trigger to automatically cleanup old snapshots when session is completed
CREATE OR REPLACE FUNCTION cleanup_snapshots_on_session_complete()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('completed', 'cancelled', 'expired') AND OLD.status = 'active' THEN
    DELETE FROM public.period_edit_snapshots 
    WHERE period_id = NEW.period_id AND company_id = NEW.company_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_cleanup_snapshots
  AFTER UPDATE ON public.period_edit_sessions
  FOR EACH ROW
  EXECUTE FUNCTION cleanup_snapshots_on_session_complete();