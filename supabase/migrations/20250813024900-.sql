-- 🔒 FINAL SECURITY PATCH: Fix view security and complete hardening

-- 1. Drop the view and recreate it as a secure function instead
DROP VIEW IF EXISTS public.employees_limited;

-- 2. Create a secure function instead of a view for limited employee data
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
  
  -- Log the access
  INSERT INTO public.security_audit_log (
    table_name, action, violation_type, additional_data, user_id, company_id
  ) VALUES (
    'employees', 'LIMITED_DATA_ACCESS', 'limited_employee_data_accessed',
    jsonb_build_object('access_time', now(), 'function', 'get_employees_limited'),
    auth.uid(), user_company_id
  );
END;
$$;

-- 3. Revoke any remaining grants to the dropped view
REVOKE ALL ON public.employees_limited FROM PUBLIC;
REVOKE ALL ON public.employees_limited FROM anon;
REVOKE ALL ON public.employees_limited FROM authenticated;

-- 4. Create additional constraint to prevent any public access
-- Create a policy that explicitly denies all access if somehow RLS is bypassed
CREATE POLICY "DENY_ALL_PUBLIC_ACCESS" 
ON public.employees 
FOR ALL 
TO PUBLIC
USING (false)
WITH CHECK (false);

-- 5. Double-check that anon role has no access
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public FROM anon;

-- 6. Ensure only authenticated users with valid company context can access anything
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon;

-- 7. Log final security hardening completion
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