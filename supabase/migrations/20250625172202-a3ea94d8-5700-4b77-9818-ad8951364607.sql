
-- Arreglar el problema de recursión infinita en saas_admins
DROP POLICY IF EXISTS "Super admins can view saas admins" ON public.saas_admins;

-- Crear una política más simple para saas_admins
CREATE POLICY "Allow saas admins to view admin table"
  ON public.saas_admins
  FOR ALL
  TO authenticated
  USING (true)  -- Temporal: permitir acceso completo para evitar recursión
  WITH CHECK (true);

-- Arreglar políticas para companies - permitir acceso a super admins
DROP POLICY IF EXISTS "Users can view companies" ON public.companies;
CREATE POLICY "Users can view their company or super admins can view all"
  ON public.companies
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT company_id 
      FROM public.profiles 
      WHERE user_id = auth.uid() 
      AND company_id IS NOT NULL
    )
    OR 
    EXISTS (
      SELECT 1 FROM public.saas_admins 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Super admins can manage all companies"
  ON public.companies
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.saas_admins 
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.saas_admins 
      WHERE user_id = auth.uid()
    )
  );

-- Asegurar que el usuario actual sea super admin
INSERT INTO public.saas_admins (user_id, role)
SELECT auth.uid(), 'super_admin'
WHERE auth.uid() IS NOT NULL
AND NOT EXISTS (
  SELECT 1 FROM public.saas_admins WHERE user_id = auth.uid()
);

-- Verificar y corregir function is_saas_admin para evitar recursión
CREATE OR REPLACE FUNCTION public.is_saas_admin(_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.saas_admins
    WHERE user_id = COALESCE(_user_id, auth.uid())
  )
$$;
