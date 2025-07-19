
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

-- Crear trigger para sincronizar vacaciones -> novedades
DROP TRIGGER IF EXISTS trigger_sync_vacation_to_novedad ON employee_vacation_periods;
CREATE TRIGGER trigger_sync_vacation_to_novedad
    AFTER INSERT OR UPDATE OR DELETE ON employee_vacation_periods
    FOR EACH ROW EXECUTE FUNCTION sync_vacation_to_novedad();

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

-- Crear trigger para sincronizar novedades -> vacaciones
DROP TRIGGER IF EXISTS trigger_sync_novedad_to_vacation ON payroll_novedades;
CREATE TRIGGER trigger_sync_novedad_to_vacation
    AFTER INSERT OR UPDATE OR DELETE ON payroll_novedades
    FOR EACH ROW EXECUTE FUNCTION sync_novedad_to_vacation();

-- FASE 3: Crear vista unificada para mostrar datos combinados
CREATE OR REPLACE VIEW unified_vacation_novedad_view AS
SELECT 
    'vacation' as source_type,
    evp.id,
    evp.employee_id as empleado_id,
    evp.company_id,
    evp.processed_in_period_id as periodo_id,
    evp.type::text as tipo_novedad,
    evp.subtipo,
    evp.start_date as fecha_inicio,
    evp.end_date as fecha_fin,
    evp.days_count as dias,
    -- Calcular valor estimado para vacaciones
    CASE evp.type
        WHEN 'vacaciones', 'licencia_remunerada' THEN (e.salario_base / 30.0) * evp.days_count
        WHEN 'incapacidad' THEN 
            CASE 
                WHEN evp.days_count <= 2 THEN 0
                ELSE (e.salario_base / 30.0) * (evp.days_count - 2) * 0.6667
            END
        WHEN 'ausencia' THEN -((e.salario_base / 30.0) * evp.days_count)
        ELSE 0
    END as valor,
    evp.observations as observacion,
    evp.status,
    evp.created_by as creado_por,
    evp.created_at,
    evp.updated_at,
    e.nombre as employee_nombre,
    e.apellido as employee_apellido,
    e.cedula as employee_cedula
FROM employee_vacation_periods evp
JOIN employees e ON evp.employee_id = e.id

UNION ALL

SELECT 
    'novedad' as source_type,
    pn.id,
    pn.empleado_id,
    pn.company_id,
    pn.periodo_id,
    pn.tipo_novedad::text,
    pn.subtipo,
    pn.fecha_inicio,
    pn.fecha_fin,
    pn.dias,
    pn.valor,
    pn.observacion,
    CASE 
        WHEN pn.periodo_id IS NOT NULL THEN 'liquidada'
        ELSE 'pendiente'
    END as status,
    pn.creado_por,
    pn.created_at,
    pn.updated_at,
    e.nombre as employee_nombre,
    e.apellido as employee_apellido,
    e.cedula as employee_cedula
FROM payroll_novedades pn
JOIN employees e ON pn.empleado_id = e.id
WHERE pn.tipo_novedad IN ('vacaciones', 'licencia_remunerada', 'licencia_no_remunerada', 'incapacidad', 'ausencia');

-- FASE 4: Habilitar realtime para ambas tablas
ALTER TABLE employee_vacation_periods REPLICA IDENTITY FULL;
ALTER TABLE payroll_novedades REPLICA IDENTITY FULL;

-- Añadir tablas a la publicación de realtime
ALTER PUBLICATION supabase_realtime ADD TABLE employee_vacation_periods;
ALTER PUBLICATION supabase_realtime ADD TABLE payroll_novedades;
