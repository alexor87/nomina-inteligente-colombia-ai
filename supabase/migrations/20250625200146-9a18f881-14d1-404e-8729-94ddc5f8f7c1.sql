
-- Actualizar el enum de roles para incluir todos los roles especificados
DROP TYPE IF EXISTS public.app_role CASCADE;
CREATE TYPE public.app_role AS ENUM ('administrador', 'rrhh', 'contador', 'visualizador', 'soporte');

-- Asegurar que la tabla user_roles existe con la estructura correcta
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, role, company_id)
);

-- Habilitar RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Crear/actualizar función para verificar si es superadmin
CREATE OR REPLACE FUNCTION public.is_superadmin(_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM auth.users 
    WHERE id = COALESCE(_user_id, auth.uid()) 
    AND email = 'alexor87@gmail.com'
  )
$$;

-- Crear/actualizar función para verificar roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role, _company_id UUID DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT CASE 
    WHEN public.is_superadmin(_user_id) THEN true
    ELSE EXISTS (
      SELECT 1
      FROM public.user_roles
      WHERE user_id = _user_id
        AND role = _role
        AND (company_id = _company_id OR _company_id IS NULL)
    )
  END
$$;

-- Crear/actualizar función para obtener todos los roles del usuario
CREATE OR REPLACE FUNCTION public.get_user_roles(_company_id UUID DEFAULT NULL)
RETURNS TABLE(role app_role, company_id UUID)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT ur.role, ur.company_id
  FROM public.user_roles ur
  WHERE ur.user_id = auth.uid()
    AND (ur.company_id = _company_id OR _company_id IS NULL)
$$;

-- Crear/actualizar función para obtener el rol más alto del usuario en una empresa
CREATE OR REPLACE FUNCTION public.get_user_highest_role(_company_id UUID)
RETURNS app_role
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT CASE 
    WHEN public.is_superadmin(auth.uid()) THEN 'administrador'::app_role
    ELSE (
      SELECT role 
      FROM public.user_roles 
      WHERE user_id = auth.uid() 
        AND company_id = _company_id 
      ORDER BY 
        CASE role
          WHEN 'administrador' THEN 1
          WHEN 'rrhh' THEN 2
          WHEN 'contador' THEN 3
          WHEN 'visualizador' THEN 4
          WHEN 'soporte' THEN 5
        END
      LIMIT 1
    )
  END
$$;

-- Políticas RLS básicas
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.is_superadmin());

DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
CREATE POLICY "Admins can manage roles"
  ON public.user_roles
  FOR ALL
  TO authenticated
  USING (
    public.is_superadmin() OR 
    public.has_role(auth.uid(), 'administrador', company_id)
  )
  WITH CHECK (
    public.is_superadmin() OR 
    public.has_role(auth.uid(), 'administrador', company_id)
  );
