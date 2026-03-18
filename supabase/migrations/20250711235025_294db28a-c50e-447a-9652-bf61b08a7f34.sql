
-- Agregar columna type a employee_vacation_periods usando el enum novedad_type
ALTER TABLE public.employee_vacation_periods 
ADD COLUMN type public.novedad_type;

-- Actualizar registros existentes con un valor por defecto
UPDATE public.employee_vacation_periods 
SET type = 'vacaciones'::novedad_type 
WHERE type IS NULL;

-- Hacer la columna obligatoria
ALTER TABLE public.employee_vacation_periods 
ALTER COLUMN type SET NOT NULL;

-- Agregar un valor por defecto para futuros registros
ALTER TABLE public.employee_vacation_periods 
ALTER COLUMN type SET DEFAULT 'vacaciones'::novedad_type;
