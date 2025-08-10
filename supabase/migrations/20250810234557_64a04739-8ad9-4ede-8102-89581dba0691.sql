-- Migration 3/5: Add SET search_path to sync and query functions

CREATE OR REPLACE FUNCTION public.sync_payroll_periods()
RETURNS void
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
    period_record RECORD;
BEGIN
    -- Insert missing periods from payrolls into payroll_periods_real
    FOR period_record IN 
        SELECT DISTINCT 
            p.company_id,
            p.periodo,
            MIN(p.created_at) as fecha_inicio_approx,
            MAX(p.updated_at) as fecha_fin_approx,
            'mensual' as tipo_periodo,
            p.estado
        FROM public.payrolls p
        WHERE NOT EXISTS (
            SELECT 1 FROM public.payroll_periods_real ppr 
            WHERE ppr.company_id = p.company_id 
            AND ppr.periodo = p.periodo
        )
        AND p.company_id IS NOT NULL
        GROUP BY p.company_id, p.periodo, p.estado
    LOOP
        INSERT INTO public.payroll_periods_real (
            company_id,
            periodo,
            fecha_inicio,
            fecha_fin,
            tipo_periodo,
            estado,
            empleados_count,
            total_devengado,
            total_deducciones,
            total_neto
        )
        SELECT 
            period_record.company_id,
            period_record.periodo,
            COALESCE(period_record.fecha_inicio_approx::date, CURRENT_DATE),
            COALESCE(period_record.fecha_fin_approx::date, CURRENT_DATE),
            period_record.tipo_periodo,
            period_record.estado,
            COUNT(*) as empleados_count,
            COALESCE(SUM(total_devengado), 0) as total_devengado,
            COALESCE(SUM(total_deducciones), 0) as total_deducciones,
            COALESCE(SUM(neto_pagado), 0) as total_neto
        FROM public.payrolls p
        WHERE p.company_id = period_record.company_id 
        AND p.periodo = period_record.periodo;
    END LOOP;

    RAISE NOTICE 'Synchronization completed successfully';
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_payroll_history_periods(p_company_id uuid DEFAULT NULL::uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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

CREATE OR REPLACE FUNCTION public.get_active_period_for_company(p_company_id uuid DEFAULT NULL::uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    company_id_var UUID;
    active_period RECORD;
    employees_count INTEGER;
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

    -- Buscar período activo (en_proceso o borrador con empleados cargados)
    SELECT * INTO active_period
    FROM public.payroll_periods_real 
    WHERE company_id = company_id_var
    AND estado IN ('en_proceso', 'borrador')
    AND last_activity_at > now() - INTERVAL '24 hours' -- Solo períodos activos recientes
    ORDER BY last_activity_at DESC
    LIMIT 1;
    
    IF active_period.id IS NULL THEN
        RETURN jsonb_build_object('has_active_period', false);
    END IF;
    
    -- Contar empleados en el período
    SELECT COUNT(*) INTO employees_count
    FROM public.payrolls 
    WHERE period_id = active_period.id;
    
    RETURN jsonb_build_object(
        'has_active_period', true,
        'period', jsonb_build_object(
            'id', active_period.id,
            'periodo', active_period.periodo,
            'fecha_inicio', active_period.fecha_inicio,
            'fecha_fin', active_period.fecha_fin,
            'estado', active_period.estado,
            'last_activity_at', active_period.last_activity_at,
            'employees_count', employees_count
        )
    );
END;
$function$;