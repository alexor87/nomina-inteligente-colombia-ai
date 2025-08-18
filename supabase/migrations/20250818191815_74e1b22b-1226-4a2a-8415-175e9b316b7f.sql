
-- 1) Tabla de provisiones por período (por empleado y tipo de prestación)
CREATE TABLE IF NOT EXISTS public.social_benefit_provisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  period_id uuid NOT NULL REFERENCES public.payroll_periods_real(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id),
  benefit_type text NOT NULL, -- 'cesantias' | 'prima' | 'intereses_cesantias'
  -- Bases y desglose para auditoría
  base_salary numeric NOT NULL DEFAULT 0,            -- salario fijo del período
  variable_average numeric NOT NULL DEFAULT 0,       -- promedio de variables constitutivas aplicadas
  transport_allowance numeric NOT NULL DEFAULT 0,    -- aux. transporte incluido cuando aplique
  other_included numeric NOT NULL DEFAULT 0,         -- otros conceptos constitutivos incluidos en base
  calculation_breakdown jsonb,                       -- lista y detalle de conceptos incluidos/excluidos
  days_count integer NOT NULL DEFAULT 0,             -- días causados del empleado en el período
  provision_amount numeric NOT NULL DEFAULT 0,       -- valor provisionado del período
  calculation_method text NOT NULL DEFAULT 'days_over_360', -- referencia de fórmula
  source text NOT NULL DEFAULT 'payroll_closure',    -- orígen del cálculo
  calculated_by uuid,                                -- usuario que disparó el proceso
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, period_id, employee_id, benefit_type)
);

-- Índices de consulta
CREATE INDEX IF NOT EXISTS idx_sbp_company ON public.social_benefit_provisions(company_id);
CREATE INDEX IF NOT EXISTS idx_sbp_period ON public.social_benefit_provisions(period_id);
CREATE INDEX IF NOT EXISTS idx_sbp_employee ON public.social_benefit_provisions(employee_id);
CREATE INDEX IF NOT EXISTS idx_sbp_benefit_type ON public.social_benefit_provisions(benefit_type);

-- RLS
ALTER TABLE public.social_benefit_provisions ENABLE ROW LEVEL SECURITY;

-- Políticas RLS: ver e insertar dentro de la empresa del usuario
CREATE POLICY IF NOT EXISTS "Users can view provisions for their company"
  ON public.social_benefit_provisions
  FOR SELECT
  USING (company_id = public.get_current_user_company_id());

CREATE POLICY IF NOT EXISTS "Users can insert provisions for their company"
  ON public.social_benefit_provisions
  FOR INSERT
  WITH CHECK (company_id = public.get_current_user_company_id());

CREATE POLICY IF NOT EXISTS "Users can update provisions for their company"
  ON public.social_benefit_provisions
  FOR UPDATE
  USING (company_id = public.get_current_user_company_id())
  WITH CHECK (company_id = public.get_current_user_company_id());

-- Trigger: updated_at
CREATE TRIGGER tr_sbp_updated_at
  BEFORE UPDATE ON public.social_benefit_provisions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Validación por trigger: tipos, montos y días
CREATE OR REPLACE FUNCTION public.validate_social_benefit_provision()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- benefit_type restringido
  IF NEW.benefit_type NOT IN ('cesantias','prima','intereses_cesantias') THEN
    RAISE EXCEPTION 'Tipo de prestación inválido: %', NEW.benefit_type;
  END IF;
  -- coherencias básicas
  IF NEW.days_count < 0 THEN
    RAISE EXCEPTION 'Días causados no pueden ser negativos';
  END IF;
  IF NEW.provision_amount < 0 THEN
    RAISE EXCEPTION 'La provisión no puede ser negativa';
  END IF;
  -- empresa consistente con periodo y empleado
  IF NOT EXISTS (
    SELECT 1 FROM public.payroll_periods_real p
    WHERE p.id = NEW.period_id AND p.company_id = NEW.company_id
  ) THEN
    RAISE EXCEPTION 'El período no pertenece a la empresa indicada';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.id = NEW.employee_id AND e.company_id = NEW.company_id
  ) THEN
    RAISE EXCEPTION 'El empleado no pertenece a la empresa indicada';
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS tr_sbp_validate ON public.social_benefit_provisions;
CREATE TRIGGER tr_sbp_validate
  BEFORE INSERT OR UPDATE ON public.social_benefit_provisions
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_social_benefit_provision();


