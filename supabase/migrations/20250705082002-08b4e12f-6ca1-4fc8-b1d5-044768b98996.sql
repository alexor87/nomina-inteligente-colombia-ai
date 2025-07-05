
-- Agregar columna fondo_solidaridad a la tabla payrolls para separar este concepto de otras_deducciones
ALTER TABLE public.payrolls 
ADD COLUMN IF NOT EXISTS fondo_solidaridad numeric DEFAULT 0;

-- Actualizar la columna para que no sea nullable y tenga valor por defecto
UPDATE public.payrolls 
SET fondo_solidaridad = 0 
WHERE fondo_solidaridad IS NULL;

-- Agregar constraint para asegurar que no sea negativo
ALTER TABLE public.payrolls 
ADD CONSTRAINT fondo_solidaridad_non_negative 
CHECK (fondo_solidaridad >= 0);
