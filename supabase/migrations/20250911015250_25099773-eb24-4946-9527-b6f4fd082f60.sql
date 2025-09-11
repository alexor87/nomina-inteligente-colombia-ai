-- Add audit and staleness tracking columns to payrolls table
ALTER TABLE public.payrolls 
ADD COLUMN calculated_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN is_stale BOOLEAN DEFAULT true,
ADD COLUMN calculation_hash TEXT;

-- Add calculated_at to payroll_periods_real
ALTER TABLE public.payroll_periods_real 
ADD COLUMN calculated_at TIMESTAMP WITH TIME ZONE;

-- Create payroll_calculation_runs table for audit
CREATE TABLE public.payroll_calculation_runs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL,
    period_id UUID NOT NULL,
    total_employees INTEGER NOT NULL DEFAULT 0,
    successful_calculations INTEGER NOT NULL DEFAULT 0,
    failed_calculations INTEGER NOT NULL DEFAULT 0,
    execution_time_ms INTEGER,
    initiated_by UUID,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on payroll_calculation_runs
ALTER TABLE public.payroll_calculation_runs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for payroll_calculation_runs
CREATE POLICY "Users can create calculation runs for their company" 
ON public.payroll_calculation_runs 
FOR INSERT 
WITH CHECK (company_id = get_current_user_company_id());

CREATE POLICY "Users can view calculation runs for their company" 
ON public.payroll_calculation_runs 
FOR SELECT 
USING (company_id = get_current_user_company_id());

-- Create trigger function to mark payrolls as stale when related data changes
CREATE OR REPLACE FUNCTION public.mark_payrolls_stale_on_changes()
RETURNS TRIGGER AS $$
BEGIN
    -- Mark payrolls as stale when novedades change
    IF TG_TABLE_NAME = 'payroll_novedades' THEN
        UPDATE public.payrolls 
        SET is_stale = true, updated_at = now()
        WHERE company_id = COALESCE(NEW.company_id, OLD.company_id)
        AND period_id = COALESCE(NEW.periodo_id, OLD.periodo_id);
        
        RETURN COALESCE(NEW, OLD);
    END IF;
    
    -- Mark payrolls as stale when employee data changes (salary, etc.)
    IF TG_TABLE_NAME = 'employees' THEN
        UPDATE public.payrolls 
        SET is_stale = true, updated_at = now()
        WHERE employee_id = COALESCE(NEW.id, OLD.id)
        AND estado = 'procesada';
        
        RETURN COALESCE(NEW, OLD);
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create triggers to automatically mark payrolls as stale
CREATE TRIGGER trigger_mark_payrolls_stale_on_novedades_change
    AFTER INSERT OR UPDATE OR DELETE ON public.payroll_novedades
    FOR EACH ROW
    EXECUTE FUNCTION public.mark_payrolls_stale_on_changes();

CREATE TRIGGER trigger_mark_payrolls_stale_on_employee_change
    AFTER UPDATE ON public.employees
    FOR EACH ROW
    WHEN (OLD.salario_base IS DISTINCT FROM NEW.salario_base 
          OR OLD.estado IS DISTINCT FROM NEW.estado)
    EXECUTE FUNCTION public.mark_payrolls_stale_on_changes();

-- Add indexes for performance
CREATE INDEX idx_payrolls_stale_period ON public.payrolls(period_id, is_stale) WHERE is_stale = true;
CREATE INDEX idx_calculation_runs_period ON public.payroll_calculation_runs(period_id, created_at DESC);