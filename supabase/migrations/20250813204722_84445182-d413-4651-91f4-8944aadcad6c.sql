
-- Agregar campo tipo_salario a la tabla employees
ALTER TABLE public.employees 
ADD COLUMN tipo_salario text DEFAULT 'mensual'::text;

-- Agregar constraint para validar valores permitidos
ALTER TABLE public.employees 
ADD CONSTRAINT employees_tipo_salario_check 
CHECK (tipo_salario IN ('mensual', 'integral', 'medio_tiempo'));

-- Crear comentario para documentar el campo
COMMENT ON COLUMN public.employees.tipo_salario IS 'Tipo de salario: mensual (tradicional), integral (min 10 SMLMV), medio_tiempo (proporcional a horas)';
