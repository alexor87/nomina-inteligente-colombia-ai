
-- Corregir la función create_company_with_setup para ser genérica para cualquier usuario
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

-- Función genérica para asignar rol de administrador a cualquier usuario que tenga empresa pero no roles
CREATE OR REPLACE FUNCTION public.ensure_admin_role_for_company_users()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_record RECORD;
BEGIN
  -- Buscar usuarios que tienen empresa asignada pero no tienen roles
  FOR user_record IN 
    SELECT p.user_id, p.company_id
    FROM public.profiles p
    WHERE p.company_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 
      FROM public.user_roles ur 
      WHERE ur.user_id = p.user_id 
      AND ur.company_id = p.company_id
    )
  LOOP
    -- Asignar rol de administrador
    INSERT INTO public.user_roles (
      user_id,
      role,
      company_id,
      assigned_by
    ) VALUES (
      user_record.user_id,
      'administrador'::app_role,
      user_record.company_id,
      user_record.user_id
    ) ON CONFLICT (user_id, role, company_id) DO NOTHING;
    
    RAISE NOTICE 'Admin role assigned to user: % for company: %', user_record.user_id, user_record.company_id;
  END LOOP;
END;
$$;

-- Ejecutar la función para corregir usuarios existentes que no tienen roles
SELECT public.ensure_admin_role_for_company_users();

-- Crear un trigger para asegurar que cuando se actualiza un perfil con company_id, el usuario tenga rol de admin
CREATE OR REPLACE FUNCTION public.ensure_admin_role_on_profile_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Si se asigna una empresa al perfil y el usuario no tiene roles en esa empresa
  IF NEW.company_id IS NOT NULL AND (OLD.company_id IS NULL OR OLD.company_id != NEW.company_id) THEN
    -- Verificar si ya tiene rol de administrador en la empresa
    IF NOT EXISTS (
      SELECT 1 
      FROM public.user_roles 
      WHERE user_id = NEW.user_id 
      AND company_id = NEW.company_id 
      AND role = 'administrador'::app_role
    ) THEN
      -- Asignar rol de administrador
      INSERT INTO public.user_roles (
        user_id,
        role,
        company_id,
        assigned_by
      ) VALUES (
        NEW.user_id,
        'administrador'::app_role,
        NEW.company_id,
        NEW.user_id
      ) ON CONFLICT (user_id, role, company_id) DO NOTHING;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Crear el trigger
DROP TRIGGER IF EXISTS ensure_admin_role_trigger ON public.profiles;
CREATE TRIGGER ensure_admin_role_trigger
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_admin_role_on_profile_update();
