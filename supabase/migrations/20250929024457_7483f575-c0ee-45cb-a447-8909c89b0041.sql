-- Create diagnostic function for MAYA authentication
CREATE OR REPLACE FUNCTION public.diagnose_maya_auth(p_company_id UUID DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_user_id UUID;
  current_user_company UUID;
  user_email TEXT;
  company_exists BOOLEAN := FALSE;
  profile_exists BOOLEAN := FALSE;
  diagnostic_result jsonb;
  errors TEXT[] := ARRAY[]::TEXT[];
  recommendations TEXT[] := ARRAY[]::TEXT[];
BEGIN
  -- Get current user ID
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    errors := array_append(errors, 'Usuario no autenticado');
    recommendations := array_append(recommendations, 'Iniciar sesión es requerido');
  ELSE
    -- Check if user profile exists
    SELECT company_id, email INTO current_user_company, user_email
    FROM public.profiles 
    WHERE user_id = current_user_id;
    
    IF FOUND THEN
      profile_exists := TRUE;
      
      -- Check if company exists if provided
      IF p_company_id IS NOT NULL THEN
        SELECT EXISTS(SELECT 1 FROM public.companies WHERE id = p_company_id) INTO company_exists;
        
        IF NOT company_exists THEN
          errors := array_append(errors, format('Empresa solicitada (%s) no existe', p_company_id));
          recommendations := array_append(recommendations, 'Verificar ID de empresa válido');
        END IF;
        
        -- Check company access
        IF current_user_company != p_company_id THEN
          errors := array_append(errors, format('Usuario pertenece a empresa %s pero solicita acceso a %s', 
            current_user_company, p_company_id));
          recommendations := array_append(recommendations, 'Verificar asignación de empresa del usuario');
        END IF;
      END IF;
      
      -- Check if user has any roles
      IF NOT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = current_user_id) THEN
        errors := array_append(errors, 'Usuario no tiene roles asignados');
        recommendations := array_append(recommendations, 'Asignar rol administrador al usuario');
      END IF;
      
    ELSE
      profile_exists := FALSE;
      errors := array_append(errors, 'Perfil de usuario no encontrado en tabla profiles');
      recommendations := array_append(recommendations, 'Crear perfil de usuario con empresa asignada');
    END IF;
  END IF;
  
  -- Build diagnostic result
  diagnostic_result := jsonb_build_object(
    'timestamp', now(),
    'user_id', current_user_id,
    'authentication', jsonb_build_object(
      'is_authenticated', current_user_id IS NOT NULL,
      'user_id', current_user_id
    ),
    'profile', jsonb_build_object(
      'exists', profile_exists,
      'company_id', current_user_company,
      'email', user_email
    ),
    'company_access', jsonb_build_object(
      'requested_company', p_company_id,
      'user_company', current_user_company,
      'company_exists', company_exists,
      'has_access', (p_company_id IS NULL OR (current_user_company = p_company_id AND company_exists))
    ),
    'errors', to_jsonb(errors),
    'recommendations', to_jsonb(recommendations),
    'success', array_length(errors, 1) IS NULL OR array_length(errors, 1) = 0
  );
  
  -- Log diagnostic execution
  INSERT INTO public.security_audit_log (
    table_name, action, violation_type, query_attempted, 
    additional_data, user_id, company_id
  ) VALUES (
    'maya_diagnostics', 'DIAGNOSTIC_RUN', 'authentication_check',
    'diagnose_maya_auth execution',
    diagnostic_result,
    current_user_id, COALESCE(p_company_id, current_user_company)
  );
  
  RETURN diagnostic_result;
END;
$$;

-- Enhanced execute_safe_query with detailed logging
CREATE OR REPLACE FUNCTION public.execute_safe_query(
  query_sql TEXT,
  company_id_param UUID
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result_data jsonb;
  current_user_company UUID;
  current_user_id UUID;
  sanitized_sql TEXT;
  execution_start TIMESTAMP;
  execution_time_ms INTEGER;
BEGIN
  execution_start := clock_timestamp();
  current_user_id := auth.uid();
  
  -- Enhanced authentication and authorization logging
  INSERT INTO public.security_audit_log (
    table_name, action, violation_type, query_attempted, 
    additional_data, user_id, company_id
  ) VALUES (
    'maya_queries', 'QUERY_START', 'authentication_check',
    LEFT(query_sql, 200),
    jsonb_build_object(
      'step', 'authentication_validation',
      'user_id', current_user_id,
      'requested_company', company_id_param,
      'timestamp', execution_start
    ),
    current_user_id, company_id_param
  );
  
  -- Validate authentication
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado - token JWT requerido';
  END IF;
  
  -- Get user's company for security validation with detailed logging
  SELECT company_id INTO current_user_company 
  FROM public.profiles 
  WHERE user_id = current_user_id;
  
  -- Enhanced validation logging
  INSERT INTO public.security_audit_log (
    table_name, action, violation_type, query_attempted, 
    additional_data, user_id, company_id
  ) VALUES (
    'maya_queries', 'COMPANY_VALIDATION', 'authorization_check',
    LEFT(query_sql, 200),
    jsonb_build_object(
      'step', 'company_validation',
      'user_company', current_user_company,
      'requested_company', company_id_param,
      'profile_found', current_user_company IS NOT NULL,
      'companies_match', current_user_company = company_id_param
    ),
    current_user_id, company_id_param
  );
  
  -- Validate user has access to the requested company
  IF current_user_company IS NULL THEN
    RAISE EXCEPTION 'Perfil de usuario no encontrado - verifique que el usuario tenga una empresa asignada';
  END IF;
  
  IF current_user_company != company_id_param THEN
    RAISE EXCEPTION 'Acceso no autorizado a datos de empresa - usuario pertenece a empresa % pero solicita acceso a empresa %', 
      current_user_company, company_id_param;
  END IF;
  
  -- Sanitize the SQL query
  sanitized_sql := TRIM(query_sql);
  sanitized_sql := regexp_replace(sanitized_sql, ';+\s*$', '', 'g');
  
  -- Basic security validation of the query
  IF sanitized_sql IS NULL OR LENGTH(sanitized_sql) = 0 THEN
    RAISE EXCEPTION 'Query no puede estar vacía';
  END IF;
  
  -- Validate query starts with SELECT (case insensitive)
  IF NOT sanitized_sql ~* '^\s*SELECT\b' THEN
    RAISE EXCEPTION 'Solo se permiten consultas SELECT - operación no permitida';
  END IF;
  
  -- Check for forbidden operations (basic security)
  IF sanitized_sql ~* '\b(INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|TRUNCATE|GRANT|REVOKE)\b' THEN
    RAISE EXCEPTION 'Operación no permitida - solo consultas de lectura están habilitadas';
  END IF;
  
  -- Set timeout for safety
  SET LOCAL statement_timeout = '10s';
  
  -- Execute the sanitized query and return results as jsonb
  EXECUTE 'SELECT jsonb_agg(row_to_json(t)) FROM (' || sanitized_sql || ') t' INTO result_data;
  
  execution_time_ms := EXTRACT(epoch FROM (clock_timestamp() - execution_start)) * 1000;
  
  -- Log successful execution
  INSERT INTO public.security_audit_log (
    table_name, action, violation_type, query_attempted, 
    additional_data, user_id, company_id
  ) VALUES (
    'maya_queries', 'QUERY_SUCCESS', 'successful_execution',
    LEFT(sanitized_sql, 500),
    jsonb_build_object(
      'query_length', LENGTH(sanitized_sql), 
      'execution_time_ms', execution_time_ms,
      'result_count', COALESCE(jsonb_array_length(result_data), 0),
      'sql_sanitized_preview', LEFT(sanitized_sql, 200)
    ),
    current_user_id, company_id_param
  );
  
  -- Return empty array if no results
  RETURN COALESCE(result_data, '[]'::jsonb);
  
EXCEPTION WHEN OTHERS THEN
  execution_time_ms := EXTRACT(epoch FROM (clock_timestamp() - execution_start)) * 1000;
  
  -- Enhanced error logging with context
  INSERT INTO public.security_audit_log (
    table_name, action, violation_type, query_attempted, 
    additional_data, user_id, company_id
  ) VALUES (
    'maya_queries', 'QUERY_ERROR', 'execution_failed',
    LEFT(COALESCE(sanitized_sql, query_sql), 500),
    jsonb_build_object(
      'error_message', SQLERRM, 
      'error_state', SQLSTATE,
      'execution_time_ms', execution_time_ms,
      'user_company', current_user_company,
      'requested_company', company_id_param,
      'original_sql_preview', LEFT(query_sql, 200),
      'authentication_context', jsonb_build_object(
        'user_authenticated', current_user_id IS NOT NULL,
        'profile_exists', current_user_company IS NOT NULL,
        'company_match', current_user_company = company_id_param
      )
    ),
    current_user_id, company_id_param
  );
  
  -- Return the original error message for debugging
  RAISE EXCEPTION '%', SQLERRM;
END;
$$;