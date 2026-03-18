
-- Agregar columna horas a la tabla payroll_novedades
ALTER TABLE public.payroll_novedades 
ADD COLUMN IF NOT EXISTS horas numeric;
