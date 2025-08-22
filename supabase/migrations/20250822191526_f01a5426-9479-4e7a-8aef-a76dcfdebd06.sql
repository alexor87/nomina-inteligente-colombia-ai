
-- 1) Desbloquear lectura segura de empleados (KISS)
-- Eliminar política restrictiva que niega todo acceso
DROP POLICY IF EXISTS "DENY_ALL_PUBLIC_ACCESS" ON public.employees;

-- Asegurar que RLS está habilitado en employees (idempotente)
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

-- Si faltara la política de lectura por empresa, crearla de forma segura
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'employees' 
      AND policyname = 'Users can view company employees'
  ) THEN
    CREATE POLICY "Users can view company employees"
      ON public.employees
      FOR SELECT
      USING ((auth.uid() IS NOT NULL) AND (company_id = get_current_user_company_id()));
  END IF;
END$$;

-- 2) Preparar payrolls para operación sin duplicados (KISS)
-- Asegurar RLS en payrolls
ALTER TABLE public.payrolls ENABLE ROW LEVEL SECURITY;

-- Políticas mínimas por compañía (solo si no existen)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='payrolls' AND policyname='Users can view their company payrolls'
  ) THEN
    CREATE POLICY "Users can view their company payrolls"
      ON public.payrolls
      FOR SELECT
      USING (company_id = get_current_user_company_id());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='payrolls' AND policyname='Users can insert their company payrolls'
  ) THEN
    CREATE POLICY "Users can insert their company payrolls"
      ON public.payrolls
      FOR INSERT
      WITH CHECK (company_id = get_current_user_company_id());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='payrolls' AND policyname='Users can update their company payrolls'
  ) THEN
    CREATE POLICY "Users can update their company payrolls"
      ON public.payrolls
      FOR UPDATE
      USING (company_id = get_current_user_company_id())
      WITH CHECK (company_id = get_current_user_company_id());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='payrolls' AND policyname='Users can delete their company payrolls'
  ) THEN
    CREATE POLICY "Users can delete their company payrolls"
      ON public.payrolls
      FOR DELETE
      USING (company_id = get_current_user_company_id());
  END IF;
END$$;

-- Índice único para asegurar un registro por empleado y período por empresa
CREATE UNIQUE INDEX IF NOT EXISTS uq_payrolls_company_employee_period
  ON public.payrolls (company_id, employee_id, period_id);
