
-- FASE 1: Corrección de función sync_historical_payroll_data para usar 15 días en períodos quincenales
CREATE OR REPLACE FUNCTION public.sync_historical_payroll_data(p_period_id uuid, p_company_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  period_record RECORD;
  employee_record RECORD;
  sync_log_id UUID;
  records_created INTEGER := 0;
  records_updated INTEGER := 0;
  period_days INTEGER;
  proportional_salary NUMERIC;
  proportional_deductions NUMERIC;
  proportional_net NUMERIC;
  result JSONB;
BEGIN
  -- Validar acceso del usuario
  IF p_company_id IS NULL THEN
    p_company_id := get_current_user_company_id();
  END IF;
  
  IF p_company_id IS NULL THEN
    RAISE EXCEPTION 'No se pudo determinar la empresa del usuario';
  END IF;

  -- Crear log de sincronización
  INSERT INTO public.payroll_sync_log (
    company_id, period_id, sync_type, status
  ) VALUES (
    p_company_id, p_period_id, 'historical_sync', 'processing'
  ) RETURNING id INTO sync_log_id;

  -- Obtener información del período
  SELECT * INTO period_record
  FROM public.payroll_periods_real 
  WHERE id = p_period_id AND company_id = p_company_id;
  
  IF NOT FOUND THEN
    UPDATE public.payroll_sync_log 
    SET status = 'error', error_message = 'Período no encontrado'
    WHERE id = sync_log_id;
    
    RETURN jsonb_build_object('success', false, 'message', 'Período no encontrado');
  END IF;

  -- CALCULAR DÍAS CORRECTOS SEGÚN TIPO DE PERÍODO
  IF period_record.tipo_periodo = 'quincenal' THEN
    period_days := 15; -- CORRECCIÓN: usar 15 días para quincenales
  ELSIF period_record.tipo_periodo = 'semanal' THEN
    period_days := 7;
  ELSE
    -- Para mensual o personalizado, calcular días reales
    period_days := (period_record.fecha_fin - period_record.fecha_inicio) + 1;
  END IF;
  
  RAISE NOTICE 'Período: % - Tipo: % - Días calculados: %', period_record.periodo, period_record.tipo_periodo, period_days;

  -- Si ya existen registros en payrolls para este período, actualizarlos
  IF EXISTS (
    SELECT 1 FROM public.payrolls 
    WHERE company_id = p_company_id 
    AND (period_id = p_period_id OR periodo = period_record.periodo)
  ) THEN
    -- Actualizar registros existentes con días correctos
    FOR employee_record IN
      SELECT p.*, e.salario_base
      FROM public.payrolls p
      JOIN public.employees e ON p.employee_id = e.id
      WHERE p.company_id = p_company_id 
      AND (p.period_id = p_period_id OR p.periodo = period_record.periodo)
    LOOP
      -- Calcular valores proporcionales basados en días correctos
      proportional_salary := (employee_record.salario_base / 30.0) * period_days;
      proportional_deductions := proportional_salary * 0.08; -- 8% deducciones aproximadas
      proportional_net := proportional_salary - proportional_deductions;
      
      UPDATE public.payrolls 
      SET 
        dias_trabajados = period_days,
        total_devengado = proportional_salary,
        total_deducciones = proportional_deductions,
        neto_pagado = proportional_net,
        period_id = p_period_id, -- Asegurar period_id correcto
        periodo = period_record.periodo, -- Sincronizar nombre del período
        updated_at = now()
      WHERE id = employee_record.id;
      
      records_updated := records_updated + 1;
    END LOOP;
    
    RAISE NOTICE 'Registros actualizados: %', records_updated;
  ELSE
    -- Crear registros nuevos para empleados activos
    FOR employee_record IN
      SELECT * FROM public.employees 
      WHERE company_id = p_company_id AND estado = 'activo'
    LOOP
      -- Calcular valores proporcionales basados en días correctos del período
      proportional_salary := (employee_record.salario_base / 30.0) * period_days;
      proportional_deductions := proportional_salary * 0.08; -- 8% deducciones aproximadas
      proportional_net := proportional_salary - proportional_deductions;
      
      INSERT INTO public.payrolls (
        company_id,
        employee_id,
        periodo,
        period_id,
        salario_base,
        dias_trabajados,
        total_devengado,
        total_deducciones,
        neto_pagado,
        estado,
        created_at
      ) VALUES (
        p_company_id,
        employee_record.id,
        period_record.periodo,
        p_period_id,
        employee_record.salario_base,
        period_days, -- Usar días correctos calculados
        proportional_salary, -- Valor proporcional
        proportional_deductions, -- Deducciones proporcionales
        proportional_net, -- Neto proporcional
        'procesada', -- Estado procesada para períodos cerrados
        period_record.created_at
      );
      
      records_created := records_created + 1;
    END LOOP;
  END IF;

  -- FASE 2: Limpiar duplicados por empleado/período
  WITH duplicates AS (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY employee_id, periodo ORDER BY updated_at DESC) as rn
    FROM public.payrolls 
    WHERE company_id = p_company_id 
    AND (period_id = p_period_id OR periodo = period_record.periodo)
  )
  DELETE FROM public.payrolls 
  WHERE id IN (SELECT id FROM duplicates WHERE rn > 1);

  -- Actualizar totales del período con valores reales
  UPDATE public.payroll_periods_real 
  SET 
    empleados_count = (
      SELECT COUNT(*) 
      FROM public.payrolls 
      WHERE period_id = p_period_id
    ),
    total_devengado = (
      SELECT COALESCE(SUM(total_devengado), 0) 
      FROM public.payrolls 
      WHERE period_id = p_period_id
    ),
    total_deducciones = (
      SELECT COALESCE(SUM(total_deducciones), 0) 
      FROM public.payrolls 
      WHERE period_id = p_period_id
    ),
    total_neto = (
      SELECT COALESCE(SUM(neto_pagado), 0) 
      FROM public.payrolls 
      WHERE period_id = p_period_id
    ),
    updated_at = now()
  WHERE id = p_period_id;

  -- Actualizar log de sincronización
  UPDATE public.payroll_sync_log 
  SET 
    status = 'completed',
    records_created = records_created,
    records_updated = records_updated,
    completed_at = now()
  WHERE id = sync_log_id;

  RETURN jsonb_build_object(
    'success', true, 
    'message', format('Corrección completada: %s creados, %s actualizados (Días período %s: %s)', 
                     records_created, records_updated, period_record.tipo_periodo, period_days),
    'records_created', records_created,
    'records_updated', records_updated,
    'period_days', period_days
  );

EXCEPTION WHEN OTHERS THEN
  -- Actualizar log con error
  UPDATE public.payroll_sync_log 
  SET 
    status = 'error',
    error_message = SQLERRM,
    completed_at = now()
  WHERE id = sync_log_id;
  
  RAISE;
END;
$function$;

-- FASE 3: Función específica para limpiar períodos duplicados
CREATE OR REPLACE FUNCTION public.clean_duplicate_periods()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  duplicates_removed INTEGER := 0;
BEGIN
  -- Eliminar períodos duplicados manteniendo el más reciente
  WITH duplicate_periods AS (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY company_id, periodo ORDER BY updated_at DESC) as rn
    FROM public.payroll_periods_real
  )
  DELETE FROM public.payroll_periods_real 
  WHERE id IN (SELECT id FROM duplicate_periods WHERE rn > 1);
  
  GET DIAGNOSTICS duplicates_removed = ROW_COUNT;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', format('%s períodos duplicados eliminados', duplicates_removed),
    'duplicates_removed', duplicates_removed
  );
END;
$function$;

-- FASE 4: Ejecutar limpieza de duplicados
SELECT public.clean_duplicate_periods();
