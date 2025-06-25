
-- 1. Primero, arreglar la función create_company_with_setup para que asigne automáticamente el rol de administrador
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
  new_user_id UUID;
BEGIN
  current_user_id := auth.uid();
  
  -- Si no hay usuario autenticado y se proporcionaron datos de usuario, crear uno nuevo
  IF current_user_id IS NULL AND p_user_email IS NOT NULL AND p_user_password IS NOT NULL THEN
    -- Crear nuevo usuario usando auth.users (esto requiere privilegios especiales)
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      recovery_sent_at,
      last_sign_in_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      p_user_email,
      crypt(p_user_password, gen_salt('bf')),
      now(),
      now(),
      now(),
      '{"provider": "email", "providers": ["email"]}',
      jsonb_build_object('first_name', p_first_name, 'last_name', p_last_name),
      now(),
      now(),
      '',
      '',
      '',
      ''
    ) RETURNING id INTO new_user_id;
    
    current_user_id := new_user_id;
  END IF;
  
  -- Si aún no hay usuario, lanzar error
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado y no se proporcionaron credenciales';
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
    p_first_name,
    p_last_name
  ) ON CONFLICT (user_id) DO UPDATE SET
    company_id = new_company_id,
    first_name = COALESCE(profiles.first_name, p_first_name),
    last_name = COALESCE(profiles.last_name, p_last_name),
    updated_at = now();
  
  -- CORREGIDO: Asignar rol de administrador al usuario automáticamente
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
  );
  
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
  );
  
  RETURN new_company_id;
END;
$$;

-- 2. Asignar rol de administrador a usuarios existentes que crearon empresas pero no tienen roles
INSERT INTO public.user_roles (user_id, role, company_id, assigned_by, assigned_at)
SELECT 
    p.user_id,
    'administrador'::app_role,
    p.company_id,
    p.user_id,
    now()
FROM public.profiles p
JOIN public.companies c ON c.id = p.company_id
WHERE p.company_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = p.user_id 
      AND ur.role = 'administrador' 
      AND ur.company_id = p.company_id
  );

-- 3. Mejorar las políticas RLS para permitir que super admins accedan a todos los datos
-- Actualizar política para companies
DROP POLICY IF EXISTS "Users can view their company or super admins can view all" ON public.companies;
CREATE POLICY "Users can view their company or super admins can view all"
  ON public.companies
  FOR SELECT
  TO authenticated
  USING (
    -- Super admins pueden ver todas las empresas
    EXISTS (SELECT 1 FROM public.saas_admins WHERE user_id = auth.uid())
    OR
    -- Usuarios regulares solo pueden ver su empresa
    id IN (
      SELECT company_id 
      FROM public.profiles 
      WHERE user_id = auth.uid() 
      AND company_id IS NOT NULL
    )
  );

-- Actualizar política para employees
DROP POLICY IF EXISTS "RRHH can manage company employees" ON public.employees;
CREATE POLICY "Users can view and manage company employees"
  ON public.employees
  FOR ALL
  TO authenticated
  USING (
    -- Super admins pueden acceder a todos los empleados
    EXISTS (SELECT 1 FROM public.saas_admins WHERE user_id = auth.uid())
    OR
    -- Usuarios con permisos en la empresa
    company_id IN (
      SELECT ur.company_id 
      FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() 
        AND ur.role IN ('administrador', 'rrhh')
    )
  )
  WITH CHECK (
    -- Super admins pueden crear/modificar todos los empleados
    EXISTS (SELECT 1 FROM public.saas_admins WHERE user_id = auth.uid())
    OR
    -- Usuarios con permisos en la empresa
    company_id IN (
      SELECT ur.company_id 
      FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() 
        AND ur.role IN ('administrador', 'rrhh')
    )
  );

-- Actualizar política para payrolls
DROP POLICY IF EXISTS "Users can view company payrolls" ON public.payrolls;
CREATE POLICY "Users can view and manage company payrolls"
  ON public.payrolls
  FOR ALL
  TO authenticated
  USING (
    -- Super admins pueden acceder a todas las nóminas
    EXISTS (SELECT 1 FROM public.saas_admins WHERE user_id = auth.uid())
    OR
    -- Usuarios con permisos en la empresa
    company_id IN (
      SELECT ur.company_id 
      FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() 
        AND ur.role IN ('administrador', 'rrhh', 'contador')
    )
  )
  WITH CHECK (
    -- Super admins pueden crear/modificar todas las nóminas
    EXISTS (SELECT 1 FROM public.saas_admins WHERE user_id = auth.uid())
    OR
    -- Usuarios con permisos en la empresa
    company_id IN (
      SELECT ur.company_id 
      FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() 
        AND ur.role IN ('administrador', 'rrhh', 'contador')
    )
  );

-- Actualizar política para dashboard_alerts
DROP POLICY IF EXISTS "Users can view company alerts" ON public.dashboard_alerts;
CREATE POLICY "Users can view company alerts"
  ON public.dashboard_alerts
  FOR SELECT
  TO authenticated
  USING (
    -- Super admins pueden ver todas las alertas
    EXISTS (SELECT 1 FROM public.saas_admins WHERE user_id = auth.uid())
    OR
    -- Usuarios con acceso a la empresa
    company_id IN (
      SELECT ur.company_id 
      FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid()
    )
  );

-- Actualizar política para dashboard_activity
DROP POLICY IF EXISTS "Users can view company activity" ON public.dashboard_activity;
CREATE POLICY "Users can view company activity"
  ON public.dashboard_activity
  FOR SELECT
  TO authenticated
  USING (
    -- Super admins pueden ver toda la actividad
    EXISTS (SELECT 1 FROM public.saas_admins WHERE user_id = auth.uid())
    OR
    -- Usuarios con acceso a la empresa
    company_id IN (
      SELECT ur.company_id 
      FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid()
    )
  );
