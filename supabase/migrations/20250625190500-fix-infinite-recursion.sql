
-- Eliminar las políticas problemáticas que causan recursión infinita
DROP POLICY IF EXISTS "Superadmin can view all user-company relationships" ON public.usuarios_empresa;
DROP POLICY IF EXISTS "Admins can view their company relationships" ON public.usuarios_empresa;
DROP POLICY IF EXISTS "Users can view their own relationships" ON public.usuarios_empresa;
DROP POLICY IF EXISTS "Superadmin can manage all relationships" ON public.usuarios_empresa;
DROP POLICY IF EXISTS "Admins can manage their company relationships" ON public.usuarios_empresa;

-- Crear políticas más simples que no causen recursión
CREATE POLICY "Allow superadmin full access to usuarios_empresa"
  ON public.usuarios_empresa
  FOR ALL
  TO authenticated
  USING (public.is_superadmin(auth.uid()))
  WITH CHECK (public.is_superadmin(auth.uid()));

CREATE POLICY "Users can view their own empresa relationships"
  ON public.usuarios_empresa
  FOR SELECT
  TO authenticated
  USING (usuario_id = auth.uid());

CREATE POLICY "Users can manage relationships where they are admin"
  ON public.usuarios_empresa
  FOR ALL
  TO authenticated
  USING (
    usuario_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.usuarios_empresa ue2 
      WHERE ue2.usuario_id = auth.uid() 
      AND ue2.empresa_id = usuarios_empresa.empresa_id 
      AND ue2.rol = 'admin'
      AND ue2.activo = true
    )
  )
  WITH CHECK (
    usuario_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.usuarios_empresa ue2 
      WHERE ue2.usuario_id = auth.uid() 
      AND ue2.empresa_id = usuarios_empresa.empresa_id 
      AND ue2.rol = 'admin'
      AND ue2.activo = true
    )
  );

-- Simplificar la función get_user_companies para evitar recursión
CREATE OR REPLACE FUNCTION public.get_user_companies(_user_id UUID DEFAULT auth.uid())
RETURNS TABLE(company_id UUID, rol TEXT)
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
  SELECT ue.empresa_id as company_id, ue.rol::text as rol
  FROM public.usuarios_empresa ue
  WHERE ue.usuario_id = _user_id 
  AND ue.activo = true
  AND NOT public.is_superadmin(_user_id)
$$;

-- Agregar políticas RLS para la tabla employees con verificación directa
DROP POLICY IF EXISTS "Users can view accessible employees" ON public.employees;
DROP POLICY IF EXISTS "Editors and admins can manage employees" ON public.employees;

CREATE POLICY "Users can view accessible employees"
  ON public.employees
  FOR SELECT
  TO authenticated
  USING (
    public.is_superadmin(auth.uid()) OR 
    public.user_has_access_to_company(auth.uid(), company_id)
  );

CREATE POLICY "Editors and admins can manage employees"
  ON public.employees
  FOR ALL
  TO authenticated
  USING (
    public.is_superadmin(auth.uid()) OR
    company_id IN (
      SELECT empresa_id 
      FROM public.usuarios_empresa 
      WHERE usuario_id = auth.uid() 
        AND rol IN ('admin', 'editor')
        AND activo = true
    )
  )
  WITH CHECK (
    public.is_superadmin(auth.uid()) OR
    company_id IN (
      SELECT empresa_id 
      FROM public.usuarios_empresa 
      WHERE usuario_id = auth.uid() 
        AND rol IN ('admin', 'editor')
        AND activo = true
    )
  );

-- Agregar políticas RLS para la tabla companies
DROP POLICY IF EXISTS "Users can view accessible companies" ON public.companies;
DROP POLICY IF EXISTS "Superadmin can manage all companies" ON public.companies;
DROP POLICY IF EXISTS "Admins can update their company" ON public.companies;

CREATE POLICY "Users can view accessible companies"
  ON public.companies
  FOR SELECT
  TO authenticated
  USING (
    public.is_superadmin(auth.uid()) OR 
    public.user_has_access_to_company(auth.uid(), id)
  );

CREATE POLICY "Superadmin can manage all companies"
  ON public.companies
  FOR ALL
  TO authenticated
  USING (public.is_superadmin(auth.uid()))
  WITH CHECK (public.is_superadmin(auth.uid()));

CREATE POLICY "Admins can update their company"
  ON public.companies
  FOR UPDATE
  TO authenticated
  USING (
    id IN (
      SELECT empresa_id 
      FROM public.usuarios_empresa 
      WHERE usuario_id = auth.uid() 
        AND rol = 'admin' 
        AND activo = true
    )
  )
  WITH CHECK (
    id IN (
      SELECT empresa_id 
      FROM public.usuarios_empresa 
      WHERE usuario_id = auth.uid() 
        AND rol = 'admin' 
        AND activo = true
    )
  );
