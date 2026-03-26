-- ============================================================================
-- RENAME: employee_vacation_periods → employee_absences
-- ENRICH: Agregar campos específicos para incapacidad
--
-- Esta migración renombra la tabla de ausencias para reflejar que almacena
-- TODOS los tipos de ausencia (vacaciones, licencias, incapacidades, ausencias),
-- no solo vacaciones. También agrega campos enriquecidos para incapacidades.
-- ============================================================================

-- 1. Drop triggers existentes en la tabla vieja
DROP TRIGGER IF EXISTS trigger_sync_vacation_to_novedad ON employee_vacation_periods;
DROP TRIGGER IF EXISTS update_vacation_periods_updated_at ON employee_vacation_periods;

-- 2. Renombrar tabla (preserva datos, constraints, FK references)
ALTER TABLE public.employee_vacation_periods RENAME TO employee_absences;

-- 3. Agregar columnas de enriquecimiento para incapacidad
ALTER TABLE public.employee_absences
  ADD COLUMN IF NOT EXISTS payer_type TEXT DEFAULT NULL
    CHECK (payer_type IN ('employer', 'eps', 'arl')),
  ADD COLUMN IF NOT EXISTS medical_certificate_url TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS diagnosis TEXT DEFAULT NULL;

-- 4. Renombrar indexes
ALTER INDEX IF EXISTS idx_vacation_periods_employee RENAME TO idx_absences_employee;
ALTER INDEX IF EXISTS idx_vacation_periods_company RENAME TO idx_absences_company;
ALTER INDEX IF EXISTS idx_vacation_periods_dates RENAME TO idx_absences_dates;
ALTER INDEX IF EXISTS idx_vacation_periods_status RENAME TO idx_absences_status;
ALTER INDEX IF EXISTS idx_employee_vacation_periods_subtipo RENAME TO idx_absences_subtipo;

-- 5. Recrear RLS policies con nombres nuevos
DROP POLICY IF EXISTS "Users can view company vacation periods" ON public.employee_absences;
DROP POLICY IF EXISTS "Users can create company vacation periods" ON public.employee_absences;
DROP POLICY IF EXISTS "Users can update company vacation periods" ON public.employee_absences;
DROP POLICY IF EXISTS "Users can delete company vacation periods" ON public.employee_absences;

CREATE POLICY "Users can view company absences"
  ON public.employee_absences
  FOR SELECT
  USING (company_id = get_current_user_company_id());

CREATE POLICY "Users can create company absences"
  ON public.employee_absences
  FOR INSERT
  WITH CHECK (company_id = get_current_user_company_id() AND created_by = auth.uid());

CREATE POLICY "Users can update company absences"
  ON public.employee_absences
  FOR UPDATE
  USING (company_id = get_current_user_company_id())
  WITH CHECK (company_id = get_current_user_company_id());

CREATE POLICY "Users can delete company absences"
  ON public.employee_absences
  FOR DELETE
  USING (company_id = get_current_user_company_id() AND status = 'pendiente');

