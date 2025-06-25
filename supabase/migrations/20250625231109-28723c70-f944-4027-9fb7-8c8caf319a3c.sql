
-- Crear tabla superadmins en el esquema público
CREATE TABLE public.superadmins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID
);

-- Habilitar RLS en la tabla superadmins
ALTER TABLE public.superadmins ENABLE ROW LEVEL SECURITY;

-- Política básica para superadmins (solo ellos pueden ver y modificar)
CREATE POLICY "Superadmins can manage superadmins table" 
  ON public.superadmins 
  FOR ALL 
  TO authenticated 
  USING (user_id = auth.uid());

-- Insertar tu usuario como superadmin
INSERT INTO public.superadmins (user_id, email, created_by) 
VALUES (
  '3716ea94-cab9-47a5-b83d-0ef05a817bf2',
  'alexor87@gmail.com',
  '3716ea94-cab9-47a5-b83d-0ef05a817bf2'
);

-- Recrear la función is_superadmin para usar la tabla superadmins
CREATE OR REPLACE FUNCTION public.is_superadmin(_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.superadmins 
    WHERE user_id = COALESCE(_user_id, auth.uid())
  )
$$;

-- Actualizar la función has_role para usar la nueva is_superadmin
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role, _company_id UUID DEFAULT NULL)
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
      FROM public.user_roles
      WHERE user_id = _user_id
        AND role = _role
        AND (company_id = _company_id OR _company_id IS NULL)
    )
  END
$$;
