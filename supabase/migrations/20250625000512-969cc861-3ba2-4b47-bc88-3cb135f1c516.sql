
-- Primero, vamos a revisar qué tipos de novedades existen actualmente en la tabla
SELECT DISTINCT tipo_novedad FROM public.payroll_novedades;

-- Crear enum para los tipos de novedades
CREATE TYPE public.novedad_type AS ENUM (
  'horas_extra',
  'recargo_nocturno',
  'vacaciones',
  'licencia_remunerada',
  'incapacidad',
  'bonificacion',
  'comision',
  'prima',
  'otros_ingresos',
  'salud',
  'pension',
  'fondo_solidaridad',
  'retencion_fuente',
  'libranza',
  'ausencia',
  'multa',
  'descuento_voluntario'
);

-- Agregar una nueva columna temporal con el enum
ALTER TABLE public.payroll_novedades 
ADD COLUMN tipo_novedad_new public.novedad_type;

-- Actualizar la nueva columna con los valores válidos
UPDATE public.payroll_novedades 
SET tipo_novedad_new = tipo_novedad::public.novedad_type 
WHERE tipo_novedad IN (
  'horas_extra',
  'recargo_nocturno',
  'vacaciones',
  'licencia_remunerada',
  'incapacidad',
  'bonificacion',
  'comision',
  'prima',
  'otros_ingresos',
  'salud',
  'pension',
  'fondo_solidaridad',
  'retencion_fuente',
  'libranza',
  'ausencia',
  'multa',
  'descuento_voluntario'
);

-- Eliminar la columna original
ALTER TABLE public.payroll_novedades DROP COLUMN tipo_novedad;

-- Renombrar la nueva columna
ALTER TABLE public.payroll_novedades RENAME COLUMN tipo_novedad_new TO tipo_novedad;

-- Hacer la columna NOT NULL si es necesario
ALTER TABLE public.payroll_novedades ALTER COLUMN tipo_novedad SET NOT NULL;
