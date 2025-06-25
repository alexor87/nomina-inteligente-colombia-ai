
-- Eliminar todas las políticas problemáticas existentes
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.usuarios_empresa;
DROP POLICY IF EXISTS "Users can view employees" ON public.employees;
DROP POLICY IF EXISTS "Users can manage employees" ON public.employees;
DROP POLICY IF EXISTS "Users can view user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can manage user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Allow all operations for authenticated users on employees" ON public.employees;
DROP POLICY IF EXISTS "Allow select on user_roles for authenticated users" ON public.user_roles;
DROP POLICY IF EXISTS "Allow insert/update/delete on user_roles for authenticated users" ON public.user_roles;
DROP POLICY IF EXISTS "Allow all operations for authenticated users on usuarios_empresa" ON public.usuarios_empresa;

-- Crear políticas multi-tenant seguras para employees basadas SOLO en profiles.company_id
CREATE POLICY "Users can view employees from their company" 
  ON public.employees 
  FOR SELECT 
  TO authenticated 
  USING (
    -- Solo ver empleados de su propia empresa
    company_id = (
      SELECT company_id 
      FROM public.profiles 
      WHERE user_id = auth.uid()
      LIMIT 1
    )
  );

CREATE POLICY "Users can create employees for their company" 
  ON public.employees 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (
    -- Solo crear empleados para su propia empresa
    company_id = (
      SELECT company_id 
      FROM public.profiles 
      WHERE user_id = auth.uid()
      LIMIT 1
    )
  );

CREATE POLICY "Users can update employees from their company" 
  ON public.employees 
  FOR UPDATE 
  TO authenticated 
  USING (
    company_id = (
      SELECT company_id 
      FROM public.profiles 
      WHERE user_id = auth.uid()
      LIMIT 1
    )
  )
  WITH CHECK (
    company_id = (
      SELECT company_id 
      FROM public.profiles 
      WHERE user_id = auth.uid()
      LIMIT 1
    )
  );

CREATE POLICY "Users can delete employees from their company" 
  ON public.employees 
  FOR DELETE 
  TO authenticated 
  USING (
    company_id = (
      SELECT company_id 
      FROM public.profiles 
      WHERE user_id = auth.uid()
      LIMIT 1
    )
  );

-- Políticas simples para user_roles que eviten recursión
CREATE POLICY "Users can view their own roles" 
  ON public.user_roles 
  FOR SELECT 
  TO authenticated 
  USING (
    user_id = auth.uid() OR 
    company_id = (
      SELECT company_id 
      FROM public.profiles 
      WHERE user_id = auth.uid()
      LIMIT 1
    )
  );

CREATE POLICY "Users can manage roles in their company" 
  ON public.user_roles 
  FOR ALL 
  TO authenticated 
  USING (
    company_id = (
      SELECT company_id 
      FROM public.profiles 
      WHERE user_id = auth.uid()
      LIMIT 1
    )
  )
  WITH CHECK (
    company_id = (
      SELECT company_id 
      FROM public.profiles 
      WHERE user_id = auth.uid()
      LIMIT 1
    )
  );

-- Política simple para usuarios_empresa que evite recursión
CREATE POLICY "Users can manage users in their company" 
  ON public.usuarios_empresa 
  FOR ALL 
  TO authenticated 
  USING (
    empresa_id = (
      SELECT company_id 
      FROM public.profiles 
      WHERE user_id = auth.uid()
      LIMIT 1
    )
  )
  WITH CHECK (
    empresa_id = (
      SELECT company_id 
      FROM public.profiles 
      WHERE user_id = auth.uid()
      LIMIT 1
    )
  );
