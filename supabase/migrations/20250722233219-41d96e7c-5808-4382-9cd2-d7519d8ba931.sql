
-- Create the payroll_adjustments table
CREATE TABLE public.payroll_adjustments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  period_id UUID NOT NULL,
  employee_id UUID NOT NULL,
  concept TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  observations TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payroll_adjustments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their company adjustments" 
  ON public.payroll_adjustments 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.payroll_periods_real ppr 
      WHERE ppr.id = payroll_adjustments.period_id 
      AND ppr.company_id = get_current_user_company_id()
    )
  );

CREATE POLICY "Users can create adjustments for their company" 
  ON public.payroll_adjustments 
  FOR INSERT 
  WITH CHECK (
    created_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.payroll_periods_real ppr 
      WHERE ppr.id = payroll_adjustments.period_id 
      AND ppr.company_id = get_current_user_company_id()
    )
  );

-- Create trigger for updated_at
CREATE TRIGGER update_payroll_adjustments_updated_at 
  BEFORE UPDATE ON public.payroll_adjustments 
  FOR EACH ROW 
  EXECUTE FUNCTION public.update_updated_at_column();
