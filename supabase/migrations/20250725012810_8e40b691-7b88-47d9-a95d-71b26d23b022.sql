-- Corrección integral para períodos quincenales de febrero mal generados
-- Actualizar período de febrero con fechas incorrectas

UPDATE public.payroll_periods_real 
SET 
  fecha_fin = '2025-02-30',
  periodo = '16 - 30 Febrero 2025',
  updated_at = now()
WHERE 
  fecha_inicio = '2025-02-16' 
  AND fecha_fin = '2025-02-28' 
  AND tipo_periodo = 'quincenal'
  AND periodo LIKE '%Febrero 2025%';

-- Función para detectar y corregir automáticamente períodos quincenales mal generados
CREATE OR REPLACE FUNCTION fix_malformed_biweekly_periods()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  corrected_count INTEGER := 0;
  period_record RECORD;
BEGIN
  -- Detectar períodos quincenales de febrero con menos de 15 días
  FOR period_record IN
    SELECT id, fecha_inicio, fecha_fin, periodo
    FROM public.payroll_periods_real
    WHERE tipo_periodo = 'quincenal'
    AND EXTRACT(MONTH FROM fecha_inicio) = 2  -- Febrero
    AND EXTRACT(DAY FROM fecha_inicio) = 16   -- Segunda quincena
    AND (fecha_fin - fecha_inicio + 1) < 15  -- Menos de 15 días
  LOOP
    -- Corregir a 30 de febrero (día ficticio)
    UPDATE public.payroll_periods_real
    SET 
      fecha_fin = DATE_TRUNC('month', period_record.fecha_inicio) + INTERVAL '29 days', -- 30 de febrero
      periodo = REPLACE(period_record.periodo, 
                       '16 - ' || EXTRACT(DAY FROM period_record.fecha_fin)::text,
                       '16 - 30'),
      updated_at = now()
    WHERE id = period_record.id;
    
    corrected_count := corrected_count + 1;
    
    RAISE NOTICE 'Corregido período: % -> 16 - 30 Febrero', period_record.periodo;
  END LOOP;
  
  RETURN corrected_count;
END;
$$;

-- Ejecutar la corrección automáticamente
SELECT fix_malformed_biweekly_periods() as corrected_periods;