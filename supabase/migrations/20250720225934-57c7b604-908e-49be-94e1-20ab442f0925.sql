
-- SOLUCIÓN KISS: Eliminar recursión infinita entre triggers de sincronización
-- Paso 1: Eliminar ambos triggers que causan el bucle infinito
DROP TRIGGER IF EXISTS trigger_sync_vacation_to_novedad ON employee_vacation_periods;
DROP TRIGGER IF EXISTS trigger_sync_novedad_to_vacation ON payroll_novedades;

-- Paso 2: Crear función mejorada con protección contra recursión
CREATE OR REPLACE FUNCTION sync_vacation_to_novedad()
RETURNS TRIGGER AS $$
DECLARE
    company_id_var UUID;
    salary_base NUMERIC;
    calculated_value NUMERIC;
    daily_salary NUMERIC;
    vacation_types novedad_type[] := ARRAY['vacaciones', 'licencia_remunerada', 'licencia_no_remunerada', 'incapacidad', 'ausencia'];
    _recursion_guard BOOLEAN;
BEGIN
    -- PROTECCIÓN CONTRA RECURSIÓN: Verificar si ya estamos en un contexto de sincronización
    SELECT current_setting('app.sync_in_progress', true) INTO _recursion_guard;
    IF _recursion_guard = 'true' THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    -- Establecer bandera de sincronización en progreso
    PERFORM set_config('app.sync_in_progress', 'true', true);

    -- Manejar INSERT y UPDATE
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        -- Solo sincronizar si es un tipo relacionado con vacaciones/ausencias
        IF NEW.type = ANY(vacation_types) THEN
            -- Obtener company_id y salario base del empleado
            SELECT e.company_id, e.salario_base 
            INTO company_id_var, salary_base
            FROM employees e 
            WHERE e.id = NEW.employee_id;
            
            -- Calcular salario diario
            daily_salary := COALESCE(salary_base / 30.0, 0);
            
            -- Calcular valor según el tipo de ausencia/vacación
            CASE NEW.type
                WHEN 'vacaciones', 'licencia_remunerada' THEN
                    calculated_value := daily_salary * COALESCE(NEW.days_count, 0);
                WHEN 'incapacidad' THEN
                    -- Incapacidad: primeros 2 días sin pago, resto al 66.67%
                    calculated_value := CASE 
                        WHEN COALESCE(NEW.days_count, 0) <= 2 THEN 0
                        ELSE daily_salary * (COALESCE(NEW.days_count, 0) - 2) * 0.6667
                    END;
                WHEN 'ausencia' THEN
                    -- Ausencia: descuento (valor negativo)
                    calculated_value := -(daily_salary * COALESCE(NEW.days_count, 0));
                WHEN 'licencia_no_remunerada' THEN
                    calculated_value := 0;
                ELSE
                    calculated_value := 0;
            END CASE;
            
            -- Insertar o actualizar en payroll_novedades con el mismo ID
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
                NEW.id,
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
                updated_at = EXCLUDED.updated_at,
                creado_por = EXCLUDED.creado_por;
                
            RAISE NOTICE 'Sincronizada vacación -> novedad ID: %, Tipo: %, Valor: %', 
                NEW.id, NEW.type, calculated_value;
        END IF;
        
        -- Limpiar bandera de sincronización
        PERFORM set_config('app.sync_in_progress', 'false', true);
        RETURN NEW;
    END IF;
    
    -- Manejar DELETE
    IF TG_OP = 'DELETE' THEN
        IF OLD.type = ANY(vacation_types) THEN
            -- Eliminar la novedad correspondiente con el mismo ID
            DELETE FROM payroll_novedades WHERE id = OLD.id;
            RAISE NOTICE 'Eliminada novedad sincronizada ID: %', OLD.id;
        END IF;
        
        -- Limpiar bandera de sincronización
        PERFORM set_config('app.sync_in_progress', 'false', true);
        RETURN OLD;
    END IF;
    
    -- Limpiar bandera de sincronización en caso de salida inesperada
    PERFORM set_config('app.sync_in_progress', 'false', true);
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Paso 3: Crear SOLO el trigger vacation -> novedad (unidireccional)
CREATE TRIGGER trigger_sync_vacation_to_novedad
    AFTER INSERT OR UPDATE OR DELETE ON employee_vacation_periods
    FOR EACH ROW EXECUTE FUNCTION sync_vacation_to_novedad();

-- Paso 4: Verificar que solo quede UN trigger activo
DO $$
BEGIN
    -- Verificar que el trigger principal esté activo
    IF EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'trigger_sync_vacation_to_novedad' 
        AND tgrelid = 'employee_vacation_periods'::regclass
    ) THEN
        RAISE NOTICE '✅ Sincronización unidireccional vacation -> novedad ACTIVA';
    ELSE
        RAISE WARNING '⚠️ Trigger principal NO encontrado';
    END IF;
    
    -- Verificar que no quede el trigger problemático
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'trigger_sync_novedad_to_vacation' 
        AND tgrelid = 'payroll_novedades'::regclass
    ) THEN
        RAISE NOTICE '✅ Trigger problemático ELIMINADO correctamente';
    ELSE
        RAISE WARNING '⚠️ Trigger problemático aún existe';
    END IF;
END $$;

-- Documentación final
COMMENT ON FUNCTION sync_vacation_to_novedad() IS 
'SOLUCIÓN KISS: Sincronización unidireccional vacation -> novedad con protección contra recursión infinita. Eliminada sincronización bidireccional problemática.';
