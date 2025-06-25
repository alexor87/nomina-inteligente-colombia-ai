

-- Corregir la recursión infinita en usuarios_empresa
-- El problema está en que la función is_company_admin() hace referencia a user_roles
-- pero user_roles tiene políticas que pueden referenciar usuarios_empresa

-- PASO 1: Eliminar la política problemática de usuarios_empresa
DROP POLICY IF EXISTS "Simple: Company admin manages users" ON public.usuarios_empresa;

-- PASO 2: Crear una función super simple para usuarios_empresa que no cause recursión
CREATE OR REPLACE FUNCTION public.can_manage_company_users(_user_id UUID, _company_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  -- Solo verificar directamente en profiles sin usar otras tablas
  SELECT EXISTS (
    SELECT 1 
    FROM public.profiles p
    WHERE p.user_id = _user_id 
    AND p.company_id = _company_id
  ) OR public.is_superadmin(_user_id)
$$;

-- PASO 3: Crear política ultra-simple para usuarios_empresa
CREATE POLICY "Ultra simple: Users manage own company users" 
  ON public.usuarios_empresa 
  FOR ALL 
  TO authenticated 
  USING (public.can_manage_company_users(auth.uid(), empresa_id))
  WITH CHECK (public.can_manage_company_users(auth.uid(), empresa_id));

-- PASO 4: También simplificar la política de user_roles para evitar cualquier referencia cruzada
DROP POLICY IF EXISTS "Simple: Admins manage company roles" ON public.user_roles;

CREATE POLICY "Ultra simple: Users manage roles in their company" 
  ON public.user_roles 
  FOR ALL 
  TO authenticated 
  USING (
    user_id = auth.uid() OR 
    company_id = public.get_current_user_company_id()
  )
  WITH CHECK (
    user_id = auth.uid() OR 
    company_id = public.get_current_user_company_id()
  );

