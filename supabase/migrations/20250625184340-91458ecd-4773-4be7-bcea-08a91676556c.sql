
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
