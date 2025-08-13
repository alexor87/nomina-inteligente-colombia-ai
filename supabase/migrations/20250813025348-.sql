-- 🔒 CRITICAL SECURITY FIX: Remove vulnerable employees_limited view and replace with secure access

-- 1. First, check if the employees_limited view still exists and drop it
DROP VIEW IF EXISTS public.employees_limited CASCADE;

-- 2. Ensure the secure function we created is the only way to access limited employee data
-- (The get_employees_limited() function is already created and secure)

-- 3. Create a secure view that enforces company-based access control
CREATE OR REPLACE VIEW public.employees_limited
WITH (security_invoker=true) AS
SELECT 
  e.id,
  e.nombre,
  e.apellido, 
  e.cargo,
  e.estado,
  e.fecha_ingreso,
  e.company_id
FROM public.employees e
WHERE e.company_id = get_current_user_company_id()
AND e.estado != 'eliminado'
AND auth.uid() IS NOT NULL;

-- 4. Enable RLS on the view (if possible) and add restrictive policies
ALTER VIEW public.employees_limited SET (security_invoker=true);

-- 5. Create explicit access control for the view
GRANT SELECT ON public.employees_limited TO authenticated;
REVOKE ALL ON public.employees_limited FROM PUBLIC;
REVOKE ALL ON public.employees_limited FROM anon;

-- 6. Log the security fix
INSERT INTO public.security_audit_log (
  table_name,
  action,
  violation_type, 
  additional_data,
  user_id
) VALUES (
  'employees_limited',
  'SECURITY_VULNERABILITY_FIXED',
  'removed_public_access_to_employee_data',
  jsonb_build_object(
    'fix_date', now(),
    'vulnerability', 'employees_limited view was publicly readable',
    'fix_applied', 'Replaced with secure view using security_invoker and company filtering',
    'security_level', 'MAXIMUM'
  ),
  auth.uid()
);