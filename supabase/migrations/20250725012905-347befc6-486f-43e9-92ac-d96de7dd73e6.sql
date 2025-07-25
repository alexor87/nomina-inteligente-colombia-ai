-- Corrección alternativa: mantener fecha real pero actualizar el label para febrero
-- y crear función que siempre calcule 15 días para períodos quincenales

UPDATE public.payroll_periods_real 
SET 
  periodo = '16 - 30 Febrero 2025',
  updated_at = now()
WHERE 
  fecha_inicio = '2025-02-16' 
  AND fecha_fin = '2025-02-28' 
  AND tipo_periodo = 'quincenal'
  AND periodo LIKE '%Febrero 2025%';

-- Función para calcular días trabajados correctos según tipo de período
CREATE OR REPLACE FUNCTION calculate_worked_days_for_period(
  p_tipo_periodo TEXT,
  p_fecha_inicio DATE,
  p_fecha_fin DATE
) RETURNS INTEGER
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- Para períodos quincenales, siempre 15 días (ley laboral)
  IF p_tipo_periodo = 'quincenal' THEN
    RETURN 15;
  END IF;
  
  -- Para períodos semanales, siempre 7 días
  IF p_tipo_periodo = 'semanal' THEN
    RETURN 7;
  END IF;
  
  -- Para otros tipos, calcular días reales
  RETURN (p_fecha_fin - p_fecha_inicio) + 1;
END;
$$;

-- Función para normalizar períodos quincenales mal etiquetados
CREATE OR REPLACE FUNCTION normalize_biweekly_period_labels()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  corrected_count INTEGER := 0;
  period_record RECORD;
BEGIN
  -- Corregir etiquetas de períodos quincenales de febrero
  FOR period_record IN
    SELECT id, fecha_inicio, fecha_fin, periodo
    FROM public.payroll_periods_real
    WHERE tipo_periodo = 'quincenal'
    AND EXTRACT(MONTH FROM fecha_inicio) = 2  -- Febrero
    AND EXTRACT(DAY FROM fecha_inicio) = 16   -- Segunda quincena
    AND periodo NOT LIKE '%16 - 30%'          -- No corregido aún
  LOOP
    -- Actualizar solo el label a "16 - 30"
    UPDATE public.payroll_periods_real
    SET 
      periodo = REPLACE(period_record.periodo, 
                       '16 - ' || EXTRACT(DAY FROM period_record.fecha_fin)::text,
                       '16 - 30'),
      updated_at = now()
    WHERE id = period_record.id;
    
    corrected_count := corrected_count + 1;
    
    RAISE NOTICE 'Normalizado label del período: % -> 16 - 30 Febrero', period_record.periodo;
  END LOOP;
  
  RETURN corrected_count;
END;
$$;

-- Ejecutar normalización
SELECT normalize_biweekly_period_labels() as labels_corrected;