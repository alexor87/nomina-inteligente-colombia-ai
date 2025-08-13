-- 🔒 SECURITY ENHANCEMENT: Strengthen employees table protection
-- This addresses potential vulnerabilities and improves security

-- 1. Drop existing broad policy and replace with specific ones
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

-- 5. Fix search path issues in existing functions
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

-- 6. Add additional security function with proper search path
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

-- 7. Ensure company_id is never null for employees (data integrity)
-- First check if there are any NULL values
DO $$
DECLARE
  null_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO null_count FROM public.employees WHERE company_id IS NULL;
  
  IF null_count > 0 THEN
    RAISE NOTICE 'Found % employees with NULL company_id. These need to be fixed manually.', null_count;
    -- Don't add NOT NULL constraint yet if there are NULL values
  ELSE
    -- Safe to add NOT NULL constraint
    ALTER TABLE public.employees ALTER COLUMN company_id SET NOT NULL;
  END IF;
END
$$;

-- 8. Create constraint to ensure valid company relationship
ALTER TABLE public.employees 
  DROP CONSTRAINT IF EXISTS fk_employees_company;
  
ALTER TABLE public.employees 
  ADD CONSTRAINT fk_employees_company 
  FOREIGN KEY (company_id) REFERENCES public.companies(id) 
  ON DELETE CASCADE;

-- 9. Log the security enhancement
INSERT INTO public.security_audit_log (
  table_name,
  action,
  violation_type,
  additional_data,
  user_id
) VALUES (
  'employees',
  'SECURITY_ENHANCEMENT',
  'rls_policies_strengthened',
  jsonb_build_object(
    'enhancement_date', now(),
    'changes', 'Replaced single broad policy with specific CRUD policies, revoked public access, fixed function search paths'
  ),
  auth.uid()
);