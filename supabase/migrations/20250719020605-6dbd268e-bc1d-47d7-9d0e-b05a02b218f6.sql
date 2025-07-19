
-- Agregar columna subtipo a la tabla employee_vacation_periods
-- Columna nullable para mantener compatibilidad con registros existentes
ALTER TABLE public.employee_vacation_periods 
ADD COLUMN subtipo TEXT NULL;

-- Agregar comentario para documentar el propósito
COMMENT ON COLUMN public.employee_vacation_periods.subtipo IS 'Subtipo específico de la licencia (ej: maternidad, paternidad, etc.)';
