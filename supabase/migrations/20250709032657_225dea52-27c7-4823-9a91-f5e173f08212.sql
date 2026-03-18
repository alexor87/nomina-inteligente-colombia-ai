
-- Agregar campo constitutivo_salario a la tabla payroll_novedades
ALTER TABLE public.payroll_novedades 
ADD COLUMN IF NOT EXISTS constitutivo_salario BOOLEAN DEFAULT false;

-- Agregar comentario para documentar el campo
COMMENT ON COLUMN public.payroll_novedades.constitutivo_salario IS 'Indica si la bonificación es constitutiva de salario (afecta IBC para aportes y prestaciones)';
