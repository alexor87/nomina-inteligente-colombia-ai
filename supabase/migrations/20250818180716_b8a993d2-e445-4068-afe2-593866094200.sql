
-- 1) Tipo enum para prestaciones sociales (idempotente)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'social_benefit_type') THEN
    CREATE TYPE public.social_benefit_type AS ENUM ('cesantias', 'intereses_cesantias', 'prima');
  END IF;
END$$;

-- 2) Tabla historial de cálculos de prestaciones sociales
CREATE TABLE IF NOT EXISTS public.social_benefit_calculations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE RESTRICT,
  benefit_type public.social_benefit_type NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  -- Entrada y salida del cálculo (base y resultados)
  calculation_basis jsonb NOT NULL DEFAULT '{}'::jsonb,
  calculated_values jsonb NOT NULL DEFAULT '{}'::jsonb,
  amount numeric NOT NULL DEFAULT 0,
  estado text NOT NULL DEFAULT 'calculado', -- calculado | aprobado | pagado | anulado (flexible)
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_benefit_calc UNIQUE (company_id, employee_id, benefit_type, period_start, period_end)
);

-- 3) Índices útiles
CREATE INDEX IF NOT EXISTS idx_sbc_company_period ON public.social_benefit_calculations (company_id, period_end DESC);
CREATE INDEX IF NOT EXISTS idx_sbc_employee_type_period ON public.social_benefit_calculations (company_id, employee_id, benefit_type, period_end DESC);

-- 4) Función de validación y normalización (evita incoherencias y agrega advertencias)
CREATE OR REPLACE FUNCTION public.validate_social_benefit_calculation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  emp_company_id uuid;
  v_user_id uuid;
  v_now timestamptz := now();
  start_month int;
  end_month int;
BEGIN
  -- Coherencia de fechas
  IF NEW.period_start > NEW.period_end THEN
    RAISE EXCEPTION 'El inicio del período (%) no puede ser mayor que el fin (%)', NEW.period_start, NEW.period_end;
  END IF;

  -- Asegurar que el empleado existe y obtener su empresa
  SELECT company_id INTO emp_company_id
  FROM public.employees
  WHERE id = NEW.employee_id;

  IF emp_company_id IS NULL THEN
    RAISE EXCEPTION 'Empleado (%) no existe o no tiene company_id', NEW.employee_id;
  END IF;

  -- Forzar company_id a la del empleado si viene nula; si viene distinta, bloquear
  IF NEW.company_id IS NULL THEN
    NEW.company_id := emp_company_id;
  ELSIF NEW.company_id <> emp_company_id THEN
    RAISE EXCEPTION 'El empleado pertenece a otra empresa. employee.company_id=%, NEW.company_id=%', emp_company_id, NEW.company_id;
  END IF;

  -- Advertencias no bloqueantes para períodos no estándar (registradas en security_audit_log)
  start_month := EXTRACT(MONTH FROM NEW.period_start);
  end_month := EXTRACT(MONTH FROM NEW.period_end);

  IF NEW.benefit_type = 'prima' THEN
    -- Períodos típicos: Ene-Jun (cierra en 6) y Jul-Dic (cierra en 12)
    IF end_month NOT IN (6, 12) THEN
      INSERT INTO public.security_audit_log (
        table_name, action, violation_type, query_attempted, additional_data, user_id, company_id, created_at
      ) VALUES (
        'social_benefit_calculations',
        'VALIDATION_WARNING',
        'nonstandard_prima_period',
        'Prima con periodo no estándar',
        jsonb_build_object(
          'period_start', NEW.period_start,
          'period_end', NEW.period_end,
          'benefit_type', NEW.benefit_type
        ),
        auth.uid(),
        NEW.company_id,
        v_now
      );
    END IF;
  ELSIF NEW.benefit_type = 'cesantias' THEN
    -- Típicamente anual (Ene-Dic). Si no cierra en Dic, advertir.
    IF end_month <> 12 THEN
      INSERT INTO public.security_audit_log (
        table_name, action, violation_type, query_attempted, additional_data, user_id, company_id, created_at
      ) VALUES (
        'social_benefit_calculations',
        'VALIDATION_WARNING',
        'nonstandard_cesantias_period',
        'Cesantías con periodo no estándar',
        jsonb_build_object(
          'period_start', NEW.period_start,
          'period_end', NEW.period_end,
          'benefit_type', NEW.benefit_type
        ),
        auth.uid(),
        NEW.company_id,
        v_now
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- 5) Trigger de validación en INSERT/UPDATE
DROP TRIGGER IF EXISTS trg_validate_social_benefit_calculations ON public.social_benefit_calculations;
CREATE TRIGGER trg_validate_social_benefit_calculations
BEFORE INSERT OR UPDATE ON public.social_benefit_calculations
FOR EACH ROW
EXECUTE FUNCTION public.validate_social_benefit_calculation();

-- 6) Trigger para setear created_by si falta (reusa función existente)
DROP TRIGGER IF EXISTS trg_sbc_set_created_by ON public.social_benefit_calculations;
CREATE TRIGGER trg_sbc_set_created_by
BEFORE INSERT ON public.social_benefit_calculations
FOR EACH ROW
EXECUTE FUNCTION public.set_company_created_by();

-- 7) Trigger para updated_at
DROP TRIGGER IF EXISTS trg_sbc_set_updated_at ON public.social_benefit_calculations;
CREATE TRIGGER trg_sbc_set_updated_at
BEFORE UPDATE ON public.social_benefit_calculations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 8) Habilitar RLS y políticas
ALTER TABLE public.social_benefit_calculations ENABLE ROW LEVEL SECURITY;

-- Lectura por empresa
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'social_benefit_calculations' 
      AND policyname = 'Users can view benefit calculations for their company'
  ) THEN
    CREATE POLICY "Users can view benefit calculations for their company"
      ON public.social_benefit_calculations
      FOR SELECT
      USING (company_id = get_current_user_company_id());
  END IF;
END$$;

-- Inserción por empresa + autor y validación de acceso al empleado
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'social_benefit_calculations' 
      AND policyname = 'Users can insert benefit calculations for their company'
  ) THEN
    CREATE POLICY "Users can insert benefit calculations for their company"
      ON public.social_benefit_calculations
      FOR INSERT
      WITH CHECK (
        company_id = get_current_user_company_id()
        AND created_by = auth.uid()
        AND validate_employee_company_access(employee_id) = true
      );
  END IF;
END$$;

-- Actualización por empresa
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'social_benefit_calculations' 
      AND policyname = 'Users can update benefit calculations for their company'
  ) THEN
    CREATE POLICY "Users can update benefit calculations for their company"
      ON public.social_benefit_calculations
      FOR UPDATE
      USING (company_id = get_current_user_company_id())
      WITH CHECK (company_id = get_current_user_company_id());
  END IF;
END$$;
