-- Drop and recreate execute_safe_query function to handle WITH queries and sanitize input
DROP FUNCTION IF EXISTS public.execute_safe_query(text, uuid);

CREATE OR REPLACE FUNCTION public.execute_safe_query(
  sql_query text,
  target_company_id uuid
) 
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result jsonb;
  sanitized_sql text;
  first_token text;
  head_hex text;
  v_user_id uuid;
  user_company_id uuid;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;
  
  -- Get user's company
  SELECT company_id INTO user_company_id
  FROM public.profiles 
  WHERE user_id = v_user_id;
  
  -- Validate company access
  IF user_company_id IS NULL OR user_company_id != target_company_id THEN
    RAISE EXCEPTION 'Acceso no autorizado a la empresa';
  END IF;
  
  -- Sanitize control characters and normalize whitespace
  sanitized_sql := regexp_replace(sql_query, E'[\\x00-\\x1F\\x7F]+', ' ', 'g');
  sanitized_sql := regexp_replace(sanitized_sql, E'\\s+', ' ', 'g');
  sanitized_sql := trim(sanitized_sql);
  
  -- Extract diagnostic info
  first_token := split_part(sanitized_sql, ' ', 1);
  head_hex := encode(convert_to(left(sql_query, 32), 'UTF8'), 'hex');
  
  -- Enhanced validation: Allow SELECT and WITH (CTEs)
  IF NOT (sanitized_sql ~* '^\s*(SELECT|WITH)\b') THEN
    -- Log security violation with diagnostic info
    INSERT INTO public.security_audit_log (
      table_name, action, violation_type, query_attempted, additional_data, user_id, company_id
    ) VALUES (
      'execute_safe_query', 'QUERY_BLOCKED', 'non_select_query',
      left(sanitized_sql, 200),
      jsonb_build_object(
        'first_token', first_token,
        'head_hex', head_hex,
        'query_length', length(sql_query),
        'sanitized_length', length(sanitized_sql)
      ),
      v_user_id, target_company_id
    );
    
    RAISE EXCEPTION 'Solo se permiten consultas SELECT - operación no permitida';
  END IF;
  
  -- Additional security: Block dangerous keywords even in SELECT/WITH
  IF sanitized_sql ~* '\b(DROP|DELETE|UPDATE|INSERT|ALTER|CREATE|TRUNCATE|GRANT|REVOKE)\b' THEN
    INSERT INTO public.security_audit_log (
      table_name, action, violation_type, query_attempted, additional_data, user_id, company_id
    ) VALUES (
      'execute_safe_query', 'QUERY_BLOCKED', 'dangerous_keywords',
      left(sanitized_sql, 200),
      jsonb_build_object('first_token', first_token, 'head_hex', head_hex),
      v_user_id, target_company_id
    );
    
    RAISE EXCEPTION 'Consulta contiene operaciones no permitidas';
  END IF;
  
  -- Execute the query
  BEGIN
    EXECUTE format('SELECT jsonb_agg(row_to_json(t)) FROM (%s) t', sanitized_sql) INTO result;
    
    -- Log successful execution
    INSERT INTO public.security_audit_log (
      table_name, action, violation_type, query_attempted, additional_data, user_id, company_id
    ) VALUES (
      'execute_safe_query', 'QUERY_EXECUTED', 'select_success',
      left(sanitized_sql, 200),
      jsonb_build_object(
        'first_token', first_token,
        'result_count', CASE WHEN result IS NULL THEN 0 ELSE jsonb_array_length(result) END
      ),
      v_user_id, target_company_id
    );
    
    RETURN COALESCE(result, '[]'::jsonb);
    
  EXCEPTION WHEN OTHERS THEN
    -- Log execution error
    INSERT INTO public.security_audit_log (
      table_name, action, violation_type, query_attempted, additional_data, user_id, company_id
    ) VALUES (
      'execute_safe_query', 'QUERY_ERROR', 'execution_failed',
      left(sanitized_sql, 200),
      jsonb_build_object(
        'first_token', first_token,
        'error_code', SQLSTATE,
        'error_message', SQLERRM
      ),
      v_user_id, target_company_id
    );
    
    RAISE;
  END;
END;
$$;