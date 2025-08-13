-- 🔒 SECURITY ENHANCEMENT: Strengthen employees table protection
-- This addresses potential vulnerabilities and improves security

-- 1. First, ensure RLS is properly enforced by checking current policies
DROP POLICY IF EXISTS "Secure company employees access" ON public.employees;

-- 2. Create more restrictive and explicit RLS policies
-- Policy for authenticated users to view employees from their company only
CREATE POLICY "Users can view company employees" 
ON public.employees 
FOR SELECT 
TO authenticated
USING (
  -- Must be authenticated
  auth.uid() IS NOT NULL 
  AND 
  -- Must have access to the company through profile or role
  (
    company_id = get_current_user_company_id()
    OR 
    has_role_in_company(auth.uid(), 'soporte'::app_role, company_id)
  )
);

-- Policy for inserting employees (only company members)
CREATE POLICY "Users can create company employees" 
ON public.employees 
FOR INSERT 
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND company_id = get_current_user_company_id()
);

-- Policy for updating employees (only company members)
CREATE POLICY "Users can update company employees" 
ON public.employees 
FOR UPDATE 
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND company_id = get_current_user_company_id()
)
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND company_id = get_current_user_company_id()
);

-- Policy for deleting employees (only company members)
CREATE POLICY "Users can delete company employees" 
ON public.employees 
FOR DELETE 
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND company_id = get_current_user_company_id()
);

-- 3. Revoke all public access to ensure no bypass
REVOKE ALL ON public.employees FROM PUBLIC;
REVOKE ALL ON public.employees FROM anon;

-- 4. Grant specific permissions only to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.employees TO authenticated;

-- 5. Add additional security function with proper search path
CREATE OR REPLACE FUNCTION public.validate_employee_company_access(p_employee_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  employee_company_id uuid;
  user_company_id uuid;
BEGIN
  -- Get the employee's company
  SELECT company_id INTO employee_company_id
  FROM public.employees 
  WHERE id = p_employee_id;
  
  -- Get the user's company
  SELECT company_id INTO user_company_id
  FROM public.profiles 
  WHERE user_id = auth.uid();
  
  -- Return true only if they match
  RETURN employee_company_id = user_company_id;
END;
$$;

-- 6. Fix search path issues in existing functions
CREATE OR REPLACE FUNCTION public.get_current_user_company_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT company_id 
  FROM public.profiles 
  WHERE user_id = auth.uid()
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.has_role_in_company(_user_id uuid, _role app_role, _company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = _user_id
      AND ur.role = _role
      AND ur.company_id = _company_id
  )
$$;

-- 7. Add audit logging for sensitive data access
CREATE OR REPLACE FUNCTION public.log_employee_data_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Log access to sensitive employee data
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
    'employee_data_viewed',
    jsonb_build_object(
      'employee_id', NEW.id,
      'sensitive_fields_accessed', true,
      'timestamp', now()
    ),
    auth.uid(),
    NEW.company_id
  );
  
  RETURN NEW;
END;
$$;

-- Create trigger for audit logging
DROP TRIGGER IF EXISTS audit_employee_access ON public.employees;
CREATE TRIGGER audit_employee_access
  AFTER SELECT ON public.employees
  FOR EACH ROW EXECUTE FUNCTION public.log_employee_data_access();

-- 8. Ensure company_id is never null for employees (data integrity)
ALTER TABLE public.employees 
  ALTER COLUMN company_id SET NOT NULL;

-- 9. Create constraint to ensure valid company relationship
ALTER TABLE public.employees 
  DROP CONSTRAINT IF EXISTS fk_employees_company;
  
ALTER TABLE public.employees 
  ADD CONSTRAINT fk_employees_company 
  FOREIGN KEY (company_id) REFERENCES public.companies(id) 
  ON DELETE CASCADE;