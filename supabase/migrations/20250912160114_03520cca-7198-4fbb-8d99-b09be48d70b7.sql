-- Create payroll version history table only
CREATE TABLE IF NOT EXISTS public.payroll_version_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  period_id UUID NOT NULL,
  version_number INTEGER NOT NULL DEFAULT 1,
  snapshot_data JSONB NOT NULL DEFAULT '{}',
  changes_summary TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  version_type TEXT NOT NULL DEFAULT 'manual',
  previous_version_id UUID
);

-- Add RLS policies
ALTER TABLE public.payroll_version_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their company payroll versions"
ON public.payroll_version_history FOR SELECT
USING (company_id = get_current_user_company_id());

CREATE POLICY "Users can create payroll versions for their company"
ON public.payroll_version_history FOR INSERT
WITH CHECK (company_id = get_current_user_company_id() AND created_by = auth.uid());