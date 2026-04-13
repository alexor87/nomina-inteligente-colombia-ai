-- Agregar campo dias_descanso a la tabla employees
-- Permite configurar los días de descanso por empleado (default: sábado y domingo)
-- Usado para calcular días hábiles en vacaciones y licencias

ALTER TABLE public.employees
ADD COLUMN IF NOT EXISTS dias_descanso TEXT[] DEFAULT ARRAY['sabado', 'domingo'];

COMMENT ON COLUMN public.employees.dias_descanso IS
'Días de descanso del empleado. Valores posibles: lunes, martes, miercoles, jueves, viernes, sabado, domingo';
