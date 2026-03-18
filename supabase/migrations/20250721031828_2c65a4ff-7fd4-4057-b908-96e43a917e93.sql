-- CORRECCIÓN DEFINITIVA: Fragmentar días correctamente en triggers de sincronización
-- Función para calcular días de intersección entre fechas de ausencia y período
CREATE OR REPLACE FUNCTION calculate_period_intersection_days(
    absence_start DATE,
    absence_end DATE,
    period_start DATE,
    period_end DATE
) RETURNS INTEGER AS $$
DECLARE
    intersection_start DATE;
    intersection_end DATE;
    intersection_days INTEGER;
BEGIN
    -- Calcular intersección real
    intersection_start := GREATEST(absence_start, period_start);
    intersection_end := LEAST(absence_end, period_end);
    
    -- Si no hay intersección, retornar 0
    IF intersection_start > intersection_end THEN
        RETURN 0;
    END IF;
    
    -- Calcular días de intersección (inclusive)
    intersection_days := (intersection_end - intersection_start) + 1;
    
    RETURN GREATEST(intersection_days, 0);
END;
$$ LANGUAGE plpgsql;

-- CORREGIR trigger sync_vacation_to_novedad con fragmentación correcta
CREATE OR REPLACE FUNCTION sync_vacation_to_novedad()
RETURNS TRIGGER AS $$
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
            -- Obtener datos del empleado
            SELECT e.company_id, e.salario_base 
            INTO company_id_var, salary_base
            FROM employees e 
            WHERE e.id = NEW.employee_id;
            
            daily_salary := COALESCE(salary_base / 30.0, 0);
            
            -- Si tiene período asignado, calcular fragmentación
            IF NEW.processed_in_period_id IS NOT NULL THEN
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
            ELSE
                -- Si no hay período, usar días completos
                total_days := COALESCE(NEW.days_count, 0);
            END IF;
            
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
                total_days, -- Usar días fragmentados
                calculated_value, -- Usar valor proporcional
                COALESCE(NEW.observations, ''), false,
                NEW.created_at, NEW.updated_at, NEW.created_by
            ) ON CONFLICT (id) DO UPDATE SET
                empleado_id = EXCLUDED.empleado_id,
                periodo_id = EXCLUDED.periodo_id,
                tipo_novedad = EXCLUDED.tipo_novedad,
                subtipo = EXCLUDED.subtipo,
                fecha_inicio = EXCLUDED.fecha_inicio,
                fecha_fin = EXCLUDED.fecha_fin,
                dias = EXCLUDED.dias, -- Actualizar días fragmentados
                valor = EXCLUDED.valor, -- Actualizar valor proporcional
                observacion = EXCLUDED.observacion,
                constitutivo_salario = EXCLUDED.constitutivo_salario,
                updated_at = EXCLUDED.updated_at,
                creado_por = EXCLUDED.creado_por;
                
            RAISE NOTICE 'Fragmentación aplicada: Ausencia % días, Período % días, Valor: %', 
                NEW.days_count, total_days, calculated_value;
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
$$ LANGUAGE plpgsql;

-- FUNCIÓN para corregir registros existentes mal fragmentados
CREATE OR REPLACE FUNCTION fix_malformed_fragmented_absences()
RETURNS TEXT AS $$
DECLARE
    novedad_record RECORD;
    period_info RECORD;
    intersection_days INTEGER;
    corrected_value NUMERIC;
    daily_salary NUMERIC;
    salary_base NUMERIC;
    corrected_count INTEGER := 0;
BEGIN
    -- Procesar todas las novedades de ausencias que tienen período asignado
    FOR novedad_record IN
        SELECT pn.*, e.salario_base 
        FROM payroll_novedades pn
        JOIN employees e ON pn.empleado_id = e.id
        WHERE pn.tipo_novedad IN ('vacaciones', 'licencia_remunerada', 'licencia_no_remunerada', 'incapacidad', 'ausencia')
        AND pn.periodo_id IS NOT NULL
        AND pn.fecha_inicio IS NOT NULL 
        AND pn.fecha_fin IS NOT NULL
    LOOP
        -- Obtener datos del período
        SELECT fecha_inicio, fecha_fin 
        INTO period_info
        FROM payroll_periods_real 
        WHERE id = novedad_record.periodo_id;
        
        IF period_info IS NOT NULL THEN
            -- Calcular días de intersección correctos
            intersection_days := calculate_period_intersection_days(
                novedad_record.fecha_inicio,
                novedad_record.fecha_fin,
                period_info.fecha_inicio,
                period_info.fecha_fin
            );
            
            -- Solo corregir si los días son diferentes
            IF intersection_days != novedad_record.dias THEN
                daily_salary := COALESCE(novedad_record.salario_base / 30.0, 0);
                
                -- Recalcular valor proporcional
                CASE novedad_record.tipo_novedad
                    WHEN 'vacaciones', 'licencia_remunerada' THEN
                        corrected_value := daily_salary * intersection_days;
                    WHEN 'incapacidad' THEN
                        corrected_value := CASE 
                            WHEN intersection_days <= 2 THEN 0
                            ELSE daily_salary * (intersection_days - 2) * 0.6667
                        END;
                    WHEN 'ausencia' THEN
                        corrected_value := -(daily_salary * intersection_days);
                    WHEN 'licencia_no_remunerada' THEN
                        corrected_value := 0;
                    ELSE
                        corrected_value := 0;
                END CASE;
                
                -- Actualizar registro con valores correctos
                UPDATE payroll_novedades 
                SET 
                    dias = intersection_days,
                    valor = corrected_value,
                    updated_at = now()
                WHERE id = novedad_record.id;
                
                corrected_count := corrected_count + 1;
                
                RAISE NOTICE 'Corregida ausencia ID: % - Días: % -> %, Valor: % -> %', 
                    novedad_record.id, novedad_record.dias, intersection_days, 
                    novedad_record.valor, corrected_value;
            END IF;
        END IF;
    END LOOP;
    
    RETURN format('Corrección completada: %s registros actualizados', corrected_count);
END;
$$ LANGUAGE plpgsql;

-- Ejecutar corrección inmediata
SELECT fix_malformed_fragmented_absences();

-- Documentación
COMMENT ON FUNCTION calculate_period_intersection_days(DATE, DATE, DATE, DATE) IS 
'Calcula días exactos de intersección entre fechas de ausencia y período para fragmentación correcta.';

COMMENT ON FUNCTION sync_vacation_to_novedad() IS 
'CORRECCIÓN DEFINITIVA: Aplica fragmentación correcta de días y valores proporcionales para ausencias multi-período.';

COMMENT ON FUNCTION fix_malformed_fragmented_absences() IS 
'Función de corrección única para actualizar registros existentes con fragmentación incorrecta.';