
-- LIMPIEZA COMPLETA DE REFERENCIAS A is_superadmin - VERSIÓN CORREGIDA

-- 1. Eliminar TODAS las funciones que referencian is_superadmin
DROP FUNCTION IF EXISTS public.assign_admin_role_on_company_creation() CASCADE;
DROP FUNCTION IF EXISTS public.user_has_access_to_company(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.is_superadmin(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.can_manage_company_users(uuid, uuid) CASCADE;

-- 2. Eliminar triggers que puedan usar estas funciones
DROP TRIGGER IF EXISTS assign_admin_role_trigger ON public.companies;

-- 3. Limpiar tabla superadmins si existe
DROP TABLE IF EXISTS public.superadmins CASCADE;

-- 4. Recrear funciones SIN referencias a superadmin
CREATE OR REPLACE FUNCTION public.user_has_access_to_company(_user_id uuid, _company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.user_roles 
    WHERE user_id = _user_id 
      AND company_id = _company_id
  ) OR EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE user_id = _user_id
      AND company_id = _company_id
  )
$$;

-- 5. Recrear función simple para gestión de usuarios de empresa
CREATE OR REPLACE FUNCTION public.can_manage_company_users(_user_id UUID, _company_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.profiles p
    WHERE p.user_id = _user_id 
    AND p.company_id = _company_id
  ) OR EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = _user_id
    AND ur.company_id = _company_id
    AND ur.role = 'administrador'::app_role
  )
$$;

-- 6. Asegurar que la función has_role esté limpia
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

-- 7. Verificar y limpiar funciones get_user_role_in_company
CREATE OR REPLACE FUNCTION public.get_user_role_in_company(_user_id uuid, _company_id uuid)
RETURNS text
LANGUAGE sql
STABLE 
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT role::text
  FROM public.user_roles
  WHERE user_id = _user_id 
    AND company_id = _company_id 
  LIMIT 1
$$;

-- 8. Recrear la función create_company_with_setup limpia
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
  
  -- Log para debugging
  RAISE NOTICE 'Creating company for user: %', current_user_id;
  
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
  
  RAISE NOTICE 'Company created with ID: %', new_company_id;
  
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
  
  RAISE NOTICE 'Profile updated for user: %', current_user_id;
  
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
  
  RAISE NOTICE 'Admin role assigned to user: % for company: %', current_user_id, new_company_id;
  
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
  
  RAISE NOTICE 'Company setup completed successfully for: %', new_company_id;
  
  RETURN new_company_id;
END;
$$;

-- 9. Asegurar permisos correctos en la función
GRANT EXECUTE ON FUNCTION public.create_company_with_setup TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_company_with_setup TO anon;
