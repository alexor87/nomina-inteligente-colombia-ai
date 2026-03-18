
-- Actualizar el trigger de sincronización para manejar subtipos correctamente
CREATE OR REPLACE FUNCTION sync_novedad_to_vacation()
RETURNS TRIGGER AS $$
DECLARE
    vacation_types novedad_type[] := ARRAY['vacaciones', 'licencia_remunerada', 'licencia_no_remunerada', 'incapacidad', 'ausencia'];
    mapped_subtipo TEXT;
BEGIN
    -- Solo sincronizar si es un tipo relacionado con vacaciones/ausencias
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        IF NEW.tipo_novedad = ANY(vacation_types) THEN
            -- Mapear subtipos específicos de novedades a subtipos genéricos de vacaciones
            mapped_subtipo := CASE 
                WHEN NEW.subtipo IN ('paternidad', 'maternidad', 'matrimonio', 'luto', 'estudio') THEN NEW.subtipo
                WHEN NEW.subtipo IN ('personal', 'estudios', 'familiar', 'salud_no_eps', 'maternidad_extendida', 'cuidado_hijo_menor') THEN NEW.subtipo
                WHEN NEW.subtipo IN ('comun', 'general', 'laboral') THEN NEW.subtipo
                WHEN NEW.subtipo IN ('injustificada', 'abandono_puesto', 'suspension_disciplinaria', 'tardanza_excesiva') THEN NEW.subtipo
                ELSE NEW.subtipo -- Mantener subtipo original si no hay mapeo específico
            END;
            
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
                mapped_subtipo, -- Usar subtipo mapeado
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

-- Verificar que el constraint de status permita los valores correctos
ALTER TABLE employee_vacation_periods DROP CONSTRAINT IF EXISTS valid_status;
ALTER TABLE employee_vacation_periods ADD CONSTRAINT valid_status 
    CHECK (status IN ('pendiente', 'liquidada', 'cancelada'));

-- Agregar índice para mejorar performance en consultas de sincronización
CREATE INDEX IF NOT EXISTS idx_employee_vacation_periods_subtipo 
    ON employee_vacation_periods(subtipo) WHERE subtipo IS NOT NULL;

-- Agregar índice para mejorar performance en consultas de novedades
CREATE INDEX IF NOT EXISTS idx_payroll_novedades_subtipo 
    ON payroll_novedades(subtipo) WHERE subtipo IS NOT NULL;
