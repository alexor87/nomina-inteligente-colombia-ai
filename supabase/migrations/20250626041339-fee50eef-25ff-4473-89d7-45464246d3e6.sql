
-- Forzar recarga del esquema de PostgREST y recrear la función con tipos explícitos
-- Primero notificar a PostgREST que recargue el esquema
NOTIFY pgrst, 'reload schema';

-- Recrear la función con tipos más explícitos para evitar problemas de matching
DROP FUNCTION IF EXISTS public.create_company_with_setup(text, text, text, text, text, text, text, text, text, text);

CREATE OR REPLACE FUNCTION public.create_company_with_setup(
  p_nit text,
  p_razon_social text,
  p_email text,
  p_telefono text DEFAULT NULL,
  p_ciudad text DEFAULT 'Bogotá',
  p_plan text DEFAULT 'basico',
  p_user_email text DEFAULT NULL,
  p_user_password text DEFAULT NULL,
  p_first_name text DEFAULT NULL,
  p_last_name text DEFAULT NULL
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
  -- Obtener el ID del usuario actual
  current_user_id := auth.uid();
  
  -- Verificar que el usuario esté autenticado
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado' USING ERRCODE = 'auth_required';
  END IF;
  
  -- Log para debugging
  RAISE NOTICE 'Creating company for user: %', current_user_id;
  
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
  
  -- Asignar rol de administrador automáticamente
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

-- Asegurar que el tipo enum existe y está disponible
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
        CREATE TYPE public.app_role AS ENUM ('administrador', 'rrhh', 'contador', 'visualizador', 'soporte');
    END IF;
END $$;

-- Refrescar permisos y hacer la función accesible via RPC
GRANT EXECUTE ON FUNCTION public.create_company_with_setup TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_company_with_setup TO anon;

-- Segunda notificación para asegurar que PostgREST recargue
NOTIFY pgrst, 'reload schema';
