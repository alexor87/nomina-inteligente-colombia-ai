
-- FASE 1: LIMPIEZA TOTAL DE DATOS INCONSISTENTES
-- Eliminar todos los registros de nómina existentes (datos de prueba)

-- 1. Limpiar vouchers de nómina
DELETE FROM public.payroll_vouchers;

-- 2. Limpiar novedades de nómina
DELETE FROM public.payroll_novedades;

-- 3. Limpiar registros de nómina
DELETE FROM public.payrolls;

-- 4. Limpiar períodos caóticos actuales
DELETE FROM public.payroll_periods_real;

-- 5. Limpiar logs de sincronización
DELETE FROM public.payroll_sync_log;

-- FASE 2: REGENERACIÓN PROFESIONAL DE PERÍODOS 2025
-- Insertar períodos limpios para cada empresa según su periodicidad

-- EMPRESAS QUINCENALES (3 empresas)
-- 1. TechSolutions (quincenal)
INSERT INTO public.payroll_periods_real (
  company_id, fecha_inicio, fecha_fin, tipo_periodo, numero_periodo_anual, 
  periodo, estado, empleados_count, total_devengado, total_deducciones, total_neto
) 
SELECT 
  c.id as company_id,
  generate_series('2025-01-01'::date, '2025-12-16'::date, interval '15 days') as fecha_inicio,
  generate_series('2025-01-15'::date, '2025-12-31'::date, interval '15 days') as fecha_fin,
  'quincenal' as tipo_periodo,
  row_number() OVER (ORDER BY generate_series('2025-01-01'::date, '2025-12-16'::date, interval '15 days')) as numero_periodo_anual,
  CASE 
    WHEN extract(day from generate_series('2025-01-01'::date, '2025-12-16'::date, interval '15 days')) = 1 
    THEN '1 - 15 ' || 
         CASE extract(month from generate_series('2025-01-01'::date, '2025-12-16'::date, interval '15 days'))
           WHEN 1 THEN 'Enero' WHEN 2 THEN 'Febrero' WHEN 3 THEN 'Marzo'
           WHEN 4 THEN 'Abril' WHEN 5 THEN 'Mayo' WHEN 6 THEN 'Junio'
           WHEN 7 THEN 'Julio' WHEN 8 THEN 'Agosto' WHEN 9 THEN 'Septiembre'
           WHEN 10 THEN 'Octubre' WHEN 11 THEN 'Noviembre' WHEN 12 THEN 'Diciembre'
         END || ' 2025'
    ELSE '16 - ' || extract(day from generate_series('2025-01-15'::date, '2025-12-31'::date, interval '15 days')) || ' ' ||
         CASE extract(month from generate_series('2025-01-01'::date, '2025-12-16'::date, interval '15 days'))
           WHEN 1 THEN 'Enero' WHEN 2 THEN 'Febrero' WHEN 3 THEN 'Marzo'
           WHEN 4 THEN 'Abril' WHEN 5 THEN 'Mayo' WHEN 6 THEN 'Junio'
           WHEN 7 THEN 'Julio' WHEN 8 THEN 'Agosto' WHEN 9 THEN 'Septiembre'
           WHEN 10 THEN 'Octubre' WHEN 11 THEN 'Noviembre' WHEN 12 THEN 'Diciembre'
         END || ' 2025'
  END as periodo,
  CASE 
    WHEN generate_series('2025-01-01'::date, '2025-12-16'::date, interval '15 days') < CURRENT_DATE 
    THEN 'cerrado'::text
    ELSE 'borrador'::text
  END as estado,
  0 as empleados_count,
  0 as total_devengado,
  0 as total_deducciones,
  0 as total_neto
FROM public.companies c
WHERE c.razon_social IN ('TechSolutions', 'Leidy Yohanna Muñoz', 'Prueba 4 SAS')
  AND c.estado = 'activa';

-- EMPRESAS MENSUALES (4 empresas)
-- Generar 12 períodos mensuales para empresas mensual
INSERT INTO public.payroll_periods_real (
  company_id, fecha_inicio, fecha_fin, tipo_periodo, numero_periodo_anual, 
  periodo, estado, empleados_count, total_devengado, total_deducciones, total_neto
)
SELECT 
  c.id as company_id,
  date_trunc('month', generate_series('2025-01-01'::date, '2025-12-01'::date, interval '1 month'))::date as fecha_inicio,
  (date_trunc('month', generate_series('2025-01-01'::date, '2025-12-01'::date, interval '1 month')) + interval '1 month - 1 day')::date as fecha_fin,
  'mensual' as tipo_periodo,
  extract(month from generate_series('2025-01-01'::date, '2025-12-01'::date, interval '1 month'))::integer as numero_periodo_anual,
  CASE extract(month from generate_series('2025-01-01'::date, '2025-12-01'::date, interval '1 month'))
    WHEN 1 THEN 'Enero 2025' WHEN 2 THEN 'Febrero 2025' WHEN 3 THEN 'Marzo 2025'
    WHEN 4 THEN 'Abril 2025' WHEN 5 THEN 'Mayo 2025' WHEN 6 THEN 'Junio 2025'
    WHEN 7 THEN 'Julio 2025' WHEN 8 THEN 'Agosto 2025' WHEN 9 THEN 'Septiembre 2025'
    WHEN 10 THEN 'Octubre 2025' WHEN 11 THEN 'Noviembre 2025' WHEN 12 THEN 'Diciembre 2025'
  END as periodo,
  CASE 
    WHEN generate_series('2025-01-01'::date, '2025-12-01'::date, interval '1 month') < date_trunc('month', CURRENT_DATE) 
    THEN 'cerrado'::text
    ELSE 'borrador'::text
  END as estado,
  0 as empleados_count,
  0 as total_devengado,
  0 as total_deducciones,
  0 as total_neto
FROM public.companies c
WHERE c.razon_social IN ('90000011', 'ASD', 'FINPPI COLOMBIA', 'Prueba 3 SAS')
  AND c.estado = 'activa';

-- FASE 3: VERIFICACIÓN DE RESULTADOS
-- Consulta para verificar que los períodos se generaron correctamente
SELECT 
  c.razon_social,
  cs.periodicity,
  COUNT(p.*) as periodos_generados,
  MIN(p.fecha_inicio) as primer_periodo,
  MAX(p.fecha_fin) as ultimo_periodo
FROM public.companies c
LEFT JOIN public.company_settings cs ON c.id = cs.company_id
LEFT JOIN public.payroll_periods_real p ON c.id = p.company_id
WHERE c.estado = 'activa'
GROUP BY c.id, c.razon_social, cs.periodicity
ORDER BY c.razon_social;
