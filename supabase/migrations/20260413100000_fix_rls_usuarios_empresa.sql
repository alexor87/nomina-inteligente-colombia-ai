-- =============================================================================
-- FIX CRÍTICO DE SEGURIDAD: Reemplazar RLS USING(true) en usuarios_empresa
--
-- La política anterior permitía a CUALQUIER usuario autenticado leer/modificar
-- TODAS las filas de usuarios_empresa, incluyendo las de OTRAS empresas.
-- Un atacante podía asignarse rol 'administrador' en cualquier empresa.
-- =============================================================================

-- Eliminar la política insegura
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.usuarios_empresa;

-- Política de lectura: solo puedes ver usuarios de TU empresa
CREATE POLICY "Users can view own company users"
  ON public.usuarios_empresa
  FOR SELECT
  TO authenticated
  USING (
    public.is_superadmin(auth.uid())
    OR company_id IN (
      SELECT p.company_id
      FROM public.profiles p
      WHERE p.user_id = auth.uid()
    )
  );

-- Política de inserción: solo admins pueden agregar usuarios a su empresa
CREATE POLICY "Admins can insert company users"
  ON public.usuarios_empresa
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_superadmin(auth.uid())
    OR (
      company_id IN (
        SELECT p.company_id
        FROM public.profiles p
        WHERE p.user_id = auth.uid()
      )
      AND public.has_role(auth.uid(), 'administrador', company_id)
    )
  );

-- Política de actualización: solo admins pueden modificar usuarios de su empresa
CREATE POLICY "Admins can update company users"
  ON public.usuarios_empresa
  FOR UPDATE
  TO authenticated
  USING (
    public.is_superadmin(auth.uid())
    OR (
      company_id IN (
        SELECT p.company_id
        FROM public.profiles p
        WHERE p.user_id = auth.uid()
      )
      AND public.has_role(auth.uid(), 'administrador', company_id)
    )
  )
  WITH CHECK (
    public.is_superadmin(auth.uid())
    OR (
      company_id IN (
        SELECT p.company_id
        FROM public.profiles p
        WHERE p.user_id = auth.uid()
      )
      AND public.has_role(auth.uid(), 'administrador', company_id)
    )
  );

-- Política de eliminación: solo admins pueden eliminar usuarios de su empresa
CREATE POLICY "Admins can delete company users"
  ON public.usuarios_empresa
  FOR DELETE
  TO authenticated
  USING (
    public.is_superadmin(auth.uid())
    OR (
      company_id IN (
        SELECT p.company_id
        FROM public.profiles p
        WHERE p.user_id = auth.uid()
      )
      AND public.has_role(auth.uid(), 'administrador', company_id)
    )
  );
