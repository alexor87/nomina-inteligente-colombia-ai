-- Fix execute_safe_query to handle trailing semicolons
DROP FUNCTION IF EXISTS public.execute_safe_query(text, uuid);

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
  sanitized_sql TEXT;
BEGIN
  -- Get user's company for security validation
  SELECT company_id INTO current_user_company 
  FROM public.profiles 
  WHERE user_id = auth.uid();
  
  -- Validate user has access to the requested company
  IF current_user_company IS NULL OR current_user_company != company_id_param THEN
    RAISE EXCEPTION 'Acceso no autorizado a datos de empresa';
  END IF;
  
  -- Sanitize the SQL query
  sanitized_sql := TRIM(query_sql);
  
  -- Remove trailing semicolons
  sanitized_sql := regexp_replace(sanitized_sql, ';+\s*$', '', 'g');
  
  -- Basic security validation of the query
  IF sanitized_sql IS NULL OR LENGTH(sanitized_sql) = 0 THEN
    RAISE EXCEPTION 'Query no puede estar vacía';
  END IF;
  
  -- Validate query starts with SELECT (case insensitive)
  IF NOT sanitized_sql ~* '^\s*SELECT\b' THEN
    RAISE EXCEPTION 'Query execution failed: Solo se permiten consultas SELECT';
  END IF;
  
  -- Check for forbidden operations (basic security)
  IF sanitized_sql ~* '\b(INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|TRUNCATE|GRANT|REVOKE)\b' THEN
    RAISE EXCEPTION 'Query execution failed: Operación no permitida';
  END IF;
  
  -- Set timeout for safety
  SET LOCAL statement_timeout = '5s';
  
  -- Log the query execution for audit
  INSERT INTO public.security_audit_log (
    table_name, action, violation_type, query_attempted, 
    additional_data, user_id, company_id
  ) VALUES (
    'maya_queries', 'QUERY_EXECUTED', 'safe_query_execution',
    LEFT(sanitized_sql, 500), -- Store first 500 chars for audit
    jsonb_build_object(
      'query_length', LENGTH(sanitized_sql), 
      'timestamp', now(),
      'sql_sanitized_preview', LEFT(sanitized_sql, 200)
    ),
    auth.uid(), company_id_param
  );
  
  -- Execute the sanitized query and return results as jsonb
  EXECUTE 'SELECT jsonb_agg(row_to_json(t)) FROM (' || sanitized_sql || ') t' INTO result_data;
  
  -- Return empty array if no results
  RETURN COALESCE(result_data, '[]'::jsonb);
  
EXCEPTION WHEN OTHERS THEN
  -- Log the error for debugging
  INSERT INTO public.security_audit_log (
    table_name, action, violation_type, query_attempted, 
    additional_data, user_id, company_id
  ) VALUES (
    'maya_queries', 'QUERY_ERROR', 'execution_failed',
    LEFT(COALESCE(sanitized_sql, query_sql), 500),
    jsonb_build_object(
      'error_message', SQLERRM, 
      'error_state', SQLSTATE,
      'original_sql_preview', LEFT(query_sql, 200)
    ),
    auth.uid(), company_id_param
  );
  
  -- Return the original error message for debugging
  RAISE EXCEPTION 'Query execution failed: %', SQLERRM;
END;
$$;