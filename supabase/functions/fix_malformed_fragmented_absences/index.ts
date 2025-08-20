
CREATE OR REPLACE FUNCTION public.fix_malformed_fragmented_absences()
 RETURNS text
 LANGUAGE plpgsql
AS $function$
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
                
                -- ✅ NUEVA LÓGICA: Recalcular valor proporcional con normativa correcta
                CASE novedad_record.tipo_novedad
                    WHEN 'vacaciones', 'licencia_remunerada' THEN
                        corrected_value := daily_salary * intersection_days;
                    WHEN 'incapacidad' THEN
                        -- ✅ NORMATIVA CORREGIDA: Incapacidad general días 1-2 al 100%, días 3+ al 66.67%
                        IF COALESCE(novedad_record.subtipo, 'general') = 'general' THEN
                            IF intersection_days <= 2 THEN
                                corrected_value := daily_salary * intersection_days; -- 100% todos los días
                            ELSE
                                -- Días 1-2 al 100% + días 3+ al 66.67%
                                corrected_value := (daily_salary * 2) + (daily_salary * (intersection_days - 2) * 0.6667);
                            END IF;
                        ELSIF novedad_record.subtipo = 'laboral' THEN
                            corrected_value := daily_salary * intersection_days; -- ARL 100%
                        ELSE
                            corrected_value := daily_salary * intersection_days * 0.6667; -- Fallback conservador
                        END IF;
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
                
                RAISE NOTICE 'Corregida ausencia ID: % - Días: % -> %, Valor: % -> % (Subtipo: %)', 
                    novedad_record.id, novedad_record.dias, intersection_days, 
                    novedad_record.valor, corrected_value, COALESCE(novedad_record.subtipo, 'general');
            END IF;
        END IF;
    END LOOP;
    
    RETURN format('Corrección de incapacidad completada: %s registros actualizados con nueva normativa (días 1-2 al 100%%)', corrected_count);
END;
$function$
