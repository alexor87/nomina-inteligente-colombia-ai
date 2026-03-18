
-- FASE 2: SINCRONIZACIÓN Y LIMPIEZA DE BASE DE DATOS
-- Crear servicio de historial funcional y limpiar datos inconsistentes

-- 1. Limpiar períodos duplicados manteniendo el más reciente
WITH duplicate_periods AS (
  SELECT id, 
         ROW_NUMBER() OVER (PARTITION BY company_id, periodo ORDER BY updated_at DESC) as rn
  FROM public.payroll_periods_real
)
DELETE FROM public.payroll_periods_real 
WHERE id IN (SELECT id FROM duplicate_periods WHERE rn > 1);

-- 2. Sincronizar datos de payrolls con períodos existentes
-- Actualizar period_id faltantes en payrolls
UPDATE public.payrolls 
SET period_id = ppr.id
FROM public.payroll_periods_real ppr
WHERE payrolls.company_id = ppr.company_id 
  AND payrolls.periodo = ppr.periodo 
  AND payrolls.period_id IS NULL;

-- 3. Actualizar totales de períodos con datos reales
UPDATE public.payroll_periods_real 
SET 
  empleados_count = COALESCE((
    SELECT COUNT(*) 
    FROM public.payrolls p 
    WHERE p.period_id = payroll_periods_real.id
  ), 0),
  total_devengado = COALESCE((
    SELECT SUM(total_devengado) 
    FROM public.payrolls p 
    WHERE p.period_id = payroll_periods_real.id
  ), 0),
  total_deducciones = COALESCE((
    SELECT SUM(total_deducciones) 
    FROM public.payrolls p 
    WHERE p.period_id = payroll_periods_real.id
  ), 0),
  total_neto = COALESCE((
    SELECT SUM(neto_pagado) 
    FROM public.payrolls p 
    WHERE p.period_id = payroll_periods_real.id
  ), 0),
  updated_at = now()
WHERE EXISTS (
  SELECT 1 FROM public.payrolls p 
  WHERE p.period_id = payroll_periods_real.id
);

-- 4. Crear función para obtener historial de períodos
CREATE OR REPLACE FUNCTION public.get_payroll_history_periods(p_company_id uuid DEFAULT NULL)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  company_id_var UUID;
  periods_data jsonb;
BEGIN
  -- Obtener company_id
  IF p_company_id IS NULL THEN
    company_id_var := get_current_user_company_id();
  ELSE
    company_id_var := p_company_id;
  END IF;
  
  IF company_id_var IS NULL THEN
    RAISE EXCEPTION 'No se pudo determinar la empresa del usuario';
  END IF;

  -- Obtener períodos con datos reales
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', ppr.id,
      'period', ppr.periodo,
      'startDate', ppr.fecha_inicio,
      'endDate', ppr.fecha_fin,
      'type', ppr.tipo_periodo,
      'employeesCount', COALESCE(ppr.empleados_count, 0),
      'status', ppr.estado,
      'totalGrossPay', COALESCE(ppr.total_devengado, 0),
      'totalNetPay', COALESCE(ppr.total_neto, 0),
      'totalDeductions', COALESCE(ppr.total_deducciones, 0),
      'totalCost', COALESCE(ppr.total_devengado, 0),
      'employerContributions', COALESCE(ppr.total_devengado * 0.205, 0),
      'paymentStatus', CASE 
        WHEN ppr.estado = 'cerrado' THEN 'pagado'
        WHEN ppr.estado = 'borrador' THEN 'pendiente'
        ELSE 'parcial'
      END,
      'version', 1,
      'createdAt', ppr.created_at,
      'updatedAt', ppr.updated_at,
      'editable', CASE WHEN ppr.estado = 'borrador' THEN true ELSE false END
    ) ORDER BY ppr.fecha_inicio DESC
  ) INTO periods_data
  FROM public.payroll_periods_real ppr
  WHERE ppr.company_id = company_id_var;

  RETURN jsonb_build_object(
    'success', true,
    'data', COALESCE(periods_data, '[]'::jsonb)
  );
END;
$function$;
