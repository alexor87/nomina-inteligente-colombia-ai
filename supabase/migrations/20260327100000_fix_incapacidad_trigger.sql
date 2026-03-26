-- ============================================================================
-- FIX: Cálculo de incapacidad en trigger sync_absence_to_novedad
--
-- Problemas corregidos:
-- 1. Días 1-2 devolvía $0 → ahora devuelve 100% del salario diario (empleador)
-- 2. No aplicaba piso SMLDV → ahora usa GREATEST(66.67%, SMLDV)
-- 3. No distinguía incapacidad laboral vs general
-- 4. Obtiene SMLV dinámicamente de company_payroll_configurations
-- ============================================================================

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
    -- Variables para incapacidad
    smlv_value NUMERIC;
    smldv NUMERIC;
    daily_66 NUMERIC;
    applied_daily NUMERIC;
    absence_year TEXT;
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

            -- Obtener SMLV para el año de la ausencia
            absence_year := EXTRACT(YEAR FROM NEW.start_date)::TEXT;

            -- Intentar obtener de company_payroll_configurations
            SELECT cpc.salary_min INTO smlv_value
            FROM company_payroll_configurations cpc
            WHERE cpc.company_id = company_id_var
              AND cpc.year = absence_year;

            -- Fallback por año si no hay config de empresa
            IF smlv_value IS NULL THEN
                smlv_value := CASE EXTRACT(YEAR FROM NEW.start_date)::INT
                    WHEN 2026 THEN 1750905
                    WHEN 2025 THEN 1423500
                    WHEN 2024 THEN 1300000
                    WHEN 2023 THEN 1160000
                    ELSE 1750905
                END;
            END IF;

            -- Calcular valor proporcional según tipo de ausencia
            CASE NEW.type
                WHEN 'vacaciones', 'licencia_remunerada' THEN
                    calculated_value := daily_salary * total_days;

                WHEN 'incapacidad' THEN
                    -- Incapacidad laboral (ARL): 100% desde día 1
                    IF COALESCE(NEW.subtipo, 'general') IN ('laboral', 'arl', 'accidente_laboral', 'riesgo_laboral') THEN
                        calculated_value := daily_salary * total_days;
                    ELSE
                        -- Incapacidad general (EPS):
                        -- Días 1-2: empleador paga 100%
                        -- Días 3+: EPS paga 66.67% con piso SMLDV
                        smldv := smlv_value / 30.0;
                        daily_66 := daily_salary * 0.6667;
                        applied_daily := GREATEST(daily_66, smldv);

                        IF total_days <= 2 THEN
                            calculated_value := daily_salary * total_days;
                        ELSE
                            calculated_value := (daily_salary * 2) + (applied_daily * (total_days - 2));
                        END IF;
                    END IF;

                WHEN 'ausencia' THEN
                    calculated_value := -(daily_salary * total_days);
                WHEN 'licencia_no_remunerada' THEN
                    calculated_value := 0;
                ELSE
                    calculated_value := 0;
            END CASE;

            calculated_value := ROUND(calculated_value);

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

            RAISE NOTICE 'Ausencia sincronizada: % días, Valor: %, SMLV: %', total_days, calculated_value, smlv_value;
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
