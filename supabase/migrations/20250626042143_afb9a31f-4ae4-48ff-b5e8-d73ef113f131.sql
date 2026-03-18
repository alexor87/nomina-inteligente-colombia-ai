
-- Eliminar TODAS las políticas existentes en user_roles para empezar limpio
DROP POLICY IF EXISTS "Users can view own roles and company roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can manage roles in their company" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can insert their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage roles in their company" ON public.user_roles;
DROP POLICY IF EXISTS "Ultra simple: Users manage roles in their company" ON public.user_roles;
DROP POLICY IF EXISTS "Simple: Admins manage company roles" ON public.user_roles;

-- Limpiar funciones problemáticas que referencian super-admin
DROP FUNCTION IF EXISTS public.is_superadmin(uuid);
DROP TABLE IF EXISTS public.superadmins CASCADE;

-- Recrear la función has_role SIN referencias a super-admin
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role, _company_id UUID DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
      AND (company_id = _company_id OR _company_id IS NULL)
  )
$$;

-- Recrear la función create_company_with_setup SIN referencias a super-admin
CREATE OR REPLACE FUNCTION public.create_company_with_setup(
  p_nit text,
  p_razon_social text,
  p_email text,
  p_telefono text DEFAULT NULL::text,
  p_ciudad text DEFAULT 'Bogotá'::text,
  p_plan text DEFAULT 'basico'::text,
  p_user_email text DEFAULT NULL::text,
  p_user_password text DEFAULT NULL::text,
  p_first_name text DEFAULT NULL::text,
  p_last_name text DEFAULT NULL::text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_company_id UUID;
  current_user_id UUID;
BEGIN
  current_user_id := auth.uid();
  
  -- Si no hay usuario autenticado, lanzar error
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;
  
  -- Crear la empresa
  INSERT INTO public.companies (
    nit,
    razon_social,
    email,
    telefono,
    ciudad,
    estado,
    plan
  ) VALUES (
    p_nit,
    p_razon_social,
    p_email,
    p_telefono,
    p_ciudad,
    'activa',
    p_plan
  ) RETURNING id INTO new_company_id;
  
  -- Actualizar o crear perfil del usuario con la nueva empresa
  INSERT INTO public.profiles (
    user_id,
    company_id,
    first_name,
    last_name
  ) VALUES (
    current_user_id,
    new_company_id,
    COALESCE(p_first_name, ''),
    COALESCE(p_last_name, '')
  ) ON CONFLICT (user_id) DO UPDATE SET
    company_id = new_company_id,
    first_name = COALESCE(profiles.first_name, p_first_name, ''),
    last_name = COALESCE(profiles.last_name, p_last_name, ''),
    updated_at = now();
  
  -- ASIGNAR AUTOMÁTICAMENTE ROL DE ADMINISTRADOR AL CREADOR DE LA EMPRESA
  INSERT INTO public.user_roles (
    user_id,
    role,
    company_id,
    assigned_by
  ) VALUES (
    current_user_id,
    'administrador'::app_role,
    new_company_id,
    current_user_id
  ) ON CONFLICT (user_id, role, company_id) DO NOTHING;
  
  -- Crear configuración inicial
  INSERT INTO public.company_settings (
    company_id,
    periodicity
  ) VALUES (
    new_company_id,
    'mensual'
  ) ON CONFLICT (company_id) DO NOTHING;
  
  -- Crear suscripción inicial (trial por 30 días)
  INSERT INTO public.company_subscriptions (
    company_id,
    plan_type,
    status,
    trial_ends_at,
    max_employees,
    max_payrolls_per_month
  ) VALUES (
    new_company_id,
    p_plan,
    'trial',
    now() + interval '30 days',
    CASE 
      WHEN p_plan = 'basico' THEN 5
      WHEN p_plan = 'profesional' THEN 25
      WHEN p_plan = 'empresarial' THEN 100
      ELSE 5
    END,
    CASE 
      WHEN p_plan = 'basico' THEN 1
      WHEN p_plan = 'profesional' THEN 12
      WHEN p_plan = 'empresarial' THEN 999
      ELSE 1
    END
  ) ON CONFLICT (company_id) DO NOTHING;
  
  RETURN new_company_id;
END;
$$;

-- Crear políticas RLS limpias para user_roles
CREATE POLICY "View own and company roles" 
  ON public.user_roles 
  FOR SELECT 
  TO authenticated 
  USING (
    user_id = auth.uid() OR 
    company_id = public.get_current_user_company_id()
  );

CREATE POLICY "Manage company roles" 
  ON public.user_roles 
  FOR ALL 
  TO authenticated 
  USING (
    company_id = public.get_current_user_company_id()
  )
  WITH CHECK (
    company_id = public.get_current_user_company_id()
  );
