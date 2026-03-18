
-- FASE 1: Crear función para sincronizar vacaciones hacia novedades
CREATE OR REPLACE FUNCTION sync_vacation_to_novedad()
RETURNS TRIGGER AS $$
DECLARE
    company_id_var UUID;
    salary_base NUMERIC;
    calculated_value NUMERIC;
    daily_salary NUMERIC;
BEGIN
    -- Obtener company_id y salario base del empleado
    SELECT e.company_id, e.salario_base 
    INTO company_id_var, salary_base
    FROM employees e 
    WHERE e.id = COALESCE(NEW.employee_id, OLD.employee_id);
    
    -- Calcular salario diario
    daily_salary := salary_base / 30.0;
    
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        -- Calcular valor según el tipo de ausencia/vacación
        CASE NEW.type
            WHEN 'vacaciones', 'licencia_remunerada' THEN
                calculated_value := daily_salary * NEW.days_count;
            WHEN 'incapacidad' THEN
                -- Incapacidad: primeros 2 días sin pago, resto al 66.67%
                calculated_value := CASE 
                    WHEN NEW.days_count <= 2 THEN 0
                    ELSE daily_salary * (NEW.days_count - 2) * 0.6667
                END;
            WHEN 'ausencia' THEN
                -- Ausencia: descuento (valor negativo)
                calculated_value := -(daily_salary * NEW.days_count);
            WHEN 'licencia_no_remunerada' THEN
                calculated_value := 0;
            ELSE
                calculated_value := 0;
        END CASE;
        
        -- Insertar o actualizar en payroll_novedades
        INSERT INTO payroll_novedades (
            id,
            company_id,
            empleado_id,
            periodo_id,
            tipo_novedad,
            subtipo,
            fecha_inicio,
            fecha_fin,
            dias,
            valor,
            observacion,
            created_at,
            updated_at,
            creado_por
        ) VALUES (
            NEW.id, -- Usar el mismo ID para sincronización
            company_id_var,
            NEW.employee_id,
            NEW.processed_in_period_id,
            NEW.type::novedad_type,
            NEW.subtipo,
            NEW.start_date,
            NEW.end_date,
            NEW.days_count,
            calculated_value,
            COALESCE(NEW.observations, ''),
            NEW.created_at,
            NEW.updated_at,
            NEW.created_by
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
            updated_at = EXCLUDED.updated_at;
            
        RETURN NEW;
    END IF;
    
    IF TG_OP = 'DELETE' THEN
        -- Eliminar la novedad correspondiente
        DELETE FROM payroll_novedades WHERE id = OLD.id;
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- FASE 2: Crear función para sincronizar novedades hacia vacaciones
CREATE OR REPLACE FUNCTION sync_novedad_to_vacation()
RETURNS TRIGGER AS $$
DECLARE
    vacation_types novedad_type[] := ARRAY['vacaciones', 'licencia_remunerada', 'licencia_no_remunerada', 'incapacidad', 'ausencia'];
BEGIN
    -- Solo sincronizar si es un tipo relacionado con vacaciones/ausencias
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        IF NEW.tipo_novedad = ANY(vacation_types) THEN
            INSERT INTO employee_vacation_periods (
                id,
                employee_id,
                company_id,
                type,
                subtipo,
                start_date,
                end_date,
                days_count,
                observations,
                status,
                created_by,
                processed_in_period_id,
                created_at,
                updated_at
            ) VALUES (
                NEW.id, -- Usar el mismo ID para sincronización
                NEW.empleado_id,
                NEW.company_id,
                NEW.tipo_novedad,
                NEW.subtipo,
                NEW.fecha_inicio,
                NEW.fecha_fin,
                COALESCE(NEW.dias, 0),
                COALESCE(NEW.observacion, ''),
                CASE 
                    WHEN NEW.periodo_id IS NOT NULL THEN 'liquidada'
                    ELSE 'pendiente'
                END,
                NEW.creado_por,
                NEW.periodo_id,
                NEW.created_at,
                NEW.updated_at
            ) ON CONFLICT (id) DO UPDATE SET
                employee_id = EXCLUDED.employee_id,
                company_id = EXCLUDED.company_id,
                type = EXCLUDED.type,
                subtipo = EXCLUDED.subtipo,
                start_date = EXCLUDED.start_date,
                end_date = EXCLUDED.end_date,
                days_count = EXCLUDED.days_count,
                observations = EXCLUDED.observations,
                status = EXCLUDED.status,
                processed_in_period_id = EXCLUDED.processed_in_period_id,
                updated_at = EXCLUDED.updated_at;
        END IF;
        RETURN NEW;
    END IF;
    
    IF TG_OP = 'DELETE' THEN
        IF OLD.tipo_novedad = ANY(vacation_types) THEN
            -- Eliminar la vacación correspondiente
            DELETE FROM employee_vacation_periods WHERE id = OLD.id;
        END IF;
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- FASE 3: Crear triggers para sincronización bidireccional
DROP TRIGGER IF EXISTS trigger_sync_vacation_to_novedad ON employee_vacation_periods;
CREATE TRIGGER trigger_sync_vacation_to_novedad
    AFTER INSERT OR UPDATE OR DELETE ON employee_vacation_periods
    FOR EACH ROW EXECUTE FUNCTION sync_vacation_to_novedad();

DROP TRIGGER IF EXISTS trigger_sync_novedad_to_vacation ON payroll_novedades;
CREATE TRIGGER trigger_sync_novedad_to_vacation
    AFTER INSERT OR UPDATE OR DELETE ON payroll_novedades
    FOR EACH ROW EXECUTE FUNCTION sync_novedad_to_vacation();

-- FASE 4: Función para sincronizar datos existentes
CREATE OR REPLACE FUNCTION sync_existing_vacation_data()
RETURNS TEXT AS $$
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
$$ LANGUAGE plpgsql;

-- FASE 5: Ejecutar sincronización de datos existentes
SELECT sync_existing_vacation_data();

-- FASE 6: Actualizar el estado de realtime para ambas tablas
ALTER TABLE employee_vacation_periods REPLICA IDENTITY FULL;
ALTER TABLE payroll_novedades REPLICA IDENTITY FULL;

-- Verificar que las tablas estén en la publicación de realtime
DO $$
BEGIN
    -- Añadir a publicación realtime si no están
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'employee_vacation_periods'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE employee_vacation_periods;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'payroll_novedades'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE payroll_novedades;
    END IF;
END $$;
