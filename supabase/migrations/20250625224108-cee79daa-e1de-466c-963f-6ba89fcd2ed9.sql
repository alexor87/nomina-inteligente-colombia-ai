
-- Solución definitiva: Eliminar por completo las referencias a usuarios_empresa
-- y simplificar las políticas de employees para que solo usen profiles

-- PASO 1: Eliminar TODAS las políticas existentes de employees que puedan causar problemas
DROP POLICY IF EXISTS "Simple: Users view company employees" ON public.employees;
DROP POLICY IF EXISTS "Simple: Users create company employees" ON public.employees;
DROP POLICY IF EXISTS "Simple: Users update company employees" ON public.employees;
DROP POLICY IF EXISTS "Simple: Users delete company employees" ON public.employees;

-- PASO 2: Crear políticas ultra-simples que SOLO usen la tabla profiles
CREATE POLICY "Direct: Users view their company employees" 
  ON public.employees 
  FOR SELECT 
  TO authenticated 
  USING (
    company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Direct: Users create employees for their company" 
  ON public.employees 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (
    company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Direct: Users update their company employees" 
  ON public.employees 
  FOR UPDATE 
  TO authenticated 
  USING (
    company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
  )
  WITH CHECK (
    company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Direct: Users delete their company employees" 
  ON public.employees 
  FOR DELETE 
  TO authenticated 
  USING (
    company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
  );

-- PASO 3: Eliminar también la política problemática de usuarios_empresa por completo
DROP POLICY IF EXISTS "Ultra simple: Users manage own company users" ON public.usuarios_empresa;

-- PASO 4: No crear ninguna política para usuarios_empresa por ahora para evitar recursión
-- La tabla usuarios_empresa permanecerá sin políticas RLS temporalmente
