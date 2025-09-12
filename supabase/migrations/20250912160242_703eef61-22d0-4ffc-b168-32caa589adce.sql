-- Create payroll snapshots table for temporary storage during editing
CREATE TABLE IF NOT EXISTS public.period_edit_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  period_id UUID NOT NULL,
  session_id UUID NOT NULL,
  employee_id UUID NOT NULL,
  original_data JSONB NOT NULL DEFAULT '{}',
  modified_data JSONB NOT NULL DEFAULT '{}',
  is_added BOOLEAN DEFAULT false,
  is_removed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add RLS policies for snapshots
ALTER TABLE public.period_edit_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage snapshots for their company"
ON public.period_edit_snapshots FOR ALL
USING (company_id = get_current_user_company_id())
WITH CHECK (company_id = get_current_user_company_id());