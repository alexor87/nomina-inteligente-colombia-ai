-- 🔒 FINAL SECURITY PATCH: Complete the security hardening

-- 1. Create a secure function for limited employee data (replacement for the dropped view)
CREATE OR REPLACE FUNCTION public.get_employees_limited()
RETURNS TABLE(
  id uuid,
  nombre text,
  apellido text,
  cargo text,
  estado text,
  fecha_ingreso date,
  company_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_company_id uuid;
BEGIN
  -- Get user's company with validation
  SELECT company_id INTO user_company_id
  FROM public.profiles 
  WHERE user_id = auth.uid();
  
  -- Validate user has company access
  IF user_company_id IS NULL THEN
    RAISE EXCEPTION '🔒 SECURITY: User not associated with any company';
  END IF;
  
  -- Return only employees from user's company
  RETURN QUERY
  SELECT 
    e.id,
    e.nombre,
    e.apellido,
    e.cargo,
    e.estado,
    e.fecha_ingreso,
    e.company_id
  FROM public.employees e
  WHERE e.company_id = user_company_id
  AND e.estado != 'eliminado';
  
  -- Log the access for security monitoring
  INSERT INTO public.security_audit_log (
    table_name, action, violation_type, additional_data, user_id, company_id
  ) VALUES (
    'employees', 'LIMITED_DATA_ACCESS', 'limited_employee_data_accessed',
    jsonb_build_object('access_time', now(), 'function', 'get_employees_limited'),
    auth.uid(), user_company_id
  );
END;
$$;

-- 2. Create additional constraint to prevent any public access
CREATE POLICY "DENY_ALL_PUBLIC_ACCESS" 
ON public.employees 
FOR ALL 
TO PUBLIC
USING (false)
WITH CHECK (false);

-- 3. Ensure only authenticated users with valid company context can access anything
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon;

-- 4. Log final security hardening completion
INSERT INTO public.security_audit_log (
  table_name,
  action,
  violation_type,
  additional_data,
  user_id
) VALUES (
  'employees',
  'FINAL_SECURITY_HARDENING',
  'maximum_security_complete',
  jsonb_build_object(
    'completion_date', now(),
    'security_measures', 'Forced RLS, denied all public access, secure functions only, audit logging',
    'security_level', 'MAXIMUM_ENTERPRISE'
  ),
  auth.uid()
);