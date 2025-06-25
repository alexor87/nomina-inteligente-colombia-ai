
-- Eliminar completamente todas las funciones problemáticas y sus dependencias
-- usando CASCADE para forzar la eliminación

-- PASO 1: Eliminar todas las políticas que podrían depender de las funciones
DROP POLICY IF EXISTS "Simple: Users view own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Simple: Admins manage company roles" ON public.user_roles;
DROP POLICY IF EXISTS "Ultra simple: Users manage roles in their company" ON public.user_roles;
DROP POLICY IF EXISTS "Direct: Users view their company employees" ON public.employees;
DROP POLICY IF EXISTS "Direct: Users create employees for their company" ON public.employees;
DROP POLICY IF EXISTS "Direct: Users update their company employees" ON public.employees;
DROP POLICY IF EXISTS "Direct: Users delete their company employees" ON public.employees;
DROP POLICY IF EXISTS "Ultra simple: View company employees" ON public.employees;
DROP POLICY IF EXISTS "Ultra simple: Create company employees" ON public.employees;
DROP POLICY IF EXISTS "Ultra simple: Update company employees" ON public.employees;
DROP POLICY IF EXISTS "Ultra simple: Delete company employees" ON public.employees;

-- PASO 2: Ahora eliminar las funciones con CASCADE por si acaso
DROP FUNCTION IF EXISTS public.is_company_admin(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.can_manage_company_users(uuid, uuid) CASCADE;

-- PASO 3: Deshabilitar RLS en usuarios_empresa para evitar problemas
ALTER TABLE public.usuarios_empresa DISABLE ROW LEVEL SECURITY;

-- PASO 4: Crear políticas ULTRA-SIMPLES para employees
CREATE POLICY "Ultra simple: View company employees" 
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
  );

CREATE POLICY "Ultra simple: Create company employees" 
  ON public.employees 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (
    company_id IN (
      SELECT company_id 
      FROM public.profiles 
      WHERE user_id = auth.uid() 
      AND company_id IS NOT NULL
    )
  );

CREATE POLICY "Ultra simple: Update company employees" 
  ON public.employees 
  FOR UPDATE 
  TO authenticated 
  USING (
    company_id IN (
      SELECT company_id 
      FROM public.profiles 
      WHERE user_id = auth.uid() 
      AND company_id IS NOT NULL
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id 
      FROM public.profiles 
      WHERE user_id = auth.uid() 
      AND company_id IS NOT NULL
    )
  );

CREATE POLICY "Ultra simple: Delete company employees" 
  ON public.employees 
  FOR DELETE 
  TO authenticated 
  USING (
    company_id IN (
      SELECT company_id 
      FROM public.profiles 
      WHERE user_id = auth.uid() 
      AND company_id IS NOT NULL
    )
  );

-- PASO 5: Crear políticas simples para user_roles sin referencias problemáticas
CREATE POLICY "Basic: Users view own roles" 
  ON public.user_roles 
  FOR SELECT 
  TO authenticated 
  USING (user_id = auth.uid());

CREATE POLICY "Basic: Users manage their company roles" 
  ON public.user_roles 
  FOR ALL 
  TO authenticated 
  USING (
    company_id IN (
      SELECT company_id 
      FROM public.profiles 
      WHERE user_id = auth.uid() 
      AND company_id IS NOT NULL
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id 
      FROM public.profiles 
      WHERE user_id = auth.uid() 
      AND company_id IS NOT NULL
    )
  );
