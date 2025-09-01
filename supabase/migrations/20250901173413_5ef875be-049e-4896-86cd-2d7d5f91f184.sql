-- Create table to persist pending adjustments
CREATE TABLE IF NOT EXISTS public.pending_payroll_adjustments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL,
  period_id uuid NOT NULL,
  employee_id uuid NOT NULL,
  employee_name text NOT NULL,
  tipo_novedad text NOT NULL,
  subtipo text,
  valor numeric NOT NULL DEFAULT 0,
  dias integer,
  fecha_inicio date,
  fecha_fin date,
  observacion text,
  novedad_data jsonb NOT NULL, -- Complete novedad data for later application
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pending_payroll_adjustments ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can create pending adjustments for their company" 
ON public.pending_payroll_adjustments 
FOR INSERT 
WITH CHECK (company_id = get_current_user_company_id() AND created_by = auth.uid());

CREATE POLICY "Users can view pending adjustments for their company" 
ON public.pending_payroll_adjustments 
FOR SELECT 
USING (company_id = get_current_user_company_id());

CREATE POLICY "Users can update pending adjustments for their company" 
ON public.pending_payroll_adjustments 
FOR UPDATE 
USING (company_id = get_current_user_company_id() AND created_by = auth.uid());

CREATE POLICY "Users can delete pending adjustments for their company" 
ON public.pending_payroll_adjustments 
FOR DELETE 
USING (company_id = get_current_user_company_id() AND created_by = auth.uid());

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_pending_adjustments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER pending_adjustments_updated_at
    BEFORE UPDATE ON public.pending_payroll_adjustments
    FOR EACH ROW
    EXECUTE FUNCTION public.update_pending_adjustments_updated_at();

-- Add foreign key constraints
ALTER TABLE public.pending_payroll_adjustments
ADD CONSTRAINT fk_pending_adjustments_company
FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;

ALTER TABLE public.pending_payroll_adjustments
ADD CONSTRAINT fk_pending_adjustments_period
FOREIGN KEY (period_id) REFERENCES public.payroll_periods_real(id) ON DELETE CASCADE;

ALTER TABLE public.pending_payroll_adjustments
ADD CONSTRAINT fk_pending_adjustments_employee
FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE;