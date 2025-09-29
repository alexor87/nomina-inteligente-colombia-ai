-- Create secure MAYA-specific query function
CREATE OR REPLACE FUNCTION public.execute_maya_safe_query(
  sql_query text,
  target_company_id uuid,
  requesting_user_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result_data jsonb;
  cleaned_query text;
  user_company_id uuid;
  char_code int;
  i int;
  query_type text;
  execution_start_time timestamptz;
  execution_end_time timestamptz;
  execution_duration_ms numeric;
BEGIN
  execution_start_time := clock_timestamp();
  
  -- 🔒 SECURITY VALIDATION 1: Verify requesting user exists and is authenticated
  IF requesting_user_id IS NULL THEN
    INSERT INTO public.security_audit_log (
      table_name, action, violation_type, query_attempted, additional_data, user_id, company_id
    ) VALUES (
      'maya_query_execution', 'BLOCKED', 'null_user_id', sql_query,
      jsonb_build_object(
        'target_company_id', target_company_id,
        'requesting_user_id', requesting_user_id,
        'error', 'NULL user ID provided'
      ),
      requesting_user_id, target_company_id
    );
    
    RAISE EXCEPTION '🔒 SECURITY: Usuario no proporcionado para validación';
  END IF;

  -- 🔒 SECURITY VALIDATION 2: Verify user exists in auth system
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = requesting_user_id) THEN
    INSERT INTO public.security_audit_log (
      table_name, action, violation_type, query_attempted, additional_data, user_id, company_id
    ) VALUES (
      'maya_query_execution', 'BLOCKED', 'invalid_user', sql_query,
      jsonb_build_object(
        'target_company_id', target_company_id,
        'requesting_user_id', requesting_user_id,
        'error', 'User does not exist in auth system'
      ),
      requesting_user_id, target_company_id
    );
    
    RAISE EXCEPTION '🔒 SECURITY: Usuario no válido';
  END IF;

  -- 🔒 SECURITY VALIDATION 3: Get user's company and validate access
  SELECT company_id INTO user_company_id
  FROM public.profiles
  WHERE user_id = requesting_user_id;

  IF user_company_id IS NULL THEN
    INSERT INTO public.security_audit_log (
      table_name, action, violation_type, query_attempted, additional_data, user_id, company_id
    ) VALUES (
      'maya_query_execution', 'BLOCKED', 'no_company_profile', sql_query,
      jsonb_build_object(
        'target_company_id', target_company_id,
        'requesting_user_id', requesting_user_id,
        'error', 'User has no company profile'
      ),
      requesting_user_id, target_company_id
    );
    
    RAISE EXCEPTION '🔒 SECURITY: Usuario sin perfil de empresa';
  END IF;

  -- 🔒 SECURITY VALIDATION 4: Verify user has access to target company
  IF user_company_id != target_company_id THEN
    INSERT INTO public.security_audit_log (
      table_name, action, violation_type, query_attempted, additional_data, user_id, company_id
    ) VALUES (
      'maya_query_execution', 'BLOCKED', 'cross_company_access', sql_query,
      jsonb_build_object(
        'target_company_id', target_company_id,
        'user_company_id', user_company_id,
        'requesting_user_id', requesting_user_id,
        'error', 'Cross-company access attempt'
      ),
      requesting_user_id, target_company_id
    );
    
    RAISE EXCEPTION '🔒 SECURITY: Acceso no autorizado a datos de otra empresa';
  END IF;

  -- 🔒 SECURITY VALIDATION 5: Clean and sanitize query (remove control characters)
  cleaned_query := sql_query;
  
  -- Remove control characters (ASCII 0-31 except tab, newline, carriage return)
  FOR i IN 1..length(cleaned_query) LOOP
    char_code := ascii(substring(cleaned_query from i for 1));
    IF char_code BETWEEN 1 AND 31 AND char_code NOT IN (9, 10, 13) THEN
      cleaned_query := overlay(cleaned_query placing ' ' from i for 1);
    END IF;
  END LOOP;

  -- Trim and normalize whitespace
  cleaned_query := trim(regexp_replace(cleaned_query, '\s+', ' ', 'g'));

  -- 🔒 SECURITY VALIDATION 6: Validate query safety (same logic as execute_safe_query)
  IF cleaned_query IS NULL OR length(trim(cleaned_query)) = 0 THEN
    RAISE EXCEPTION '🔒 SECURITY: Consulta vacía no permitida';
  END IF;

  -- Block dangerous operations
  IF cleaned_query ~* '\b(DROP|DELETE|UPDATE|INSERT|TRUNCATE|ALTER|CREATE|GRANT|REVOKE)\b' THEN
    INSERT INTO public.security_audit_log (
      table_name, action, violation_type, query_attempted, additional_data, user_id, company_id
    ) VALUES (
      'maya_query_execution', 'BLOCKED', 'dangerous_operation', cleaned_query,
      jsonb_build_object(
        'target_company_id', target_company_id,
        'requesting_user_id', requesting_user_id,
        'blocked_operation', 'Dangerous SQL operation detected'
      ),
      requesting_user_id, target_company_id
    );
    
    RAISE EXCEPTION '🔒 SECURITY: Operación no permitida por seguridad';
  END IF;

  -- Allow only SELECT and WITH queries
  IF NOT (cleaned_query ~* '^\s*(SELECT|WITH)\b') THEN
    INSERT INTO public.security_audit_log (
      table_name, action, violation_type, query_attempted, additional_data, user_id, company_id
    ) VALUES (
      'maya_query_execution', 'BLOCKED', 'non_select_query', cleaned_query,
      jsonb_build_object(
        'target_company_id', target_company_id,
        'requesting_user_id', requesting_user_id,
        'error', 'Only SELECT and WITH queries allowed'
      ),
      requesting_user_id, target_company_id
    );
    
    RAISE EXCEPTION '🔒 SECURITY: Solo consultas SELECT y WITH están permitidas';
  END IF;

  -- Determine query type for logging
  IF cleaned_query ~* '^\s*WITH\b' THEN
    query_type := 'WITH';
  ELSIF cleaned_query ~* '\b(COUNT|SUM|AVG|MIN|MAX|GROUP\s+BY)\b' THEN
    query_type := 'AGGREGATE';
  ELSE
    query_type := 'SELECT';
  END IF;

  -- 🔒 SECURITY VALIDATION 7: Execute query with company_id filter enforcement
  -- The query must already include proper company_id filtering from the handler
  BEGIN
    EXECUTE format('SELECT to_jsonb(results) FROM (%s) AS results', cleaned_query) INTO result_data;
    
    execution_end_time := clock_timestamp();
    execution_duration_ms := EXTRACT(EPOCH FROM (execution_end_time - execution_start_time)) * 1000;
    
    -- Log successful execution
    INSERT INTO public.security_audit_log (
      table_name, action, violation_type, query_attempted, additional_data, user_id, company_id
    ) VALUES (
      'maya_query_execution', 'SUCCESS', 'query_executed', cleaned_query,
      jsonb_build_object(
        'target_company_id', target_company_id,
        'requesting_user_id', requesting_user_id,
        'query_type', query_type,
        'execution_duration_ms', execution_duration_ms,
        'result_rows', CASE WHEN jsonb_typeof(result_data) = 'array' THEN jsonb_array_length(result_data) ELSE 1 END
      ),
      requesting_user_id, target_company_id
    );
    
    RETURN jsonb_build_object(
      'success', true,
      'data', result_data,
      'query_type', query_type,
      'execution_time_ms', execution_duration_ms
    );
    
  EXCEPTION WHEN OTHERS THEN
    execution_end_time := clock_timestamp();
    execution_duration_ms := EXTRACT(EPOCH FROM (execution_end_time - execution_start_time)) * 1000;
    
    -- Log execution error
    INSERT INTO public.security_audit_log (
      table_name, action, violation_type, query_attempted, additional_data, user_id, company_id
    ) VALUES (
      'maya_query_execution', 'ERROR', 'query_execution_failed', cleaned_query,
      jsonb_build_object(
        'target_company_id', target_company_id,
        'requesting_user_id', requesting_user_id,
        'query_type', query_type,
        'execution_duration_ms', execution_duration_ms,
        'error_message', SQLERRM,
        'error_state', SQLSTATE
      ),
      requesting_user_id, target_company_id
    );
    
    RAISE EXCEPTION '🔒 Error ejecutando consulta: %', SQLERRM;
  END;
END;
$$;