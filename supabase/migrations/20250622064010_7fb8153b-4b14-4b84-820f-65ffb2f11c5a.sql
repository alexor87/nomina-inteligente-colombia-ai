
-- Crear enum para roles de la aplicación
CREATE TYPE public.app_role AS ENUM ('administrador', 'rrhh', 'contador', 'visualizador', 'soporte');

-- Crear tabla de perfiles de usuario
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Crear tabla de roles de usuario
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, role, company_id)
);

-- Habilitar RLS en las nuevas tablas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Función para verificar roles (SECURITY DEFINER para evitar recursión RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role, _company_id UUID DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
      AND (company_id = _company_id OR _company_id IS NULL)
  )
$$;

-- Función para obtener roles del usuario actual
CREATE OR REPLACE FUNCTION public.get_user_roles(_company_id UUID DEFAULT NULL)
RETURNS TABLE(role app_role, company_id UUID)
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT ur.role, ur.company_id
  FROM public.user_roles ur
  WHERE ur.user_id = auth.uid()
    AND (ur.company_id = _company_id OR _company_id IS NULL)
$$;

-- Trigger para crear perfil automáticamente cuando se registra un usuario
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'last_name'
  );
  RETURN NEW;
END;
$$;

-- Crear trigger
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Políticas RLS para profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles in their company"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT ur.company_id 
      FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() 
        AND ur.role = 'administrador'
    )
  );

-- Políticas RLS para user_roles
CREATE POLICY "Users can view their own roles"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage roles in their company"
  ON public.user_roles
  FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT ur.company_id 
      FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() 
        AND ur.role = 'administrador'
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT ur.company_id 
      FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() 
        AND ur.role = 'administrador'
    )
  );

-- Actualizar políticas RLS existentes para usar roles
CREATE POLICY "Users can view their company data"
  ON public.companies
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT ur.company_id 
      FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view company employees"
  ON public.employees
  FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT ur.company_id 
      FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid()
    )
  );

CREATE POLICY "RRHH can manage company employees"
  ON public.employees
  FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT ur.company_id 
      FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() 
        AND ur.role IN ('administrador', 'rrhh')
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT ur.company_id 
      FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() 
        AND ur.role IN ('administrador', 'rrhh')
    )
  );

-- Políticas para otras tablas
CREATE POLICY "Users can view company alerts"
  ON public.dashboard_alerts
  FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT ur.company_id 
      FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view company activity"
  ON public.dashboard_activity
  FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT ur.company_id 
      FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view company payrolls"
  ON public.payrolls
  FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT ur.company_id 
      FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid()
    )
  );
