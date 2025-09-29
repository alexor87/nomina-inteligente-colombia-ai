-- Add EMPLOYEE_PAYROLL_COUNT case to maya_query_router
CREATE OR REPLACE FUNCTION public.maya_query_router(
  query_type TEXT,
  params JSONB,
  company_id UUID,
  user_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
  employee_name TEXT;
  query_year INTEGER;
  payroll_count INTEGER;
  employee_found BOOLEAN := FALSE;
BEGIN
  -- Log security attempt
  INSERT INTO security_audit_log (
    table_name, action, violation_type, query_attempted, 
    additional_data, user_id, company_id
  ) VALUES (
    'maya_query_router', 'STRUCTURED_QUERY', 'secure_router_access',
    format('Query type: %s, params: %s', query_type, params::text),
    jsonb_build_object('query_type', query_type, 'params', params),
    user_id, company_id
  );

  -- Validate company access
  IF NOT EXISTS (
    SELECT 1 FROM profiles WHERE user_id = maya_query_router.user_id AND company_id = maya_query_router.company_id
  ) THEN
    RAISE EXCEPTION 'Acceso no autorizado a la empresa';
  END IF;

  CASE query_type
    WHEN 'EMPLOYEE_NETO_ANUAL' THEN
      employee_name := params->>'name';
      query_year := COALESCE((params->>'year')::INTEGER, EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER);
      
      SELECT jsonb_build_object(
        'employee_name', e.nombre || ' ' || e.apellido,
        'year', query_year,
        'total_neto', COALESCE(SUM(p.neto_pagado), 0),
        'payroll_count', COUNT(p.id)
      ) INTO result
      FROM employees e
      LEFT JOIN payrolls p ON e.id = p.employee_id 
        AND EXTRACT(YEAR FROM p.created_at) = query_year
        AND p.estado = 'procesada'
      WHERE e.company_id = maya_query_router.company_id
        AND (LOWER(e.nombre) LIKE '%' || LOWER(employee_name) || '%' 
             OR LOWER(e.apellido) LIKE '%' || LOWER(employee_name) || '%')
      GROUP BY e.id, e.nombre, e.apellido;

    WHEN 'EMPLOYEE_NETO_ULTIMO_PERIODO' THEN
      employee_name := params->>'name';
      
      SELECT jsonb_build_object(
        'employee_name', e.nombre || ' ' || e.apellido,
        'period', p.periodo,
        'neto_pagado', p.neto_pagado,
        'fecha', p.created_at
      ) INTO result
      FROM employees e
      JOIN payrolls p ON e.id = p.employee_id
      WHERE e.company_id = maya_query_router.company_id
        AND (LOWER(e.nombre) LIKE '%' || LOWER(employee_name) || '%' 
             OR LOWER(e.apellido) LIKE '%' || LOWER(employee_name) || '%')
        AND p.estado = 'procesada'
      ORDER BY p.created_at DESC
      LIMIT 1;

    WHEN 'EMPLOYEE_PAYROLL_COUNT' THEN
      employee_name := params->>'name';
      query_year := (params->>'year')::INTEGER;
      
      -- Check if employee exists
      SELECT EXISTS (
        SELECT 1 FROM employees 
        WHERE company_id = maya_query_router.company_id
          AND (LOWER(nombre) LIKE '%' || LOWER(employee_name) || '%' 
               OR LOWER(apellido) LIKE '%' || LOWER(employee_name) || '%')
      ) INTO employee_found;

      IF NOT employee_found THEN
        result := jsonb_build_object(
          'error', 'Empleado no encontrado',
          'employee_searched', employee_name
        );
      ELSE
        SELECT 
          COUNT(p.id),
          e.nombre || ' ' || e.apellido
        INTO payroll_count, employee_name
        FROM employees e
        LEFT JOIN payrolls p ON e.id = p.employee_id 
          AND p.estado = 'procesada'
          AND (query_year IS NULL OR EXTRACT(YEAR FROM p.created_at) = query_year)
        WHERE e.company_id = maya_query_router.company_id
          AND (LOWER(e.nombre) LIKE '%' || LOWER(params->>'name') || '%' 
               OR LOWER(e.apellido) LIKE '%' || LOWER(params->>'name') || '%')
        GROUP BY e.id, e.nombre, e.apellido
        LIMIT 1;

        result := jsonb_build_object(
          'employee_name', employee_name,
          'payroll_count', payroll_count,
          'year_filter', query_year,
          'message', CASE 
            WHEN query_year IS NOT NULL THEN 
              format('Se han pagado %s nóminas a %s en el año %s', payroll_count, employee_name, query_year)
            ELSE 
              format('Se han pagado %s nóminas a %s en total', payroll_count, employee_name)
          END
        );
      END IF;

    WHEN 'PERIOD_TOTALS' THEN
      SELECT jsonb_build_object(
        'total_devengado', COALESCE(SUM(total_devengado), 0),
        'total_deducciones', COALESCE(SUM(total_deducciones), 0),
        'total_neto', COALESCE(SUM(total_neto), 0),
        'empleados_count', COALESCE(SUM(empleados_count), 0)
      ) INTO result
      FROM payroll_periods_real 
      WHERE company_id = maya_query_router.company_id
        AND estado = 'cerrado';

    WHEN 'TOP_SALARIES' THEN
      SELECT jsonb_agg(
        jsonb_build_object(
          'employee_name', e.nombre || ' ' || e.apellido,
          'salary', e.salario_base,
          'position', e.cargo
        ) ORDER BY e.salario_base DESC
      ) INTO result
      FROM employees e
      WHERE e.company_id = maya_query_router.company_id 
        AND e.estado = 'activo'
      LIMIT COALESCE((params->>'limit')::INTEGER, 10);

    WHEN 'EMPLOYEE_HISTORY' THEN
      employee_name := params->>'name';
      
      SELECT jsonb_agg(
        jsonb_build_object(
          'periodo', p.periodo,
          'neto_pagado', p.neto_pagado,
          'total_devengado', p.total_devengado,
          'created_at', p.created_at
        ) ORDER BY p.created_at DESC
      ) INTO result
      FROM employees e
      JOIN payrolls p ON e.id = p.employee_id
      WHERE e.company_id = maya_query_router.company_id
        AND (LOWER(e.nombre) LIKE '%' || LOWER(employee_name) || '%' 
             OR LOWER(e.apellido) LIKE '%' || LOWER(employee_name) || '%')
        AND p.estado = 'procesada'
      LIMIT COALESCE((params->>'limit')::INTEGER, 12);

    ELSE
      RAISE EXCEPTION 'Tipo de consulta no soportado: %', query_type;
      
  END CASE;

  RETURN COALESCE(result, '{}'::jsonb);
  
EXCEPTION WHEN OTHERS THEN
  -- Log error for debugging
  INSERT INTO security_audit_log (
    table_name, action, violation_type, query_attempted, 
    additional_data, user_id, company_id
  ) VALUES (
    'maya_query_router', 'QUERY_ERROR', 'router_execution_failed',
    format('Query type: %s failed', query_type),
    jsonb_build_object('error', SQLERRM, 'query_type', query_type),
    user_id, company_id
  );
  
  RETURN jsonb_build_object('error', SQLERRM, 'query_type', query_type);
END;
$$;