
-- Eliminar funciones que acceden a auth.users
DROP FUNCTION IF EXISTS public.is_saas_admin(uuid);
DROP FUNCTION IF EXISTS public.get_user_companies(uuid);

-- Recrear get_user_companies sin acceder a auth.users
CREATE OR REPLACE FUNCTION public.get_user_companies(_user_id uuid DEFAULT auth.uid())
RETURNS TABLE(company_id uuid, rol text)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  -- Si es superadmin, devolver todas las empresas
  SELECT c.id as company_id, 'superadmin'::text as rol
  FROM public.companies c
  WHERE public.is_superadmin(_user_id)
  
  UNION ALL
  
  -- Si no es superadmin, devolver solo las empresas donde tiene rol
  SELECT ur.company_id, ur.role::text as rol
  FROM public.user_roles ur
  WHERE ur.user_id = _user_id 
  AND NOT public.is_superadmin(_user_id)
$$;

-- Limpiar todas las políticas RLS problemáticas y crear nuevas más simples
DROP POLICY IF EXISTS "Users can view their company employees" ON public.employees;
DROP POLICY IF EXISTS "Users create employees for their company" ON public.employees;
DROP POLICY IF EXISTS "Users update their company employees" ON public.employees;
DROP POLICY IF EXISTS "Users delete their company employees" ON public.employees;

-- Crear políticas RLS más simples que no usen funciones problemáticas
CREATE POLICY "Company employees access" 
  ON public.employees 
  FOR ALL 
  TO authenticated 
  USING (
    company_id IN (
      SELECT company_id 
      FROM public.profiles 
      WHERE user_id = auth.uid()
    ) 
    OR 
    public.is_superadmin(auth.uid())
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id 
      FROM public.profiles 
      WHERE user_id = auth.uid()
    ) 
    OR 
    public.is_superadmin(auth.uid())
  );

-- Asegurar que las políticas de user_roles también sean simples
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;

CREATE POLICY "Users can view own roles or superadmin can view all"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id OR 
    public.is_superadmin(auth.uid())
  );

CREATE POLICY "Superadmins and admins can manage roles"
  ON public.user_roles
  FOR ALL
  TO authenticated
  USING (
    public.is_superadmin(auth.uid()) OR 
    public.has_role(auth.uid(), 'administrador'::app_role, company_id)
  )
  WITH CHECK (
    public.is_superadmin(auth.uid()) OR 
    public.has_role(auth.uid(), 'administrador'::app_role, company_id)
  );
