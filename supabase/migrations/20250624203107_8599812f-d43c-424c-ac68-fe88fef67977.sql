
-- Agregar columna tipo_documento a la tabla employees
ALTER TABLE public.employees 
ADD COLUMN tipo_documento text DEFAULT 'CC';

-- Agregar comentario para documentar los valores permitidos
COMMENT ON COLUMN public.employees.tipo_documento IS 'Tipos permitidos: CC, TI, CE, PA, RC, etc.';
