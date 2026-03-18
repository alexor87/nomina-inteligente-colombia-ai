
-- Eliminar TODAS las políticas existentes de employees que puedan causar problemas
DROP POLICY IF EXISTS "Simple: Users view company employees" ON public.employees;
DROP POLICY IF EXISTS "Simple: Users create company employees" ON public.employees;
DROP POLICY IF EXISTS "Simple: Users update company employees" ON public.employees;
DROP POLICY IF EXISTS "Simple: Users delete company employees" ON public.employees;
DROP POLICY IF EXISTS "Direct: Users view their company employees" ON public.employees;
DROP POLICY IF EXISTS "Direct: Users create employees for their company" ON public.employees;
DROP POLICY IF EXISTS "Direct: Users update their company employees" ON public.employees;
DROP POLICY IF EXISTS "Direct: Users delete their company employees" ON public.employees;
DROP POLICY IF EXISTS "Ultra simple: View company employees" ON public.employees;
DROP POLICY IF EXISTS "Ultra simple: Create company employees" ON public.employees;
DROP POLICY IF EXISTS "Ultra simple: Update company employees" ON public.employees;
DROP POLICY IF EXISTS "Ultra simple: Delete company employees" ON public.employees;

-- Crear políticas ULTRA-SIMPLES que SOLO usen la tabla profiles
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