-- 6. Recrear trigger updated_at
CREATE TRIGGER update_absences_updated_at
  BEFORE UPDATE ON public.employee_absences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 7. Recrear función de sync con nombre nuevo (mismo cuerpo, SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.sync_absence_to_novedad()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    company_id_var UUID;
    salary_base NUMERIC;
    calculated_value NUMERIC;
    daily_salary NUMERIC;
    period_info RECORD;
    intersection_days INTEGER;
    total_days INTEGER;
    absence_types novedad_type[] := ARRAY['vacaciones', 'licencia_remunerada', 'licencia_no_remunerada', 'incapacidad', 'ausencia'];
    _recursion_guard BOOLEAN;
BEGIN
    -- PROTECCIÓN CONTRA RECURSIÓN
    SELECT current_setting('app.sync_in_progress', true) INTO _recursion_guard;
    IF _recursion_guard = 'true' THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    PERFORM set_config('app.sync_in_progress', 'true', true);

    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        IF NEW.type = ANY(absence_types) THEN
            -- VALIDACIÓN: Solo sincronizar si tiene período asignado
            IF NEW.processed_in_period_id IS NULL THEN
                RAISE NOTICE 'Ausencia % sin período asignado - no se sincroniza a novedades', NEW.id;
                PERFORM set_config('app.sync_in_progress', 'false', true);
                RETURN NEW;
            END IF;

            -- Obtener datos del empleado
            SELECT e.company_id, e.salario_base
            INTO company_id_var, salary_base
            FROM employees e
            WHERE e.id = NEW.employee_id;

            daily_salary := COALESCE(salary_base / 30.0, 0);

            -- Obtener datos del período
            SELECT fecha_inicio, fecha_fin
            INTO period_info
            FROM payroll_periods_real
            WHERE id = NEW.processed_in_period_id;

            -- Calcular días de intersección entre ausencia y período
            intersection_days := calculate_period_intersection_days(
                NEW.start_date,
                NEW.end_date,
                period_info.fecha_inicio,
                period_info.fecha_fin
            );

            total_days := intersection_days;

            -- Calcular valor proporcional según tipo de ausencia
            CASE NEW.type
                WHEN 'vacaciones', 'licencia_remunerada' THEN
                    calculated_value := daily_salary * total_days;
                WHEN 'incapacidad' THEN
                    calculated_value := CASE
                        WHEN total_days <= 2 THEN 0
                        ELSE daily_salary * (total_days - 2) * 0.6667
                    END;
                WHEN 'ausencia' THEN
                    calculated_value := -(daily_salary * total_days);
                WHEN 'licencia_no_remunerada' THEN
                    calculated_value := 0;
                ELSE
                    calculated_value := 0;
            END CASE;

            -- Insertar/actualizar en payroll_novedades
            INSERT INTO payroll_novedades (
                id, company_id, empleado_id, periodo_id, tipo_novedad, subtipo,
                fecha_inicio, fecha_fin, dias, valor, observacion, constitutivo_salario,
                created_at, updated_at, creado_por
            ) VALUES (
                NEW.id, company_id_var, NEW.employee_id, NEW.processed_in_period_id,
                NEW.type::novedad_type, NEW.subtipo, NEW.start_date, NEW.end_date,
                total_days,
                calculated_value,
                COALESCE(NEW.observations, ''), false,
                NEW.created_at, NEW.updated_at, NEW.created_by
            ) ON CONFLICT (id) DO UPDATE SET
                empleado_id = EXCLUDED.empleado_id,
                periodo_id = EXCLUDED.periodo_id,
                tipo_novedad = EXCLUDED.tipo_novedad,
                subtipo = EXCLUDED.subtipo,
                fecha_inicio = EXCLUDED.fecha_inicio,
                fecha_fin = EXCLUDED.fecha_fin,
                dias = EXCLUDED.dias,
                valor = EXCLUDED.valor,
                observacion = EXCLUDED.observacion,
                constitutivo_salario = EXCLUDED.constitutivo_salario,
                updated_at = EXCLUDED.updated_at,
                creado_por = EXCLUDED.creado_por;

            RAISE NOTICE 'Ausencia sincronizada: % días, Valor: %', total_days, calculated_value;
        END IF;

        PERFORM set_config('app.sync_in_progress', 'false', true);
        RETURN NEW;
    END IF;

    IF TG_OP = 'DELETE' THEN
        IF OLD.type = ANY(absence_types) THEN
            DELETE FROM payroll_novedades WHERE id = OLD.id;
            RAISE NOTICE 'Eliminada novedad ID: %', OLD.id;
        END IF;

        PERFORM set_config('app.sync_in_progress', 'false', true);
        RETURN OLD;
    END IF;

    PERFORM set_config('app.sync_in_progress', 'false', true);
    RETURN NULL;
END;
$function$;

-- 8. Bind trigger a nueva tabla
CREATE TRIGGER trigger_sync_absence_to_novedad
  AFTER INSERT OR UPDATE OR DELETE ON public.employee_absences
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_absence_to_novedad();

-- 9. Drop función vieja
DROP FUNCTION IF EXISTS public.sync_vacation_to_novedad() CASCADE;

-- 10. Index para nueva columna payer_type
CREATE INDEX IF NOT EXISTS idx_absences_payer_type
  ON public.employee_absences(payer_type)
  WHERE payer_type IS NOT NULL;
