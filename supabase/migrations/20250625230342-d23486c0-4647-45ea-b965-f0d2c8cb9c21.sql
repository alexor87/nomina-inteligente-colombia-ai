
-- Crear una función SECURITY DEFINER que evite problemas de permisos
CREATE OR REPLACE FUNCTION public.get_current_user_company_id()
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT company_id 
  FROM public.profiles 
  WHERE user_id = auth.uid()
  LIMIT 1
$$;

-- Actualizar las políticas de employees para usar la nueva función
DROP POLICY IF EXISTS "Direct: Users view their company employees" ON public.employees;
DROP POLICY IF EXISTS "Direct: Users create employees for their company" ON public.employees;
DROP POLICY IF EXISTS "Direct: Users update their company employees" ON public.employees;
DROP POLICY IF EXISTS "Direct: Users delete their company employees" ON public.employees;

-- Crear políticas más eficientes usando la función
CREATE POLICY "Users view their company employees" 
  ON public.employees 
  FOR SELECT 
  TO authenticated 
  USING (company_id = public.get_current_user_company_id());

CREATE POLICY "Users create employees for their company" 
  ON public.employees 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (company_id = public.get_current_user_company_id());

CREATE POLICY "Users update their company employees" 
  ON public.employees 
  FOR UPDATE 
  TO authenticated 
  USING (company_id = public.get_current_user_company_id())
  WITH CHECK (company_id = public.get_current_user_company_id());

CREATE POLICY "Users delete their company employees" 
  ON public.employees 
  FOR DELETE 
  TO authenticated 
  USING (company_id = public.get_current_user_company_id());
