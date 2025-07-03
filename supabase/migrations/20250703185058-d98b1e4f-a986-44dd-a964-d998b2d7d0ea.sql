
-- Fix the sync_historical_payroll_data function to resolve the ambiguous column error
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

  -- Si ya existen registros en payrolls para este período, no hacer nada
  IF EXISTS (
    SELECT 1 FROM public.payrolls 
    WHERE company_id = p_company_id 
    AND (period_id = p_period_id OR periodo = period_record.periodo)
  ) THEN
    UPDATE public.payroll_sync_log 
    SET status = 'completed', records_created = 0, completed_at = now()
    WHERE id = sync_log_id;
    
    RETURN jsonb_build_object('success', true, 'message', 'Ya existen registros para este período');
  END IF;

  -- Crear registros básicos para empleados activos
  FOR employee_record IN
    SELECT * FROM public.employees 
    WHERE company_id = p_company_id AND estado = 'activo'
  LOOP
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
      COALESCE(employee_record.dias_trabajo, 30),
      employee_record.salario_base, -- Valor básico
      employee_record.salario_base * 0.08, -- 8% deducciones aproximadas
      employee_record.salario_base * 0.92, -- Neto aproximado
      'procesada', -- Estado procesada para períodos cerrados
      period_record.created_at
    );
    
    records_created := records_created + 1;
  END LOOP;

  -- Actualizar totales del período
  UPDATE public.payroll_periods_real 
  SET 
    empleados_count = records_created,
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

  -- Actualizar log de sincronización - FIX: specify table alias for records_created
  UPDATE public.payroll_sync_log 
  SET 
    status = 'completed',
    records_created = records_created,
    completed_at = now()
  WHERE id = sync_log_id;

  RETURN jsonb_build_object(
    'success', true, 
    'message', format('Se crearon %s registros históricos', records_created),
    'records_created', records_created
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

-- Create a function to generate payroll records before closing periods
CREATE OR REPLACE FUNCTION public.generate_payroll_records_for_period(p_period_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  period_record RECORD;
  employee_record RECORD;
  company_id_var UUID;
  records_created INTEGER := 0;
BEGIN
  -- Get period information
  SELECT * INTO period_record
  FROM public.payroll_periods_real 
  WHERE id = p_period_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Período no encontrado');
  END IF;

  company_id_var := period_record.company_id;

  -- Check if payroll records already exist
  IF EXISTS (
    SELECT 1 FROM public.payrolls 
    WHERE period_id = p_period_id
  ) THEN
    RETURN jsonb_build_object('success', true, 'message', 'Los registros de nómina ya existen');
  END IF;

  -- Create payroll records for active employees
  FOR employee_record IN
    SELECT * FROM public.employees 
    WHERE company_id = company_id_var AND estado = 'activo'
  LOOP
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
      company_id_var,
      employee_record.id,
      period_record.periodo,
      p_period_id,
      employee_record.salario_base,
      COALESCE(employee_record.dias_trabajo, 30),
      employee_record.salario_base,
      employee_record.salario_base * 0.08,
      employee_record.salario_base * 0.92,
      'borrador',
      now()
    );
    
    records_created := records_created + 1;
  END LOOP;

  -- Update period totals
  UPDATE public.payroll_periods_real 
  SET 
    empleados_count = records_created,
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

  RETURN jsonb_build_object(
    'success', true, 
    'message', format('Se crearon %s registros de nómina', records_created),
    'records_created', records_created
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false, 
    'message', format('Error creando registros: %s', SQLERRM)
  );
END;
$function$;
