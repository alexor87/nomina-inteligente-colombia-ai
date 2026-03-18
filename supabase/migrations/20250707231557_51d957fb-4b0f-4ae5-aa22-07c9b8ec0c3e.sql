
-- PASO 1: Corrección mínima de datos - Solo arreglar numero_periodo_anual NULL
UPDATE public.payroll_periods_real 
SET numero_periodo_anual = CASE 
  WHEN tipo_periodo = 'quincenal' THEN 
    CASE 
      WHEN EXTRACT(DAY FROM fecha_inicio) <= 15 THEN (EXTRACT(MONTH FROM fecha_inicio) * 2 - 1)::INTEGER
      ELSE (EXTRACT(MONTH FROM fecha_inicio) * 2)::INTEGER
    END
  WHEN tipo_periodo = 'mensual' THEN EXTRACT(MONTH FROM fecha_inicio)::INTEGER
  WHEN tipo_periodo = 'semanal' THEN 
    -- Calcular semana del año (1-52)
    EXTRACT(WEEK FROM fecha_inicio)::INTEGER
  ELSE 1
END
WHERE numero_periodo_anual IS NULL;

-- Verificar que los datos se corrigieron correctamente
SELECT 
  tipo_periodo,
  COUNT(*) as total,
  COUNT(CASE WHEN numero_periodo_anual IS NULL THEN 1 END) as nulls_restantes,
  MIN(numero_periodo_anual) as min_numero,
  MAX(numero_periodo_anual) as max_numero
FROM public.payroll_periods_real 
GROUP BY tipo_periodo
ORDER BY tipo_periodo;
