-- Add IBC column to payrolls table for storing calculated IBC during liquidation
ALTER TABLE public.payrolls 
ADD COLUMN ibc NUMERIC DEFAULT 0;

-- Add comment to explain the column
COMMENT ON COLUMN public.payrolls.ibc IS 'Ingreso Base de Cotización calculated during payroll liquidation';

-- Create index for better query performance
CREATE INDEX idx_payrolls_ibc ON public.payrolls(ibc);

-- Update existing records with calculated IBC based on health and pension contributions
-- This is a temporary calculation for existing data
UPDATE public.payrolls 
SET ibc = COALESCE((salud_empleado + pension_empleado) / 0.08, salario_base)
WHERE ibc IS NULL OR ibc = 0;