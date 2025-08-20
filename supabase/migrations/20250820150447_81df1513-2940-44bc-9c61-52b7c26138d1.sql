
-- Tabla de políticas de nómina por empresa
CREATE TABLE IF NOT EXISTS public.company_payroll_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  -- Modo de IBC: proporcional al período (por defecto) o basado en valor de incapacidad del período
  ibc_mode TEXT NOT NULL DEFAULT 'proportional' CHECK (ibc_mode IN ('proportional', 'incapacity')),
  -- Política de incapacidad:
  -- - standard_2d_100_rest_66: días 1-2 al 100%, día 3+ al 66.67%
  -- - from_day1_66_with_floor: desde día 1 al 66.67% con piso diario de SMLV/30 aplicado por día
  incapacity_policy TEXT NOT NULL DEFAULT 'standard_2d_100_rest_66' CHECK (incapacity_policy IN ('standard_2d_100_rest_66', 'from_day1_66_with_floor')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índice único por empresa (una política activa por empresa)
CREATE UNIQUE INDEX IF NOT EXISTS company_payroll_policies_company_id_uidx
  ON public.company_payroll_policies (company_id);

-- Habilitar RLS
ALTER TABLE public.company_payroll_policies ENABLE ROW LEVEL SECURITY;

-- Policies: acceso restringido a la empresa del usuario
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'company_payroll_policies' AND policyname = 'select_own_company_policy'
  ) THEN
    CREATE POLICY select_own_company_policy
      ON public.company_payroll_policies
      FOR SELECT
      USING (public.get_current_user_company_id() = company_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'company_payroll_policies' AND policyname = 'insert_own_company_policy'
  ) THEN
    CREATE POLICY insert_own_company_policy
      ON public.company_payroll_policies
      FOR INSERT
      WITH CHECK (public.get_current_user_company_id() = company_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'company_payroll_policies' AND policyname = 'update_own_company_policy'
  ) THEN
    CREATE POLICY update_own_company_policy
      ON public.company_payroll_policies
      FOR UPDATE
      USING (public.get_current_user_company_id() = company_id)
      WITH CHECK (public.get_current_user_company_id() = company_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'company_payroll_policies' AND policyname = 'delete_own_company_policy'
  ) THEN
    CREATE POLICY delete_own_company_policy
      ON public.company_payroll_policies
      FOR DELETE
      USING (public.get_current_user_company_id() = company_id);
  END IF;
END
$$;

-- Trigger para mantener updated_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_trigger 
    WHERE tgname = 'trg_company_payroll_policies_updated_at'
  ) THEN
    CREATE TRIGGER trg_company_payroll_policies_updated_at
      BEFORE UPDATE ON public.company_payroll_policies
      FOR EACH ROW
      EXECUTE PROCEDURE public.update_updated_at_column();
  END IF;
END
$$;