-- 2) Tabla de "settlements" (pagos/cierres legales) vs sumatoria de provisiones
CREATE TABLE IF NOT EXISTS public.social_benefit_settlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  employee_id uuid NOT NULL REFERENCES public.employees(id),
  settlement_type text NOT NULL, -- 'cesantias' | 'prima' | 'intereses_cesantias'
  period_range_start date NOT NULL,
  period_range_end date NOT NULL,
  settlement_date date NOT NULL DEFAULT CURRENT_DATE,
  gross_amount numeric NOT NULL DEFAULT 0,       -- cálculo legal del ciclo
  provisions_sum numeric NOT NULL DEFAULT 0,    -- sumatoria de provisiones dentro del ciclo
  adjustment_amount numeric NOT NULL DEFAULT 0, -- gross - provisions_sum
  period_ids uuid[] NOT NULL DEFAULT '{}',      -- períodos cubiertos en el ciclo (para trazabilidad)
  calculation_basis jsonb,                      -- detalle metodológico
  status text NOT NULL DEFAULT 'draft',         -- draft | confirmed | paid
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, employee_id, settlement_type, period_range_start, period_range_end)
);

CREATE INDEX IF NOT EXISTS idx_sbs_company ON public.social_benefit_settlements(company_id);
CREATE INDEX IF NOT EXISTS idx_sbs_employee ON public.social_benefit_settlements(employee_id);
CREATE INDEX IF NOT EXISTS idx_sbs_type ON public.social_benefit_settlements(settlement_type);

ALTER TABLE public.social_benefit_settlements ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Users can view settlements for their company"
  ON public.social_benefit_settlements
  FOR SELECT
  USING (company_id = public.get_current_user_company_id());

CREATE POLICY IF NOT EXISTS "Users can insert settlements for their company"
  ON public.social_benefit_settlements
  FOR INSERT
  WITH CHECK (company_id = public.get_current_user_company_id());

CREATE POLICY IF NOT EXISTS "Users can update settlements for their company"
  ON public.social_benefit_settlements
  FOR UPDATE
  USING (company_id = public.get_current_user_company_id())
  WITH CHECK (company_id = public.get_current_user_company_id());

CREATE TRIGGER tr_sbs_updated_at
  BEFORE UPDATE ON public.social_benefit_settlements
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Validación sencilla
CREATE OR REPLACE FUNCTION public.validate_social_benefit_settlement()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.settlement_type NOT IN ('cesantias','prima','intereses_cesantias') THEN
    RAISE EXCEPTION 'Tipo de settlement inválido: %', NEW.settlement_type;
  END IF;
  IF NEW.gross_amount < 0 OR NEW.provisions_sum < 0 THEN
    RAISE EXCEPTION 'Montos no pueden ser negativos';
  END IF;
  IF NEW.period_range_start > NEW.period_range_end THEN
    RAISE EXCEPTION 'Rango de periodos inválido';
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS tr_sbs_validate ON public.social_benefit_settlements;
CREATE TRIGGER tr_sbs_validate
  BEFORE INSERT OR UPDATE ON public.social_benefit_settlements
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_social_benefit_settlement();


-- 3) Detector: provisiones faltantes por período liquidado (evita duplicados)
CREATE OR REPLACE FUNCTION public.detect_social_benefits_provisions(p_period_id uuid)
RETURNS TABLE(
  employee_id uuid,
  benefit_type text,
  days_count integer,
  reason text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_period RECORD;
BEGIN
  -- Obtener el periodo
  SELECT * INTO v_period
  FROM public.payroll_periods_real
  WHERE id = p_period_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Período % no encontrado', p_period_id;
  END IF;

  -- Por política, se provisiona SIEMPRE cesantías, prima e intereses por cada período liquidado
  -- (días causados > 0), evitando duplicados si ya existe una provisión para ese empleado/beneficio/período.
  RETURN QUERY
  WITH emp_period AS (
    SELECT 
      p.company_id,
      pr.employee_id,
      COALESCE(p.dias_trabajados, public.calculate_worked_days_for_period(v_period.tipo_periodo::text, v_period.fecha_inicio, v_period.fecha_fin))::int AS days_count
    FROM public.payrolls p
    JOIN public.payroll_periods_real v ON v.id = p.period_id
    JOIN public.payrolls pr ON pr.id = p.id -- alias solo para claridad (employee_id ya en p)
    WHERE p.period_id = p_period_id
      AND p.company_id = v_period.company_id
  ), base AS (
    SELECT DISTINCT employee_id, days_count
    FROM emp_period
    WHERE days_count > 0
  ), needed AS (
    SELECT employee_id, days_count, unnest(ARRAY['cesantias','prima','intereses_cesantias']::text[]) AS benefit_type
    FROM base
  ), missing AS (
    SELECT n.*
    FROM needed n
    LEFT JOIN public.social_benefit_provisions sbp
      ON sbp.company_id = v_period.company_id
     AND sbp.period_id = p_period_id
     AND sbp.employee_id = n.employee_id
     AND sbp.benefit_type = n.benefit_type
    WHERE sbp.id IS NULL
  )
  SELECT employee_id, benefit_type, days_count, 'provision_missing'::text AS reason
  FROM missing;

END;
$function$;

-- Permitir que el usuario actual filtre por su empresa vía RLS implícitas
