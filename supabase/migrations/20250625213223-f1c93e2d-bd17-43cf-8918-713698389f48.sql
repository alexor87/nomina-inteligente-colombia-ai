
-- Eliminar todas las políticas problemáticas que causan recursión infinita
DROP POLICY IF EXISTS "Users can view their own company users" ON public.usuarios_empresa;
DROP POLICY IF EXISTS "Users can manage company users" ON public.usuarios_empresa;
DROP POLICY IF EXISTS "Admins can manage company users" ON public.usuarios_empresa;
DROP POLICY IF EXISTS "Users can view company users" ON public.usuarios_empresa;

-- Crear políticas más simples para usuarios_empresa que no causen recursión
CREATE POLICY "Users can view usuarios_empresa" 
  ON public.usuarios_empresa 
  FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Users can manage usuarios_empresa" 
  ON public.usuarios_empresa 
  FOR ALL 
  TO authenticated 
  USING (true) 
  WITH CHECK (true);

-- Limpiar y simplificar políticas de employees para evitar conflictos
DROP POLICY IF EXISTS "Users can view employees" ON public.employees;
DROP POLICY IF EXISTS "Users can manage employees" ON public.employees;

-- Crear políticas simples para employees basadas en company_id del perfil
CREATE POLICY "Users can view company employees" 
  ON public.employees 
  FOR SELECT 
  TO authenticated 
  USING (
    company_id IN (
      SELECT company_id 
      FROM public.profiles 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage company employees" 
  ON public.employees 
  FOR ALL 
  TO authenticated 
  USING (
    company_id IN (
      SELECT company_id 
      FROM public.profiles 
      WHERE user_id = auth.uid()
    )
  ) 
  WITH CHECK (
    company_id IN (
      SELECT company_id 
      FROM public.profiles 
      WHERE user_id = auth.uid()
    )
  );

-- Asegurar que las políticas de user_roles también sean simples
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;

CREATE POLICY "Users can view user roles" 
  ON public.user_roles 
  FOR SELECT 
  TO authenticated 
  USING (
    user_id = auth.uid() OR 
    public.is_superadmin(auth.uid())
  );

CREATE POLICY "Users can manage user roles" 
  ON public.user_roles 
  FOR ALL 
  TO authenticated 
  USING (
    public.is_superadmin(auth.uid()) OR 
    (company_id IN (
      SELECT company_id 
      FROM public.profiles 
      WHERE user_id = auth.uid()
    ) AND public.has_role(auth.uid(), 'administrador', company_id))
  ) 
  WITH CHECK (
    public.is_superadmin(auth.uid()) OR 
    (company_id IN (
      SELECT company_id 
      FROM public.profiles 
      WHERE user_id = auth.uid()
    ))
  );
