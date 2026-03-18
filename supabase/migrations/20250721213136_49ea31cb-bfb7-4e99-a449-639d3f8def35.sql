
-- Actualizar el constraint de la tabla employees para incluir 'eliminado'
ALTER TABLE public.employees 
DROP CONSTRAINT IF EXISTS employees_estado_check;

-- Crear el nuevo constraint que incluye 'eliminado'
ALTER TABLE public.employees 
ADD CONSTRAINT employees_estado_check 
CHECK (estado IN ('activo', 'inactivo', 'vacaciones', 'incapacidad', 'eliminado'));
