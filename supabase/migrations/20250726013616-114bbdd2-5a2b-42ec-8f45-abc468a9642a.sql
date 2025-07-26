-- Create table for tracking corrections to closed payroll periods
CREATE TABLE public.payroll_period_corrections (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL,
    period_id UUID NOT NULL,
    employee_id UUID NOT NULL,
    correction_type TEXT NOT NULL CHECK (correction_type IN ('correctivo', 'compensatorio')),
    concept TEXT NOT NULL,
    previous_value NUMERIC,
    new_value NUMERIC,
    value_difference NUMERIC NOT NULL,
    justification TEXT NOT NULL,
    affected_novedad_id UUID,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payroll_period_corrections ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can create corrections for their company" 
ON public.payroll_period_corrections 
FOR INSERT 
WITH CHECK (company_id = get_current_user_company_id() AND created_by = auth.uid());

CREATE POLICY "Users can view corrections for their company" 
ON public.payroll_period_corrections 
FOR SELECT 
USING (company_id = get_current_user_company_id());

-- Create trigger for updated_at
CREATE TRIGGER update_payroll_period_corrections_updated_at
BEFORE UPDATE ON public.payroll_period_corrections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create audit trigger for corrections
CREATE OR REPLACE FUNCTION public.audit_payroll_corrections_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO payroll_novedades_audit (
      novedad_id,
      company_id,
      action,
      old_values,
      new_values,
      user_id
    ) VALUES (
      NEW.id,
      NEW.company_id,
      'CORRECTION_CREATE',
      NULL,
      to_jsonb(NEW),
      auth.uid()
    );
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER audit_payroll_corrections_trigger
AFTER INSERT ON public.payroll_period_corrections
FOR EACH ROW EXECUTE FUNCTION public.audit_payroll_corrections_changes();