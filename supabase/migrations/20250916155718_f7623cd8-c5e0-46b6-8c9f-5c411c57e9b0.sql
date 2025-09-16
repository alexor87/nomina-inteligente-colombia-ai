-- Employee Identity Ledger and RPC for historical identity resolution
-- 1) Table to store historical identity snapshots
CREATE TABLE IF NOT EXISTS public.employee_identity_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  employee_id uuid NOT NULL,
  nombre text,
  apellido text,
  cedula text,
  tipo_documento text DEFAULT 'CC',
  cargo text,
  email text,
  estado text,
  created_at timestamptz NOT NULL DEFAULT now(),
  effective_at timestamptz NOT NULL DEFAULT now(),
  is_deleted boolean NOT NULL DEFAULT false,
  source text NOT NULL DEFAULT 'trigger'
);

-- Helpful index for time-based lookups
CREATE INDEX IF NOT EXISTS idx_employee_identity_ledger_emp_time
  ON public.employee_identity_ledger (employee_id, effective_at DESC);

-- Enable Row Level Security and add policies
ALTER TABLE public.employee_identity_ledger ENABLE ROW LEVEL SECURITY;

-- Allow reading identities only within the user's company
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'employee_identity_ledger' 
      AND policyname = 'Users can view identity ledger for their company'
  ) THEN
    CREATE POLICY "Users can view identity ledger for their company"
      ON public.employee_identity_ledger
      FOR SELECT
      USING (company_id = get_current_user_company_id());
  END IF;
END$$;

-- Allow inserts (from triggers or clients); updates/deletes are not allowed
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'employee_identity_ledger' 
      AND policyname = 'Allow inserts into identity ledger'
  ) THEN
    CREATE POLICY "Allow inserts into identity ledger"
      ON public.employee_identity_ledger
      FOR INSERT
      WITH CHECK (true);
  END IF;
END$$;

-- 2) Trigger function to log identity on employee changes
CREATE OR REPLACE FUNCTION public.log_employee_identity_change()
RETURNS trigger AS $$
DECLARE
  v_company_id uuid;
  v_employee_id uuid;
  v_nombre text;
  v_apellido text;
  v_cedula text;
  v_tipo_documento text;
  v_cargo text;
  v_email text;
  v_estado text;
  v_is_deleted boolean := false;
BEGIN
  IF (TG_OP = 'DELETE') THEN
    v_company_id := OLD.company_id;
    v_employee_id := OLD.id;
    v_nombre := OLD.nombre;
    v_apellido := OLD.apellido;
    v_cedula := OLD.cedula;
    v_tipo_documento := COALESCE(OLD.tipo_documento, 'CC');
    v_cargo := OLD.cargo;
    v_email := OLD.email;
    v_estado := OLD.estado;
    v_is_deleted := true;
  ELSE
    v_company_id := NEW.company_id;
    v_employee_id := NEW.id;
    v_nombre := NEW.nombre;
    v_apellido := NEW.apellido;
    v_cedula := NEW.cedula;
    v_tipo_documento := COALESCE(NEW.tipo_documento, 'CC');
    v_cargo := NEW.cargo;
    v_email := NEW.email;
    v_estado := NEW.estado;
  END IF;

  INSERT INTO public.employee_identity_ledger (
    company_id, employee_id, nombre, apellido, cedula, tipo_documento,
    cargo, email, estado, effective_at, is_deleted, source
  ) VALUES (
    v_company_id, v_employee_id, v_nombre, v_apellido, v_cedula, v_tipo_documento,
    v_cargo, v_email, v_estado, now(), v_is_deleted, 'trigger'
  );

  IF (TG_OP = 'DELETE') THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER SET search_path = public;

-- 3) Triggers on employees
DROP TRIGGER IF EXISTS trg_log_employee_identity_aiu ON public.employees;
CREATE TRIGGER trg_log_employee_identity_aiu
AFTER INSERT OR UPDATE ON public.employees
FOR EACH ROW EXECUTE FUNCTION public.log_employee_identity_change();

DROP TRIGGER IF EXISTS trg_log_employee_identity_del ON public.employees;
CREATE TRIGGER trg_log_employee_identity_del
BEFORE DELETE ON public.employees
FOR EACH ROW EXECUTE FUNCTION public.log_employee_identity_change();

-- 4) RPC function: resolve identities as of a payroll period end date
CREATE OR REPLACE FUNCTION public.get_employee_identity_for_period(
  p_employee_ids uuid[],
  p_period_id uuid
)
RETURNS TABLE (
  employee_id uuid,
  nombre text,
  apellido text,
  cedula text,
  tipo_documento text
) AS $$
DECLARE
  v_end_date date;
BEGIN
  SELECT fecha_fin INTO v_end_date
  FROM public.payroll_periods_real
  WHERE id = p_period_id
  LIMIT 1;

  -- If not found, default to today to avoid failing
  IF v_end_date IS NULL THEN
    v_end_date := CURRENT_DATE;
  END IF;

  RETURN QUERY
  WITH ids AS (
    SELECT UNNEST(p_employee_ids) AS id
  ),
  last_ledger AS (
    SELECT l.employee_id,
           l.nombre,
           l.apellido,
           l.cedula,
           l.tipo_documento,
           ROW_NUMBER() OVER (PARTITION BY l.employee_id ORDER BY l.effective_at DESC) AS rn
    FROM public.employee_identity_ledger l
    JOIN ids ON ids.id = l.employee_id
    WHERE l.effective_at <= (v_end_date + INTERVAL '1 day')
  )
  SELECT 
    ids.id AS employee_id,
    COALESCE(ll.nombre, e.nombre) AS nombre,
    COALESCE(ll.apellido, e.apellido) AS apellido,
    COALESCE(ll.cedula, e.cedula) AS cedula,
    COALESCE(ll.tipo_documento, e.tipo_documento, 'CC') AS tipo_documento
  FROM ids
  LEFT JOIN last_ledger ll ON ll.employee_id = ids.id AND ll.rn = 1
  LEFT JOIN public.employees e ON e.id = ids.id;
END;
$$ LANGUAGE plpgsql STABLE SET search_path = public;

-- Ensure no UPDATE/DELETE are allowed by lack of policies
