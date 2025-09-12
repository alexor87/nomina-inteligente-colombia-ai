-- Create payroll version history table for audit trail
CREATE TABLE IF NOT EXISTS public.payroll_version_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  period_id UUID NOT NULL,
  version_number INTEGER NOT NULL DEFAULT 1,
  snapshot_data JSONB NOT NULL DEFAULT '{}',
  changes_summary TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  version_type TEXT NOT NULL DEFAULT 'manual', -- 'initial', 'manual', 'correction'
  previous_version_id UUID REFERENCES public.payroll_version_history(id)
);

-- Add RLS policies
ALTER TABLE public.payroll_version_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their company payroll versions"
ON public.payroll_version_history FOR SELECT
USING (company_id = get_current_user_company_id());

CREATE POLICY "Users can create payroll versions for their company"
ON public.payroll_version_history FOR INSERT
WITH CHECK (company_id = get_current_user_company_id() AND created_by = auth.uid());

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_payroll_version_history_period_id ON public.payroll_version_history(period_id);
CREATE INDEX IF NOT EXISTS idx_payroll_version_history_company_id ON public.payroll_version_history(company_id);
CREATE INDEX IF NOT EXISTS idx_payroll_version_history_version_number ON public.payroll_version_history(period_id, version_number);

-- Update period_edit_sessions table to support composition changes
ALTER TABLE public.period_edit_sessions 
ADD COLUMN IF NOT EXISTS composition_changes JSONB DEFAULT '{"added_employees": [], "removed_employees": []}',
ADD COLUMN IF NOT EXISTS original_snapshot JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS is_composition_edit BOOLEAN DEFAULT false;

-- Create payroll snapshots table for temporary storage during editing
CREATE TABLE IF NOT EXISTS public.period_edit_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  period_id UUID NOT NULL,
  session_id UUID NOT NULL REFERENCES public.period_edit_sessions(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL,
  original_data JSONB NOT NULL DEFAULT '{}',
  modified_data JSONB NOT NULL DEFAULT '{}',
  is_added BOOLEAN DEFAULT false, -- true if employee was added to period
  is_removed BOOLEAN DEFAULT false, -- true if employee was removed from period
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add RLS policies for snapshots
ALTER TABLE public.period_edit_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage snapshots for their company"
ON public.period_edit_snapshots FOR ALL
USING (company_id = get_current_user_company_id())
WITH CHECK (company_id = get_current_user_company_id());

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_period_edit_snapshots_session_id ON public.period_edit_snapshots(session_id);
CREATE INDEX IF NOT EXISTS idx_period_edit_snapshots_period_employee ON public.period_edit_snapshots(period_id, employee_id);

-- Add trigger to update updated_at
CREATE TRIGGER update_period_edit_snapshots_updated_at
BEFORE UPDATE ON public.period_edit_snapshots
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();