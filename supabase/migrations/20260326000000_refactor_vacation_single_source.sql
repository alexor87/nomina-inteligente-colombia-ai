-- ============================================================================
-- REFACTOR: Vacaciones como fuente única de verdad
--
-- Problema: sync_novedad_to_vacation() no tiene SECURITY DEFINER, causando
-- error RLS al registrar vacaciones desde la liquidación de nómina.
--
-- Solución: Eliminar sincronización bidireccional. employee_vacation_periods
-- es la fuente única. El trigger sync_vacation_to_novedad (con SECURITY DEFINER)
-- auto-crea el registro en payroll_novedades para el motor de cálculo.
-- ============================================================================

-- 1. Eliminar trigger y función del sync inverso (novedad → vacation)
DROP TRIGGER IF EXISTS trigger_sync_novedad_to_vacation ON payroll_novedades;
DROP FUNCTION IF EXISTS public.sync_novedad_to_vacation();

-- 2. Recrear sync_vacation_to_novedad con SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.sync_vacation_to_novedad()
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
    vacation_types novedad_type[] := ARRAY['vacaciones', 'licencia_remunerada', 'licencia_no_remunerada', 'incapacidad', 'ausencia'];
    _recursion_guard BOOLEAN;
BEGIN
    -- PROTECCIÓN CONTRA RECURSIÓN
    SELECT current_setting('app.sync_in_progress', true) INTO _recursion_guard;
    IF _recursion_guard = 'true' THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    PERFORM set_config('app.sync_in_progress', 'true', true);

    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        IF NEW.type = ANY(vacation_types) THEN
            -- VALIDACIÓN CLAVE: Solo sincronizar si tiene período asignado
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

            -- Usar días de intersección en lugar de días totales
            total_days := intersection_days;

            -- Calcular valor proporcional basado en días fragmentados
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

            -- Insertar/actualizar con días y valor fragmentados
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

            RAISE NOTICE 'Ausencia sincronizada: % días fragmentados, Valor: %', total_days, calculated_value;
        END IF;

        PERFORM set_config('app.sync_in_progress', 'false', true);
        RETURN NEW;
    END IF;

    IF TG_OP = 'DELETE' THEN
        IF OLD.type = ANY(vacation_types) THEN
            DELETE FROM payroll_novedades WHERE id = OLD.id;
            RAISE NOTICE 'Eliminada novedad fragmentada ID: %', OLD.id;
        END IF;

        PERFORM set_config('app.sync_in_progress', 'false', true);
        RETURN OLD;
    END IF;

    PERFORM set_config('app.sync_in_progress', 'false', true);
    RETURN NULL;
END;
$function$;

-- 3. Sincronizar datos huérfanos: novedades de ausencia sin registro en employee_vacation_periods
INSERT INTO employee_vacation_periods (
    id, employee_id, company_id, type, subtipo,
    start_date, end_date, days_count, observations,
    status, created_by, processed_in_period_id,
    created_at, updated_at
)
SELECT
    pn.id, pn.empleado_id, pn.company_id, pn.tipo_novedad, pn.subtipo,
    pn.fecha_inicio, pn.fecha_fin, COALESCE(pn.dias, 0), COALESCE(pn.observacion, ''),
    CASE
        WHEN ppr.estado = 'cerrado' THEN 'liquidado'
        ELSE 'pendiente'
    END,
    pn.creado_por, pn.periodo_id,
    pn.created_at, pn.updated_at
FROM payroll_novedades pn
LEFT JOIN payroll_periods_real ppr ON ppr.id = pn.periodo_id
WHERE pn.tipo_novedad IN ('vacaciones', 'licencia_remunerada', 'licencia_no_remunerada', 'incapacidad', 'ausencia')
AND pn.fecha_inicio IS NOT NULL
AND pn.fecha_fin IS NOT NULL
AND NOT EXISTS (
    SELECT 1 FROM employee_vacation_periods evp WHERE evp.id = pn.id
)
ON CONFLICT (id) DO NOTHING;
