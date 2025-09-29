-- Create diagnostic function for MAYA authentication issues
CREATE OR REPLACE FUNCTION public.diagnose_maya_auth(
  p_requesting_user_id uuid,
  p_target_company_id uuid
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_exists boolean := false;
  user_company_id uuid;
  user_profile_exists boolean := false;
  user_roles_count integer := 0;
  diagnosis jsonb;
BEGIN
  -- Check if user exists in auth
  SELECT EXISTS(SELECT 1 FROM auth.users WHERE id = p_requesting_user_id) INTO user_exists;
  
  -- Check user profile and company
  SELECT company_id INTO user_company_id
  FROM public.profiles 
  WHERE user_id = p_requesting_user_id;
  
  user_profile_exists := user_company_id IS NOT NULL;
  
  -- Check user roles
  SELECT COUNT(*) INTO user_roles_count
  FROM public.user_roles 
  WHERE user_id = p_requesting_user_id AND company_id = p_target_company_id;
  
  -- Build diagnosis
  diagnosis := jsonb_build_object(
    'user_exists', user_exists,
    'user_profile_exists', user_profile_exists,
    'user_company_id', user_company_id,
    'target_company_id', p_target_company_id,
    'companies_match', user_company_id = p_target_company_id,
    'user_roles_count', user_roles_count,
    'diagnosis_timestamp', now()
  );
  
  -- Log diagnosis
  INSERT INTO public.security_audit_log (
    table_name, action, violation_type, additional_data, user_id, company_id
  ) VALUES (
    'maya_auth_diagnosis', 'DIAGNOSTIC', 'maya_auth_check', diagnosis, 
    p_requesting_user_id, p_target_company_id
  );
  
  RETURN diagnosis;
END;
$$;

-- Create the secure MAYA query router
CREATE OR REPLACE FUNCTION public.maya_query_router(
  query_type text,
  target_company_id uuid,
  params jsonb,
  requesting_user_id uuid
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_company_id uuid;
  result jsonb;
  start_time timestamptz := clock_timestamp();
  execution_time_ms integer;
  employee_name text;
  year_param integer;
  month_param integer;
  period_param text;
  limit_param integer;
BEGIN
  -- Validate requesting user exists and has access to target company
  SELECT company_id INTO user_company_id
  FROM public.profiles 
  WHERE user_id = requesting_user_id;
  
  IF user_company_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no encontrado o sin empresa asignada';
  END IF;
  
  IF user_company_id != target_company_id THEN
    RAISE EXCEPTION 'Usuario no tiene acceso a la empresa solicitada';
  END IF;
  
  -- Execute whitelisted queries based on query_type
  CASE query_type
    WHEN 'EMPLOYEE_NETO_ANUAL' THEN
      employee_name := LOWER(TRIM(params->>'name'));
      year_param := (params->>'year')::integer;
      
      SELECT jsonb_build_object(
        'total_neto', COALESCE(SUM(p.neto_pagado), 0),
        'periods_count', COUNT(*),
        'employee_name', employee_name,
        'year', year_param
      ) INTO result
      FROM public.payrolls p
      JOIN public.employees e ON p.employee_id = e.id
      WHERE p.company_id = target_company_id
        AND EXTRACT(YEAR FROM p.created_at) = year_param
        AND (LOWER(e.nombre) LIKE '%' || employee_name || '%' 
             OR LOWER(e.apellido) LIKE '%' || employee_name || '%'
             OR LOWER(e.nombre || ' ' || e.apellido) LIKE '%' || employee_name || '%');
             
    WHEN 'EMPLOYEE_NETO_ULTIMO_PERIODO' THEN
      employee_name := LOWER(TRIM(params->>'name'));
      
      SELECT jsonb_build_object(
        'neto_pagado', p.neto_pagado,
        'periodo', p.periodo,
        'employee_name', e.nombre || ' ' || e.apellido,
        'fecha', p.created_at
      ) INTO result
      FROM public.payrolls p
      JOIN public.employees e ON p.employee_id = e.id
      WHERE p.company_id = target_company_id
        AND (LOWER(e.nombre) LIKE '%' || employee_name || '%' 
             OR LOWER(e.apellido) LIKE '%' || employee_name || '%'
             OR LOWER(e.nombre || ' ' || e.apellido) LIKE '%' || employee_name || '%')
      ORDER BY p.created_at DESC
      LIMIT 1;
      
    WHEN 'PERIOD_TOTALS' THEN
      period_param := params->>'period';
      year_param := (params->>'year')::integer;
      
      SELECT jsonb_build_object(
        'total_devengado', COALESCE(SUM(p.total_devengado), 0),
        'total_deducciones', COALESCE(SUM(p.total_deducciones), 0),
        'total_neto', COALESCE(SUM(p.neto_pagado), 0),
        'employees_count', COUNT(DISTINCT p.employee_id),
        'period', period_param,
        'year', year_param
      ) INTO result
      FROM public.payrolls p
      WHERE p.company_id = target_company_id
        AND (period_param IS NULL OR p.periodo = period_param)
        AND (year_param IS NULL OR EXTRACT(YEAR FROM p.created_at) = year_param);
        
    WHEN 'TOP_SALARIES' THEN
      limit_param := COALESCE((params->>'limit')::integer, 5);
      
      SELECT jsonb_agg(
        jsonb_build_object(
          'employee_name', e.nombre || ' ' || e.apellido,
          'salario_base', e.salario_base,
          'cargo', e.cargo
        )
      ) INTO result
      FROM public.employees e
      WHERE e.company_id = target_company_id
        AND e.estado = 'activo'
      ORDER BY e.salario_base DESC
      LIMIT limit_param;
      
    WHEN 'EMPLOYEE_HISTORY' THEN
      employee_name := LOWER(TRIM(params->>'name'));
      limit_param := COALESCE((params->>'limit')::integer, 10);
      
      SELECT jsonb_agg(
        jsonb_build_object(
          'periodo', p.periodo,
          'neto_pagado', p.neto_pagado,
          'total_devengado', p.total_devengado,
          'total_deducciones', p.total_deducciones,
          'fecha', p.created_at
        )
      ) INTO result
      FROM public.payrolls p
      JOIN public.employees e ON p.employee_id = e.id
      WHERE p.company_id = target_company_id
        AND (LOWER(e.nombre) LIKE '%' || employee_name || '%' 
             OR LOWER(e.apellido) LIKE '%' || employee_name || '%'
             OR LOWER(e.nombre || ' ' || e.apellido) LIKE '%' || employee_name || '%')
      ORDER BY p.created_at DESC
      LIMIT limit_param;
      
    ELSE
      RAISE EXCEPTION 'Tipo de consulta no soportado: %', query_type;
  END CASE;
  
  -- Calculate execution time
  execution_time_ms := EXTRACT(EPOCH FROM (clock_timestamp() - start_time)) * 1000;
  
  -- Log successful query
  INSERT INTO public.security_audit_log (
    table_name, action, violation_type, additional_data, user_id, company_id
  ) VALUES (
    'maya_query_router', 'QUERY_EXECUTED', 'maya_structured_query',
    jsonb_build_object(
      'query_type', query_type,
      'params', params,
      'execution_time_ms', execution_time_ms,
      'result_size', jsonb_array_length(COALESCE(result, '[]'::jsonb))
    ),
    requesting_user_id, target_company_id
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'data', result,
    'query_type', query_type,
    'execution_time_ms', execution_time_ms
  );
  
EXCEPTION WHEN OTHERS THEN
  -- Log error
  INSERT INTO public.security_audit_log (
    table_name, action, violation_type, additional_data, user_id, company_id
  ) VALUES (
    'maya_query_router', 'QUERY_ERROR', 'maya_query_failed',
    jsonb_build_object(
      'query_type', query_type,
      'params', params,
      'error_message', SQLERRM,
      'error_state', SQLSTATE
    ),
    requesting_user_id, target_company_id
  );
  
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'query_type', query_type
  );
END;
$$;