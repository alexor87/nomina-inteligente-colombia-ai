

-- Investigar y resolver la recursión infinita en las políticas RLS

-- PASO 1: Eliminar TODAS las políticas problemáticas para empezar limpio
DROP POLICY IF EXISTS "Users can view employees from their company" ON public.employees;
DROP POLICY IF EXISTS "Users can create employees for their company" ON public.employees;
DROP POLICY IF EXISTS "Users can update employees from their company" ON public.employees;
DROP POLICY IF EXISTS "Users can delete employees from their company" ON public.employees;
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can manage roles in their company" ON public.user_roles;
DROP POLICY IF EXISTS "Users can manage users in their company" ON public.usuarios_empresa;

-- PASO 2: Crear funciones SECURITY DEFINER limpias que no dependan de RLS
CREATE OR REPLACE FUNCTION public.get_current_user_company_id()
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT company_id 
  FROM public.profiles 
  WHERE user_id = auth.uid()
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.is_company_admin(_user_id UUID, _company_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.user_roles ur
    WHERE ur.user_id = _user_id 
    AND ur.company_id = _company_id 
    AND ur.role = 'administrador'::app_role
  ) OR public.is_superadmin(_user_id)
$$;

-- PASO 3: Crear políticas ultra-simples usando las nuevas funciones
CREATE POLICY "Simple: Users view company employees" 
  ON public.employees 
  FOR SELECT 
  TO authenticated 
  USING (company_id = public.get_current_user_company_id());

CREATE POLICY "Simple: Users create company employees" 
  ON public.employees 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (company_id = public.get_current_user_company_id());

CREATE POLICY "Simple: Users update company employees" 
  ON public.employees 
  FOR UPDATE 
  TO authenticated 
  USING (company_id = public.get_current_user_company_id())
  WITH CHECK (company_id = public.get_current_user_company_id());

CREATE POLICY "Simple: Users delete company employees" 
  ON public.employees 
  FOR DELETE 
  TO authenticated 
  USING (company_id = public.get_current_user_company_id());

-- PASO 4: Políticas simples para user_roles sin recursión
CREATE POLICY "Simple: Users view own roles" 
  ON public.user_roles 
  FOR SELECT 
  TO authenticated 
  USING (
    user_id = auth.uid() OR 
    (company_id = public.get_current_user_company_id() AND public.is_company_admin(auth.uid(), company_id))
  );

CREATE POLICY "Simple: Admins manage company roles" 
  ON public.user_roles 
  FOR ALL 
  TO authenticated 
  USING (public.is_company_admin(auth.uid(), company_id))
  WITH CHECK (public.is_company_admin(auth.uid(), company_id));

-- PASO 5: Política ultra-simple para usuarios_empresa sin recursión
CREATE POLICY "Simple: Company admin manages users" 
  ON public.usuarios_empresa 
  FOR ALL 
  TO authenticated 
  USING (public.is_company_admin(auth.uid(), empresa_id))
  WITH CHECK (public.is_company_admin(auth.uid(), empresa_id));

