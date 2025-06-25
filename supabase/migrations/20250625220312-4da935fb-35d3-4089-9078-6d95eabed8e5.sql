
-- Primero, eliminar todas las políticas problemáticas que causan recursión infinita
DROP POLICY IF EXISTS "Users can view usuarios_empresa" ON public.usuarios_empresa;
DROP POLICY IF EXISTS "Users can manage usuarios_empresa" ON public.usuarios_empresa;
DROP POLICY IF EXISTS "Users can view their own company users" ON public.usuarios_empresa;
DROP POLICY IF EXISTS "Users can manage company users" ON public.usuarios_empresa;
DROP POLICY IF EXISTS "Admins can manage company users" ON public.usuarios_empresa;
DROP POLICY IF EXISTS "Users can view company users" ON public.usuarios_empresa;

-- Crear políticas más seguras y simples para usuarios_empresa
CREATE POLICY "Enable all for authenticated users" 
  ON public.usuarios_empresa 
  FOR ALL 
  TO authenticated 
  USING (true) 
  WITH CHECK (true);

-- Revisar y arreglar las políticas de employees también
DROP POLICY IF EXISTS "Users can view company employees" ON public.employees;
DROP POLICY IF EXISTS "Users can manage company employees" ON public.employees;

-- Crear políticas más simples para employees que no dependan de usuarios_empresa
CREATE POLICY "Users can view employees" 
  ON public.employees 
  FOR SELECT 
  TO authenticated 
  USING (
    -- Permitir si es superadmin o si el usuario pertenece a la empresa
    public.is_superadmin(auth.uid()) OR 
    company_id IN (
      SELECT company_id 
      FROM public.profiles 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage employees" 
  ON public.employees 
  FOR ALL 
  TO authenticated 
  USING (
    -- Permitir si es superadmin o si el usuario pertenece a la empresa
    public.is_superadmin(auth.uid()) OR 
    company_id IN (
      SELECT company_id 
      FROM public.profiles 
      WHERE user_id = auth.uid()
    )
  ) 
  WITH CHECK (
    -- Permitir si es superadmin o si el usuario pertenece a la empresa
    public.is_superadmin(auth.uid()) OR 
    company_id IN (
      SELECT company_id 
      FROM public.profiles 
      WHERE user_id = auth.uid()
    )
  );

-- Asegurar que las políticas de user_roles también sean correctas
DROP POLICY IF EXISTS "Users can view user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can manage user roles" ON public.user_roles;

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
    public.has_role(auth.uid(), 'administrador', company_id)
  ) 
  WITH CHECK (
    public.is_superadmin(auth.uid()) OR 
    public.has_role(auth.uid(), 'administrador', company_id)
  );
