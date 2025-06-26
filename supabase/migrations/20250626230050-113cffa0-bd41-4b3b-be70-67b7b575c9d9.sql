
-- Agregar campo para días de período personalizado
ALTER TABLE public.company_settings 
ADD COLUMN custom_period_days integer DEFAULT 30;

-- Comentario en la columna para documentar su propósito
COMMENT ON COLUMN public.company_settings.custom_period_days IS 'Número de días para períodos personalizados configurados por la empresa';
