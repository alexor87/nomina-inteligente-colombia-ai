
-- Crear tabla para la relación usuarios-empresa con roles específicos
CREATE TABLE public.usuarios_empresa (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  empresa_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  rol TEXT NOT NULL CHECK (rol IN ('admin', 'editor', 'lector')),
  asignado_por UUID REFERENCES auth.users(id),
  asignado_en TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  activo BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(usuario_id, empresa_id)
);

-- Habilitar RLS en la nueva tabla
ALTER TABLE public.usuarios_empresa ENABLE ROW LEVEL SECURITY;

-- Función para verificar si es superadmin (solo alexor87@gmail.com)
CREATE OR REPLACE FUNCTION public.is_superadmin(_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM auth.users 
    WHERE id = COALESCE(_user_id, auth.uid()) 
    AND email = 'alexor87@gmail.com'
  )
$$;

-- Función para obtener el rol del usuario en una empresa específica
CREATE OR REPLACE FUNCTION public.get_user_role_in_company(_user_id UUID, _company_id UUID)
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT rol
  FROM public.usuarios_empresa
  WHERE usuario_id = _user_id 
    AND empresa_id = _company_id 
    AND activo = true
$$;

-- Función para verificar si el usuario tiene acceso a una empresa
CREATE OR REPLACE FUNCTION public.user_has_access_to_company(_user_id UUID, _company_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT CASE 
    WHEN public.is_superadmin(_user_id) THEN true
    ELSE EXISTS (
      SELECT 1 
      FROM public.usuarios_empresa 
      WHERE usuario_id = _user_id 
        AND empresa_id = _company_id 
        AND activo = true
    )
  END
$$;

-- Función para obtener las empresas a las que tiene acceso un usuario
CREATE OR REPLACE FUNCTION public.get_user_companies(_user_id UUID DEFAULT auth.uid())
RETURNS TABLE(company_id UUID, rol TEXT)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT CASE 
    WHEN public.is_superadmin(_user_id) THEN c.id
    ELSE ue.empresa_id
  END as company_id,
  CASE 
    WHEN public.is_superadmin(_user_id) THEN 'superadmin'
    ELSE ue.rol
  END as rol
  FROM public.companies c
  LEFT JOIN public.usuarios_empresa ue ON c.id = ue.empresa_id AND ue.usuario_id = _user_id AND ue.activo = true
  WHERE public.is_superadmin(_user_id) OR ue.empresa_id IS NOT NULL
$$;

-- Políticas RLS para usuarios_empresa
CREATE POLICY "Superadmin can view all user-company relationships"
  ON public.usuarios_empresa
  FOR SELECT
  TO authenticated
  USING (public.is_superadmin(auth.uid()));

CREATE POLICY "Admins can view their company relationships"
  ON public.usuarios_empresa
  FOR SELECT
  TO authenticated
  USING (
    empresa_id IN (
      SELECT empresa_id 
      FROM public.usuarios_empresa 
      WHERE usuario_id = auth.uid() 
        AND rol = 'admin' 
        AND activo = true
    )
  );

CREATE POLICY "Users can view their own relationships"
  ON public.usuarios_empresa
  FOR SELECT
  TO authenticated
  USING (usuario_id = auth.uid());

CREATE POLICY "Superadmin can manage all relationships"
  ON public.usuarios_empresa
  FOR ALL
  TO authenticated
  USING (public.is_superadmin(auth.uid()))
  WITH CHECK (public.is_superadmin(auth.uid()));

CREATE POLICY "Admins can manage their company relationships"
  ON public.usuarios_empresa
  FOR ALL
  TO authenticated
  USING (
    empresa_id IN (
      SELECT empresa_id 
      FROM public.usuarios_empresa 
      WHERE usuario_id = auth.uid() 
        AND rol = 'admin' 
        AND activo = true
    )
  )
  WITH CHECK (
    empresa_id IN (
      SELECT empresa_id 
      FROM public.usuarios_empresa 
      WHERE usuario_id = auth.uid() 
        AND rol = 'admin' 
        AND activo = true
    )
  );

-- Actualizar políticas existentes para usar el nuevo sistema

-- Políticas para companies
DROP POLICY IF EXISTS "Users can view their company or super admins can view all" ON public.companies;
DROP POLICY IF EXISTS "Super admins can manage all companies" ON public.companies;
DROP POLICY IF EXISTS "Users can view companies" ON public.companies;

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

-- Políticas para employees
DROP POLICY IF EXISTS "Users can view company employees" ON public.employees;
DROP POLICY IF EXISTS "RRHH can manage company employees" ON public.employees;

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

-- Función para asignar automáticamente rol admin al crear empresa
CREATE OR REPLACE FUNCTION public.assign_admin_role_on_company_creation()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Solo asignar si no es superadmin (que ya tiene acceso a todo)
  IF NOT public.is_superadmin(auth.uid()) THEN
    INSERT INTO public.usuarios_empresa (
      usuario_id,
      empresa_id,
      rol,
      asignado_por
    ) VALUES (
      auth.uid(),
      NEW.id,
      'admin',
      auth.uid()
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger para asignar rol admin automáticamente
DROP TRIGGER IF EXISTS on_company_created_assign_admin ON public.companies;
CREATE TRIGGER on_company_created_assign_admin
  AFTER INSERT ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.assign_admin_role_on_company_creation();

-- Limpiar tablas obsoletas si existen
DROP TABLE IF EXISTS public.user_roles CASCADE;
DROP TABLE IF EXISTS public.saas_admins CASCADE;
