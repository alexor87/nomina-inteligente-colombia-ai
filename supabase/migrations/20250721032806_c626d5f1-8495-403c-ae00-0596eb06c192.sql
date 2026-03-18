
-- Agregar campo employees_loaded para marcar períodos como inicializados
ALTER TABLE public.payroll_periods_real 
ADD COLUMN employees_loaded BOOLEAN DEFAULT false;

-- Marcar períodos existentes con empleados como ya inicializados
UPDATE public.payroll_periods_real 
SET employees_loaded = true 
WHERE empleados_count > 0;

-- Añadir comentario para documentar el propósito del campo
COMMENT ON COLUMN public.payroll_periods_real.employees_loaded IS 'Marca si el período ya fue inicializado con empleados para evitar recrear empleados eliminados';
