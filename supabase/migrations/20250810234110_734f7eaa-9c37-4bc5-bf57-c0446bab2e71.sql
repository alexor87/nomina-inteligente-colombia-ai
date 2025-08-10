-- Micro-migración 2/3: Fijar search_path en sync_existing_vacation_data
CREATE OR REPLACE FUNCTION public.sync_existing_vacation_data()
RETURNS text
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
    vacation_record RECORD;
    company_id_var UUID;
    salary_base NUMERIC;
    calculated_value NUMERIC;
    daily_salary NUMERIC;
    synced_count INTEGER := 0;
BEGIN
    -- Sincronizar vacaciones existentes que no tienen novedad correspondiente
    FOR vacation_record IN
        SELECT evp.* 
        FROM employee_vacation_periods evp
        WHERE NOT EXISTS (
            SELECT 1 FROM payroll_novedades pn 
            WHERE pn.id = evp.id
        )
    LOOP
        -- Obtener datos del empleado
        SELECT e.company_id, e.salario_base 
        INTO company_id_var, salary_base
        FROM employees e 
        WHERE e.id = vacation_record.employee_id;
        
        -- Calcular valor
        daily_salary := salary_base / 30.0;
        CASE vacation_record.type
            WHEN 'vacaciones', 'licencia_remunerada' THEN
                calculated_value := daily_salary * vacation_record.days_count;
            WHEN 'incapacidad' THEN
                calculated_value := CASE 
                    WHEN vacation_record.days_count <= 2 THEN 0
                    ELSE daily_salary * (vacation_record.days_count - 2) * 0.6667
                END;
            WHEN 'ausencia' THEN
                calculated_value := -(daily_salary * vacation_record.days_count);
            ELSE
                calculated_value := 0;
        END CASE;
        
        -- Insertar novedad
        INSERT INTO payroll_novedades (
            id, company_id, empleado_id, periodo_id, tipo_novedad, subtipo,
            fecha_inicio, fecha_fin, dias, valor, observacion,
            created_at, updated_at, creado_por
        ) VALUES (
            vacation_record.id, company_id_var, vacation_record.employee_id,
            vacation_record.processed_in_period_id, vacation_record.type::novedad_type,
            vacation_record.subtipo, vacation_record.start_date, vacation_record.end_date,
            vacation_record.days_count, calculated_value, vacation_record.observations,
            vacation_record.created_at, vacation_record.updated_at, vacation_record.created_by
        );
        
        synced_count := synced_count + 1;
    END LOOP;
    
    RETURN format('Sincronizados %s registros de vacaciones existentes', synced_count);
END;
$function$;