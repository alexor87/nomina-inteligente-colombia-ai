-- Migration 5/5: Add SET search_path to smart period detection functions and historical sync

CREATE OR REPLACE FUNCTION public.sync_historical_payroll_data(p_period_id uuid, p_company_id uuid DEFAULT NULL::uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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

CREATE OR REPLACE FUNCTION public.detect_smart_current_period(p_company_id uuid DEFAULT NULL::uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  company_id_var UUID;
  company_periodicity TEXT;
  current_date_var DATE;
  period_start DATE;
  period_end DATE;
  period_name TEXT;
  existing_period RECORD;
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

  -- Obtener configuración de periodicidad
  SELECT periodicity INTO company_periodicity
  FROM public.company_settings 
  WHERE company_id = company_id_var;
  
  -- Si no existe configuración, usar mensual por defecto
  IF company_periodicity IS NULL THEN
    company_periodicity := 'mensual';
  END IF;
  
  current_date_var := CURRENT_DATE;
  
  -- Calcular período actual basado en la fecha y periodicidad
  CASE company_periodicity
    WHEN 'quincenal' THEN
      -- Para quincenal: 1-15 y 16-último día del mes
      IF EXTRACT(DAY FROM current_date_var) <= 15 THEN
        period_start := DATE_TRUNC('month', current_date_var)::DATE;
        period_end := DATE_TRUNC('month', current_date_var)::DATE + INTERVAL '14 days';
        period_name := format('1 - 15 %s %s', 
          CASE EXTRACT(MONTH FROM current_date_var)
            WHEN 1 THEN 'Enero' WHEN 2 THEN 'Febrero' WHEN 3 THEN 'Marzo'
            WHEN 4 THEN 'Abril' WHEN 5 THEN 'Mayo' WHEN 6 THEN 'Junio'
            WHEN 7 THEN 'Julio' WHEN 8 THEN 'Agosto' WHEN 9 THEN 'Septiembre'
            WHEN 10 THEN 'Octubre' WHEN 11 THEN 'Noviembre' WHEN 12 THEN 'Diciembre'
          END,
          EXTRACT(YEAR FROM current_date_var)
        );
      ELSE
        period_start := DATE_TRUNC('month', current_date_var)::DATE + INTERVAL '15 days';
        period_end := (DATE_TRUNC('month', current_date_var) + INTERVAL '1 month - 1 day')::DATE;
        period_name := format('16 - %s %s %s', 
          EXTRACT(DAY FROM period_end),
          CASE EXTRACT(MONTH FROM current_date_var)
            WHEN 1 THEN 'Enero' WHEN 2 THEN 'Febrero' WHEN 3 THEN 'Marzo'
            WHEN 4 THEN 'Abril' WHEN 5 THEN 'Mayo' WHEN 6 THEN 'Junio'
            WHEN 7 THEN 'Julio' WHEN 8 THEN 'Agosto' WHEN 9 THEN 'Septiembre'
            WHEN 10 THEN 'Octubre' WHEN 11 THEN 'Noviembre' WHEN 12 THEN 'Diciembre'
          END,
          EXTRACT(YEAR FROM current_date_var)
        );
      END IF;
      
    WHEN 'semanal' THEN
      -- Para semanal: lunes a domingo
      period_start := current_date_var - (EXTRACT(DOW FROM current_date_var) - 1) * INTERVAL '1 day';
      period_end := period_start + INTERVAL '6 days';
      period_name := format('Semana %s-%s %s %s', 
        EXTRACT(DAY FROM period_start),
        EXTRACT(DAY FROM period_end),
        CASE EXTRACT(MONTH FROM current_date_var)
          WHEN 1 THEN 'Enero' WHEN 2 THEN 'Febrero' WHEN 3 THEN 'Marzo'
          WHEN 4 THEN 'Abril' WHEN 5 THEN 'Mayo' WHEN 6 THEN 'Junio'
          WHEN 7 THEN 'Julio' WHEN 8 THEN 'Agosto' WHEN 9 THEN 'Septiembre'
          WHEN 10 THEN 'Octubre' WHEN 11 THEN 'Noviembre' WHEN 12 THEN 'Diciembre'
        END,
        EXTRACT(YEAR FROM current_date_var)
      );
      
    ELSE -- mensual por defecto
      period_start := DATE_TRUNC('month', current_date_var)::DATE;
      period_end := (DATE_TRUNC('month', current_date_var) + INTERVAL '1 month - 1 day')::DATE;
      period_name := format('%s %s', 
        CASE EXTRACT(MONTH FROM current_date_var)
          WHEN 1 THEN 'Enero' WHEN 2 THEN 'Febrero' WHEN 3 THEN 'Marzo'
          WHEN 4 THEN 'Abril' WHEN 5 THEN 'Mayo' WHEN 6 THEN 'Junio'
          WHEN 7 THEN 'Julio' WHEN 8 THEN 'Agosto' WHEN 9 THEN 'Septiembre'
          WHEN 10 THEN 'Octubre' WHEN 11 THEN 'Noviembre' WHEN 12 THEN 'Diciembre'
        END,
        EXTRACT(YEAR FROM current_date_var)
      );
  END CASE;
  
  -- Verificar si ya existe un período activo que coincida con las fechas
  SELECT * INTO existing_period
  FROM public.payroll_periods_real 
  WHERE company_id = company_id_var
    AND fecha_inicio = period_start
    AND fecha_fin = period_end
    AND estado IN ('borrador', 'en_proceso')
  ORDER BY created_at DESC
  LIMIT 1;
  
  RETURN jsonb_build_object(
    'success', true,
    'current_date', current_date_var,
    'periodicity', company_periodicity,
    'suggested_period', jsonb_build_object(
      'start_date', period_start,
      'end_date', period_end,
      'period_name', period_name,
      'type', company_periodicity
    ),
    'existing_period', CASE 
      WHEN existing_period.id IS NOT NULL THEN 
        jsonb_build_object(
          'id', existing_period.id,
          'periodo', existing_period.periodo,
          'estado', existing_period.estado,
          'fecha_inicio', existing_period.fecha_inicio,
          'fecha_fin', existing_period.fecha_fin
        )
      ELSE NULL 
    END,
    'action', CASE 
      WHEN existing_period.id IS NOT NULL THEN 'resume'
      ELSE 'create'
    END
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.detect_current_smart_period(p_company_id uuid DEFAULT NULL::uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  company_id_var UUID;
  company_periodicity TEXT;
  current_date_var DATE;
  period_start DATE;
  period_end DATE;
  period_name TEXT;
  existing_period RECORD;
  active_period RECORD;
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

  -- Obtener configuración de periodicidad
  SELECT periodicity INTO company_periodicity
  FROM public.company_settings 
  WHERE company_id = company_id_var;
  
  -- Si no existe configuración, usar quincenal por defecto
  IF company_periodicity IS NULL THEN
    company_periodicity := 'quincenal';
  END IF;
  
  current_date_var := CURRENT_DATE;
  RAISE NOTICE 'Fecha actual: %, Periodicidad: %', current_date_var, company_periodicity;
  
  -- LÓGICA CORREGIDA: Calcular período actual basado en la fecha actual
  CASE company_periodicity
    WHEN 'quincenal' THEN
      -- Para quincenal: 1-15 y 16-último día del mes
      IF EXTRACT(DAY FROM current_date_var) <= 15 THEN
        -- Primera quincena (1-15)
        period_start := DATE_TRUNC('month', current_date_var)::DATE;
        period_end := (DATE_TRUNC('month', current_date_var) + INTERVAL '14 days')::DATE;
        period_name := format('1 - 15 %s %s', 
          CASE EXTRACT(MONTH FROM current_date_var)
            WHEN 1 THEN 'Enero' WHEN 2 THEN 'Febrero' WHEN 3 THEN 'Marzo'
            WHEN 4 THEN 'Abril' WHEN 5 THEN 'Mayo' WHEN 6 THEN 'Junio'
            WHEN 7 THEN 'Julio' WHEN 8 THEN 'Agosto' WHEN 9 THEN 'Septiembre'
            WHEN 10 THEN 'Octubre' WHEN 11 THEN 'Noviembre' WHEN 12 THEN 'Diciembre'
          END,
          EXTRACT(YEAR FROM current_date_var)::text
        );
      ELSE
        -- Segunda quincena (16-fin de mes)
        period_start := (DATE_TRUNC('month', current_date_var) + INTERVAL '15 days')::DATE;
        period_end := (DATE_TRUNC('month', current_date_var) + INTERVAL '1 month - 1 day')::DATE;
        period_name := format('16 - %s %s %s', 
          EXTRACT(DAY FROM period_end)::text,
          CASE EXTRACT(MONTH FROM current_date_var)
            WHEN 1 THEN 'Enero' WHEN 2 THEN 'Febrero' WHEN 3 THEN 'Marzo'
            WHEN 4 THEN 'Abril' WHEN 5 THEN 'Mayo' WHEN 6 THEN 'Junio'
            WHEN 7 THEN 'Julio' WHEN 8 THEN 'Agosto' WHEN 9 THEN 'Septiembre'
            WHEN 10 THEN 'Octubre' WHEN 11 THEN 'Noviembre' WHEN 12 THEN 'Diciembre'
          END,
          EXTRACT(YEAR FROM current_date_var)::text
        );
      END IF;
      
    WHEN 'semanal' THEN
      -- Para semanal: lunes a domingo
      period_start := (current_date_var - (EXTRACT(DOW FROM current_date_var) - 1) * INTERVAL '1 day')::DATE;
      period_end := (period_start + INTERVAL '6 days')::DATE;
      period_name := format('Semana %s-%s %s %s', 
        EXTRACT(DAY FROM period_start)::text,
        EXTRACT(DAY FROM period_end)::text,
        CASE EXTRACT(MONTH FROM current_date_var)
          WHEN 1 THEN 'Enero' WHEN 2 THEN 'Febrero' WHEN 3 THEN 'Marzo'
          WHEN 4 THEN 'Abril' WHEN 5 THEN 'Mayo' WHEN 6 THEN 'Junio'
          WHEN 7 THEN 'Julio' WHEN 8 THEN 'Agosto' WHEN 9 THEN 'Septiembre'
          WHEN 10 THEN 'Octubre' WHEN 11 THEN 'Noviembre' WHEN 12 THEN 'Diciembre'
        END,
        EXTRACT(YEAR FROM current_date_var)::text
      );
      
    ELSE -- mensual por defecto
      period_start := DATE_TRUNC('month', current_date_var)::DATE;
      period_end := (DATE_TRUNC('month', current_date_var) + INTERVAL '1 month - 1 day')::DATE;
      period_name := format('%s %s', 
        CASE EXTRACT(MONTH FROM current_date_var)
          WHEN 1 THEN 'Enero' WHEN 2 THEN 'Febrero' WHEN 3 THEN 'Marzo'
          WHEN 4 THEN 'Abril' WHEN 5 THEN 'Mayo' WHEN 6 THEN 'Junio'
          WHEN 7 THEN 'Julio' WHEN 8 THEN 'Agosto' WHEN 9 THEN 'Septiembre'
          WHEN 10 THEN 'Octubre' WHEN 11 THEN 'Noviembre' WHEN 12 THEN 'Diciembre'
        END,
        EXTRACT(YEAR FROM current_date_var)::text
      );
  END CASE;
  
  RAISE NOTICE 'Período calculado: % (% - %)', period_name, period_start, period_end;
  
  -- Verificar si ya existe un período activo
  SELECT * INTO active_period
  FROM public.payroll_periods_real 
  WHERE company_id = company_id_var
    AND estado IN ('borrador', 'en_proceso')
  ORDER BY created_at DESC
  LIMIT 1;
  
END;
$function$;