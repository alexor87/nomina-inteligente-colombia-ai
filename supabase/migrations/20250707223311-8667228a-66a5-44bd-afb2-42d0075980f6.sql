
-- CORRECCIÓN URGENTE: Eliminar períodos mal generados y regenerar correctamente
-- PASO 1: Limpiar períodos incorrectos actuales
DELETE FROM public.payroll_periods_real;

-- PASO 2: REGENERACIÓN CORRECTA - EMPRESAS QUINCENALES
-- Generar 24 períodos quincenales para cada empresa quincenal (2 por mes × 12 meses)
WITH monthly_dates AS (
  SELECT 
    generate_series(1, 12) as month_num,
    make_date(2025, generate_series(1, 12), 1) as month_start
),
quincenal_periods AS (
  SELECT 
    month_num,
    month_start,
    -- Primera quincena: día 1 al 15
    month_start as primera_inicio,
    month_start + interval '14 days' as primera_fin,
    -- Segunda quincena: día 16 al último día del mes
    month_start + interval '15 days' as segunda_inicio,
    (month_start + interval '1 month' - interval '1 day')::date as segunda_fin,
    -- Nombres de meses en español
    CASE month_num
      WHEN 1 THEN 'Enero' WHEN 2 THEN 'Febrero' WHEN 3 THEN 'Marzo'
      WHEN 4 THEN 'Abril' WHEN 5 THEN 'Mayo' WHEN 6 THEN 'Junio'
      WHEN 7 THEN 'Julio' WHEN 8 THEN 'Agosto' WHEN 9 THEN 'Septiembre'
      WHEN 10 THEN 'Octubre' WHEN 11 THEN 'Noviembre' WHEN 12 THEN 'Diciembre'
    END as month_name
  FROM monthly_dates
)

-- Insertar primera quincena de cada mes
INSERT INTO public.payroll_periods_real (
  company_id, fecha_inicio, fecha_fin, tipo_periodo, numero_periodo_anual, 
  periodo, estado, empleados_count, total_devengado, total_deducciones, total_neto
)
SELECT 
  c.id as company_id,
  qp.primera_inicio::date,
  qp.primera_fin::date,
  'quincenal' as tipo_periodo,
  (qp.month_num * 2 - 1) as numero_periodo_anual, -- 1, 3, 5, 7... (primera quincena)
  '1 - 15 ' || qp.month_name || ' 2025' as periodo,
  CASE 
    WHEN qp.primera_inicio < CURRENT_DATE THEN 'cerrado'
    ELSE 'borrador'
  END as estado,
  0, 0, 0, 0
FROM public.companies c
CROSS JOIN quincenal_periods qp
WHERE c.razon_social IN ('TechSolutions', 'Leidy Yohanna Muñoz', 'Prueba 4 SAS')
  AND c.estado = 'activa'

UNION ALL

-- Insertar segunda quincena de cada mes
SELECT 
  c.id as company_id,
  qp.segunda_inicio::date,
  qp.segunda_fin::date,
  'quincenal' as tipo_periodo,
  (qp.month_num * 2) as numero_periodo_anual, -- 2, 4, 6, 8... (segunda quincena)
  '16 - ' || EXTRACT(day FROM qp.segunda_fin) || ' ' || qp.month_name || ' 2025' as periodo,
  CASE 
    WHEN qp.segunda_inicio < CURRENT_DATE THEN 'cerrado'
    ELSE 'borrador'
  END as estado,
  0, 0, 0, 0
FROM public.companies c
CROSS JOIN quincenal_periods qp
WHERE c.razon_social IN ('TechSolutions', 'Leidy Yohanna Muñoz', 'Prueba 4 SAS')
  AND c.estado = 'activa';

-- PASO 3: REGENERACIÓN CORRECTA - EMPRESAS MENSUALES
-- Generar 12 períodos mensuales para cada empresa mensual
WITH monthly_periods AS (
  SELECT 
    generate_series(1, 12) as month_num,
    make_date(2025, generate_series(1, 12), 1) as month_start,
    (make_date(2025, generate_series(1, 12), 1) + interval '1 month' - interval '1 day')::date as month_end,
    CASE generate_series(1, 12)
      WHEN 1 THEN 'Enero' WHEN 2 THEN 'Febrero' WHEN 3 THEN 'Marzo'
      WHEN 4 THEN 'Abril' WHEN 5 THEN 'Mayo' WHEN 6 THEN 'Junio'
      WHEN 7 THEN 'Julio' WHEN 8 THEN 'Agosto' WHEN 9 THEN 'Septiembre'
      WHEN 10 THEN 'Octubre' WHEN 11 THEN 'Noviembre' WHEN 12 THEN 'Diciembre'
    END as month_name
)

INSERT INTO public.payroll_periods_real (
  company_id, fecha_inicio, fecha_fin, tipo_periodo, numero_periodo_anual, 
  periodo, estado, empleados_count, total_devengado, total_deducciones, total_neto
)
SELECT 
  c.id as company_id,
  mp.month_start,
  mp.month_end,
  'mensual' as tipo_periodo,
  mp.month_num as numero_periodo_anual,
  mp.month_name || ' 2025' as periodo,
  CASE 
    WHEN mp.month_start < date_trunc('month', CURRENT_DATE) THEN 'cerrado'
    ELSE 'borrador'
  END as estado,
  0, 0, 0, 0
FROM public.companies c
CROSS JOIN monthly_periods mp
WHERE c.razon_social IN ('90000011', 'ASD', 'FINPPI COLOMBIA', 'Prueba 3 SAS')
  AND c.estado = 'activa';

-- PASO 4: VERIFICACIÓN INMEDIATA
SELECT 
  c.razon_social,
  cs.periodicity,
  COUNT(p.*) as periodos_generados,
  MIN(p.fecha_inicio) as primer_periodo,
  MAX(p.fecha_fin) as ultimo_periodo,
  COUNT(CASE WHEN p.estado = 'borrador' THEN 1 END) as disponibles,
  COUNT(CASE WHEN p.estado = 'cerrado' THEN 1 END) as cerrados
FROM public.companies c
LEFT JOIN public.company_settings cs ON c.id = cs.company_id
LEFT JOIN public.payroll_periods_real p ON c.id = p.company_id
WHERE c.estado = 'activa'
GROUP BY c.id, c.razon_social, cs.periodicity
ORDER BY c.razon_social;
