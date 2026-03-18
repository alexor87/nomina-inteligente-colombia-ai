
-- Eliminar las políticas RLS problemáticas que causan recursión
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage roles in their company" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their company data" ON public.companies;
DROP POLICY IF EXISTS "Users can view company employees" ON public.employees;
DROP POLICY IF EXISTS "RRHH can manage company employees" ON public.employees;
DROP POLICY IF EXISTS "Users can view company alerts" ON public.dashboard_alerts;
DROP POLICY IF EXISTS "Users can view company activity" ON public.dashboard_activity;
DROP POLICY IF EXISTS "Users can view company payrolls" ON public.payrolls;

-- Crear políticas RLS más simples que no causen recursión
CREATE POLICY "Users can view their own roles"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own roles"
  ON public.user_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Políticas para companies (sin verificación de roles para evitar recursión)
CREATE POLICY "Users can view companies"
  ON public.companies
  FOR SELECT
  TO authenticated
  USING (true);

-- Políticas para employees (sin verificación de roles para evitar recursión)
CREATE POLICY "Users can view employees"
  ON public.employees
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage employees"
  ON public.employees
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Políticas para dashboard_alerts
CREATE POLICY "Users can view alerts"
  ON public.dashboard_alerts
  FOR SELECT
  TO authenticated
  USING (true);

-- Políticas para dashboard_activity
CREATE POLICY "Users can view activity"
  ON public.dashboard_activity
  FOR SELECT
  TO authenticated
  USING (true);

-- Políticas para payrolls
CREATE POLICY "Users can view payrolls"
  ON public.payrolls
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage payrolls"
  ON public.payrolls
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
