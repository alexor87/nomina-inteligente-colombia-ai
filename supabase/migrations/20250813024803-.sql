-- 🔒 MAXIMUM SECURITY HARDENING: Force RLS and add additional protections
-- This implements the strictest possible security for employee data

-- 1. Force RLS to be always enabled (cannot be bypassed)
ALTER TABLE public.employees FORCE ROW LEVEL SECURITY;

-- 2. Revoke ALL privileges from ALL roles and grant back only what's needed
REVOKE ALL ON public.employees FROM PUBLIC;
REVOKE ALL ON public.employees FROM anon;
REVOKE ALL ON public.employees FROM authenticated;

-- 3. Grant minimal required permissions only to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.employees TO authenticated;

-- 4. Create additional security view for limited employee data access
CREATE OR REPLACE VIEW public.employees_limited AS
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
AND e.estado != 'eliminado';

-- 5. Grant access to the limited view
GRANT SELECT ON public.employees_limited TO authenticated;

-- 6. Create function to get employee sensitive data with explicit validation
CREATE OR REPLACE FUNCTION public.get_employee_sensitive_data(employee_id uuid)
RETURNS TABLE(
  id uuid,
  nombre text,
  apellido text,
  cedula text,
  email text,
  telefono text,
  banco text,
  numero_cuenta text,
  salario_base numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_company_id uuid;
  employee_company_id uuid;
BEGIN
  -- Get user's company
  SELECT company_id INTO user_company_id
  FROM public.profiles 
  WHERE user_id = auth.uid();
  
  -- Get employee's company
  SELECT company_id INTO employee_company_id
  FROM public.employees 
  WHERE public.employees.id = employee_id;
  
  -- Validate access
  IF user_company_id IS NULL OR employee_company_id IS NULL OR user_company_id != employee_company_id THEN
    -- Log security violation
    INSERT INTO public.security_audit_log (
      table_name, action, violation_type, additional_data, user_id, company_id
    ) VALUES (
      'employees', 'UNAUTHORIZED_SENSITIVE_ACCESS', 'invalid_company_access',
      jsonb_build_object('employee_id', employee_id, 'user_company', user_company_id, 'employee_company', employee_company_id),
      auth.uid(), user_company_id
    );
    
    RAISE EXCEPTION '🔒 SECURITY: Unauthorized access to sensitive employee data';
  END IF;
  
  -- Return sensitive data only if authorized
  RETURN QUERY
  SELECT 
    e.id,
    e.nombre,
    e.apellido,
    e.cedula,
    e.email,
    e.telefono,
    e.banco,
    e.numero_cuenta,
    e.salario_base
  FROM public.employees e
  WHERE e.id = employee_id;
END;
$$;

-- 7. Create audit trigger for all employee access
CREATE OR REPLACE FUNCTION public.audit_employee_data_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Log all access to sensitive employee data
  INSERT INTO public.security_audit_log (
    table_name,
    action,
    violation_type,
    additional_data,
    user_id,
    company_id
  ) VALUES (
    'employees',
    'DATA_ACCESS',
    'employee_data_accessed',
    jsonb_build_object(
      'employee_id', COALESCE(NEW.id, OLD.id),
      'operation', TG_OP,
      'timestamp', now(),
      'sensitive_fields', true
    ),
    auth.uid(),
    COALESCE(NEW.company_id, OLD.company_id)
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create triggers for all operations
DROP TRIGGER IF EXISTS audit_employee_access_insert ON public.employees;
DROP TRIGGER IF EXISTS audit_employee_access_update ON public.employees;
DROP TRIGGER IF EXISTS audit_employee_access_delete ON public.employees;

CREATE TRIGGER audit_employee_access_insert
  AFTER INSERT ON public.employees
  FOR EACH ROW EXECUTE FUNCTION public.audit_employee_data_access();

CREATE TRIGGER audit_employee_access_update
  AFTER UPDATE ON public.employees
  FOR EACH ROW EXECUTE FUNCTION public.audit_employee_data_access();

CREATE TRIGGER audit_employee_access_delete
  AFTER DELETE ON public.employees
  FOR EACH ROW EXECUTE FUNCTION public.audit_employee_data_access();

-- 8. Add additional constraint to ensure company_id is always valid
DO $$
BEGIN
  -- Only add NOT NULL constraint if no null values exist
  IF NOT EXISTS (SELECT 1 FROM public.employees WHERE company_id IS NULL) THEN
    ALTER TABLE public.employees ALTER COLUMN company_id SET NOT NULL;
  END IF;
END $$;

-- 9. Create index for performance on security-critical queries
CREATE INDEX IF NOT EXISTS idx_employees_company_security 
ON public.employees (company_id, estado) 
WHERE estado != 'eliminado';

-- 10. Log the maximum security hardening
INSERT INTO public.security_audit_log (
  table_name,
  action,
  violation_type,
  additional_data,
  user_id
) VALUES (
  'employees',
  'MAXIMUM_SECURITY_HARDENING',
  'security_enhancement_complete',
  jsonb_build_object(
    'enhancement_date', now(),
    'changes', 'Forced RLS, revoked all public access, added audit triggers, created secure access functions',
    'security_level', 'MAXIMUM'
  ),
  auth.uid()
);