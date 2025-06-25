
-- PASO 1: Eliminar TODAS las políticas RLS que dependen de las funciones problemáticas
DROP POLICY IF EXISTS "Users can view accessible employees" ON public.employees;
DROP POLICY IF EXISTS "Editors and admins can manage employees" ON public.employees;
DROP POLICY IF EXISTS "Users can view accessible companies" ON public.companies;
DROP POLICY IF EXISTS "Superadmin can manage all companies" ON public.companies;
DROP POLICY IF EXISTS "Company employees access" ON public.employees;
DROP POLICY IF EXISTS "Users can view own roles or superadmin can view all" ON public.user_roles;
DROP POLICY IF EXISTS "Superadmins and admins can manage roles" ON public.user_roles;

-- Eliminar cualquier otra política que pueda existir
DROP POLICY IF EXISTS "Users can view their company employees" ON public.employees;
DROP POLICY IF EXISTS "Users create employees for their company" ON public.employees;
DROP POLICY IF EXISTS "Users update their company employees" ON public.employees;
DROP POLICY IF EXISTS "Users delete their company employees" ON public.employees;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles in their company" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their company" ON public.companies;
DROP POLICY IF EXISTS "Users can update their company" ON public.companies;

-- PASO 2: Ahora eliminar todas las funciones problemáticas
DROP FUNCTION IF EXISTS public.is_superadmin(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.has_role(uuid, app_role, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.get_user_roles(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.get_user_highest_role(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.get_user_companies(uuid) CASCADE;

-- PASO 3: Eliminar tabla de superadmins
DROP TABLE IF EXISTS public.superadmins CASCADE;
DROP TABLE IF EXISTS public.usuarios_empresa CASCADE;

-- PASO 4: Crear funciones simples sin acceso a auth.users
CREATE OR REPLACE FUNCTION public.has_role_in_company(_user_id uuid, _role app_role, _company_id uuid)
RETURNS boolean
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = _user_id
      AND ur.role = _role
      AND ur.company_id = _company_id
  )
$$;

CREATE OR REPLACE FUNCTION public.get_user_companies_simple(_user_id uuid DEFAULT auth.uid())
RETURNS TABLE(company_id uuid, role_name text)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT ur.company_id, ur.role::text as role_name
  FROM public.user_roles ur
  WHERE ur.user_id = _user_id
$$;

-- PASO 5: Crear políticas RLS súper simples
-- Política para employees
CREATE POLICY "Simple company employees access" 
  ON public.employees 
  FOR ALL 
  TO authenticated 
  USING (
    company_id IN (
      SELECT company_id 
      FROM public.profiles 
      WHERE user_id = auth.uid()
    ) OR
    public.has_role_in_company(auth.uid(), 'soporte'::app_role, company_id)
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id 
      FROM public.profiles 
      WHERE user_id = auth.uid()
    ) OR
    public.has_role_in_company(auth.uid(), 'soporte'::app_role, company_id)
  );

-- Política para user_roles
CREATE POLICY "Simple user roles access"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Simple user roles management"
  ON public.user_roles
  FOR ALL
  TO authenticated
  USING (
    public.has_role_in_company(auth.uid(), 'administrador'::app_role, company_id) OR
    public.has_role_in_company(auth.uid(), 'soporte'::app_role, company_id)
  )
  WITH CHECK (
    public.has_role_in_company(auth.uid(), 'administrador'::app_role, company_id) OR
    public.has_role_in_company(auth.uid(), 'soporte'::app_role, company_id)
  );

-- Política para profiles
CREATE POLICY "Simple profiles access"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    company_id IN (
      SELECT company_id 
      FROM public.profiles 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Simple profiles update"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Política para companies
CREATE POLICY "Simple company access"
  ON public.companies
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT company_id 
      FROM public.profiles 
      WHERE user_id = auth.uid()
    ) OR
    public.has_role_in_company(auth.uid(), 'soporte'::app_role, id)
  );

CREATE POLICY "Simple company update"
  ON public.companies
  FOR UPDATE
  TO authenticated
  USING (
    id IN (
      SELECT company_id 
      FROM public.profiles 
      WHERE user_id = auth.uid()
    ) AND
    public.has_role_in_company(auth.uid(), 'administrador'::app_role, id)
  );

-- PASO 6: Asignar rol de soporte a tu usuario
INSERT INTO public.user_roles (user_id, role, company_id, assigned_by)
SELECT 
  '3716ea94-cab9-47a5-b83d-0ef05a817bf2'::uuid,
  'soporte'::app_role,
  c.id,
  '3716ea94-cab9-47a5-b83d-0ef05a817bf2'::uuid
FROM public.companies c
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles ur 
  WHERE ur.user_id = '3716ea94-cab9-47a5-b83d-0ef05a817bf2'::uuid
  AND ur.company_id = c.id
  AND ur.role = 'soporte'::app_role
);
