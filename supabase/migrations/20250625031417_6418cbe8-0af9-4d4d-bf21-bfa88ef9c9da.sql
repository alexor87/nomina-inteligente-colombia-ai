
-- Primero, vamos a crear las tablas necesarias para manejar múltiples empresas

-- 1. Tabla de suscripciones de empresa
CREATE TABLE public.company_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  plan_type TEXT CHECK (plan_type IN ('basico', 'profesional', 'empresarial')) DEFAULT 'basico',
  status TEXT CHECK (status IN ('activa', 'suspendida', 'cancelada', 'trial')) DEFAULT 'trial',
  trial_ends_at TIMESTAMP WITH TIME ZONE,
  subscription_starts_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  subscription_ends_at TIMESTAMP WITH TIME ZONE,
  max_employees INTEGER DEFAULT 5,
  max_payrolls_per_month INTEGER DEFAULT 1,
  features JSONB DEFAULT '{"email_support": true, "phone_support": false, "custom_reports": false}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(company_id)
);

-- 2. Tabla para administradores del SaaS (súper admins)
CREATE TABLE public.saas_admins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('super_admin', 'support')) DEFAULT 'support',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- 3. Insertar el usuario actual como súper admin del SaaS
INSERT INTO public.saas_admins (user_id, role)
SELECT id, 'super_admin'
FROM auth.users 
WHERE email = 'alexor87@gmail.com'
ON CONFLICT (user_id) DO NOTHING;

-- 4. Corregir políticas RLS para verdadera separación multiempresa

-- Limpiar políticas existentes problemáticas
DROP POLICY IF EXISTS "Users can view employees" ON public.employees;
DROP POLICY IF EXISTS "Users can manage employees" ON public.employees;
DROP POLICY IF EXISTS "Users can view payrolls" ON public.payrolls;
DROP POLICY IF EXISTS "Users can manage payrolls" ON public.payrolls;
DROP POLICY IF EXISTS "Users can view alerts" ON public.dashboard_alerts;
DROP POLICY IF EXISTS "Users can view activity" ON public.dashboard_activity;

-- Nuevas políticas estrictas para employees
CREATE POLICY "Users can view company employees"
  ON public.employees
  FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id 
      FROM public.profiles 
      WHERE user_id = auth.uid() 
      AND company_id IS NOT NULL
    )
    OR 
    EXISTS (
      SELECT 1 FROM public.saas_admins WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage company employees"
  ON public.employees
  FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT p.company_id 
      FROM public.profiles p
      JOIN public.user_roles ur ON ur.user_id = p.user_id
      WHERE p.user_id = auth.uid() 
      AND ur.role IN ('administrador', 'rrhh')
      AND p.company_id IS NOT NULL
    )
    OR 
    EXISTS (
      SELECT 1 FROM public.saas_admins WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT p.company_id 
      FROM public.profiles p
      JOIN public.user_roles ur ON ur.user_id = p.user_id
      WHERE p.user_id = auth.uid() 
      AND ur.role IN ('administrador', 'rrhh')
      AND p.company_id IS NOT NULL
    )
    OR 
    EXISTS (
      SELECT 1 FROM public.saas_admins WHERE user_id = auth.uid()
    )
  );

-- Políticas para payrolls
CREATE POLICY "Users can view company payrolls"
  ON public.payrolls
  FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id 
      FROM public.profiles 
      WHERE user_id = auth.uid() 
      AND company_id IS NOT NULL
    )
    OR 
    EXISTS (
      SELECT 1 FROM public.saas_admins WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage company payrolls"
  ON public.payrolls
  FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT p.company_id 
      FROM public.profiles p
      JOIN public.user_roles ur ON ur.user_id = p.user_id
      WHERE p.user_id = auth.uid() 
      AND ur.role IN ('administrador', 'rrhh', 'contador')
      AND p.company_id IS NOT NULL
    )
    OR 
    EXISTS (
      SELECT 1 FROM public.saas_admins WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT p.company_id 
      FROM public.profiles p
      JOIN public.user_roles ur ON ur.user_id = p.user_id
      WHERE p.user_id = auth.uid() 
      AND ur.role IN ('administrador', 'rrhh', 'contador')
      AND p.company_id IS NOT NULL
    )
    OR 
    EXISTS (
      SELECT 1 FROM public.saas_admins WHERE user_id = auth.uid()
    )
  );

-- Políticas para dashboard_alerts
CREATE POLICY "Users can view company alerts"
  ON public.dashboard_alerts
  FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id 
      FROM public.profiles 
      WHERE user_id = auth.uid() 
      AND company_id IS NOT NULL
    )
    OR 
    EXISTS (
      SELECT 1 FROM public.saas_admins WHERE user_id = auth.uid()
    )
  );

-- Políticas para dashboard_activity
CREATE POLICY "Users can view company activity"
  ON public.dashboard_activity
  FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id 
      FROM public.profiles 
      WHERE user_id = auth.uid() 
      AND company_id IS NOT NULL
    )
    OR 
    EXISTS (
      SELECT 1 FROM public.saas_admins WHERE user_id = auth.uid()
    )
  );

-- RLS para company_subscriptions
ALTER TABLE public.company_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their company subscription"
  ON public.company_subscriptions
  FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id 
      FROM public.profiles 
      WHERE user_id = auth.uid() 
      AND company_id IS NOT NULL
    )
    OR 
    EXISTS (
      SELECT 1 FROM public.saas_admins WHERE user_id = auth.uid()
    )
  );

-- RLS para saas_admins
ALTER TABLE public.saas_admins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can view saas admins"
  ON public.saas_admins
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.saas_admins 
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  );

-- Función para verificar si el usuario es super admin
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
    WHERE user_id = _user_id
  )
$$;

-- Función para crear empresa con setup inicial (para el registro de nuevas empresas)
CREATE OR REPLACE FUNCTION public.create_company_with_setup(
  p_nit TEXT,
  p_razon_social TEXT,
  p_email TEXT,
  p_telefono TEXT DEFAULT NULL,
  p_ciudad TEXT DEFAULT 'Bogotá',
  p_plan TEXT DEFAULT 'basico'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  new_company_id UUID;
  current_user_id UUID;
BEGIN
  current_user_id := auth.uid();
  
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
  
  -- Actualizar el perfil del usuario con la nueva empresa
  UPDATE public.profiles 
  SET company_id = new_company_id,
      updated_at = now()
  WHERE user_id = current_user_id;
  
  -- Asignar rol de administrador al usuario
  INSERT INTO public.user_roles (
    user_id,
    role,
    company_id,
    assigned_by
  ) VALUES (
    current_user_id,
    'administrador',
    new_company_id,
    current_user_id
  );
  
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

-- Crear índices para optimizar consultas multiempresa
CREATE INDEX IF NOT EXISTS idx_employees_company_id ON public.employees(company_id);
CREATE INDEX IF NOT EXISTS idx_payrolls_company_id ON public.payrolls(company_id);
CREATE INDEX IF NOT EXISTS idx_profiles_company_id ON public.profiles(company_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_company_user ON public.user_roles(company_id, user_id);
