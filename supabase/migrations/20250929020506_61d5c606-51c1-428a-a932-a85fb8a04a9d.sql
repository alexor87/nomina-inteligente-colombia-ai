-- Create safe query execution function for MAYA Database Query Handler
CREATE OR REPLACE FUNCTION public.execute_safe_query(query_sql text, company_id_param uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result json;
    current_user_company_id uuid;
BEGIN
    -- Verify user has access to the company
    SELECT company_id INTO current_user_company_id 
    FROM public.profiles 
    WHERE user_id = auth.uid();
    
    IF current_user_company_id IS NULL OR current_user_company_id != company_id_param THEN
        RAISE EXCEPTION 'Unauthorized access to company data';
    END IF;
    
    -- Security validation: only allow SELECT statements
    IF query_sql !~* '^[[:space:]]*SELECT' THEN
        RAISE EXCEPTION 'Only SELECT statements are allowed';
    END IF;
    
    -- Additional security checks
    IF query_sql ~* '\b(INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|TRUNCATE|GRANT|REVOKE)\b' THEN
        RAISE EXCEPTION 'Forbidden SQL operations detected';
    END IF;
    
    -- Execute the query and return as JSON
    EXECUTE 'SELECT array_to_json(array_agg(row_to_json(t))) FROM (' || query_sql || ') t' INTO result;
    
    -- Return empty array if no results
    RETURN COALESCE(result, '[]'::json);
    
EXCEPTION 
    WHEN OTHERS THEN
        -- Log the error and re-raise with a user-friendly message
        RAISE EXCEPTION 'Query execution failed: %', SQLERRM;
END;
$$;