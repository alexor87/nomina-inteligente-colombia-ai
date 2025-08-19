
-- Add period_id column to social_benefit_calculations table
ALTER TABLE public.social_benefit_calculations 
ADD COLUMN period_id UUID;

-- Add foreign key constraint to payroll_periods_real
ALTER TABLE public.social_benefit_calculations 
ADD CONSTRAINT fk_social_benefit_calculations_period 
FOREIGN KEY (period_id) REFERENCES public.payroll_periods_real(id);

-- Create validation trigger to enforce closed periods only
CREATE OR REPLACE FUNCTION public.validate_social_benefit_period()
RETURNS TRIGGER AS $$
DECLARE
  period_estado TEXT;
  period_company_id UUID;
BEGIN
  -- Get period status and company_id
  SELECT estado, company_id INTO period_estado, period_company_id
  FROM public.payroll_periods_real 
  WHERE id = NEW.period_id;
  
  -- Check if period exists
  IF period_estado IS NULL THEN
    RAISE EXCEPTION 'Period % does not exist', NEW.period_id;
  END IF;
  
  -- Check if period is closed
  IF period_estado != 'cerrado' THEN
    RAISE EXCEPTION 'Social benefits can only be calculated for closed periods. Period status: %', period_estado;
  END IF;
  
  -- Verify company consistency
  IF period_company_id != NEW.company_id THEN
    RAISE EXCEPTION 'Period company_id (%) does not match calculation company_id (%)', period_company_id, NEW.company_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_validate_social_benefit_period ON public.social_benefit_calculations;
CREATE TRIGGER trigger_validate_social_benefit_period
  BEFORE INSERT OR UPDATE ON public.social_benefit_calculations
  FOR EACH ROW EXECUTE FUNCTION public.validate_social_benefit_period();

-- Backfill existing records with period_id based on date ranges and company_id
UPDATE public.social_benefit_calculations sbc
SET period_id = ppr.id
FROM public.payroll_periods_real ppr
WHERE sbc.company_id = ppr.company_id
  AND sbc.period_start >= ppr.fecha_inicio
  AND sbc.period_end <= ppr.fecha_fin
  AND sbc.period_id IS NULL;

-- Make period_id NOT NULL after backfill
ALTER TABLE public.social_benefit_calculations 
ALTER COLUMN period_id SET NOT NULL;

-- Add unique constraint to prevent duplicate calculations per employee/period/benefit_type
ALTER TABLE public.social_benefit_calculations 
ADD CONSTRAINT unique_social_benefit_per_employee_period_type 
UNIQUE (company_id, employee_id, period_id, benefit_type);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_social_benefit_calculations_period_id 
ON public.social_benefit_calculations(period_id);
