
-- CORRECCIÓN: Arreglar lógica de estado y políticas de eliminación

-- 1. Corregir la función de sincronización para determinar el estado real
CREATE OR REPLACE FUNCTION public.sync_novedad_to_vacation()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
    vacation_types novedad_type[] := ARRAY['vacaciones', 'licencia_remunerada', 'licencia_no_remunerada', 'incapacidad', 'ausencia'];
    mapped_subtipo TEXT;
    period_status TEXT;
    calculated_status TEXT;
BEGIN
    -- Solo sincronizar si es un tipo relacionado con vacaciones/ausencias
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        IF NEW.tipo_novedad = ANY(vacation_types) THEN
            -- Determinar estado real basado en el estado del período
            calculated_status := 'pendiente'; -- Por defecto pendiente
            
            IF NEW.periodo_id IS NOT NULL THEN
                -- Verificar el estado real del período
                SELECT estado INTO period_status
                FROM payroll_periods_real 
                WHERE id = NEW.periodo_id;
                
                -- Solo marcar como liquidada si el período está realmente cerrado
                IF period_status = 'cerrado' THEN
                    calculated_status := 'liquidada';
                END IF;
            END IF;
            
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
                calculated_status, -- Usar estado calculado correctamente
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
                status = EXCLUDED.status, -- Usar estado calculado
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
$function$;

-- 2. Actualizar política RLS para permitir eliminación de registros en períodos no cerrados
DROP POLICY IF EXISTS "Users can delete company vacation periods" ON employee_vacation_periods;

CREATE POLICY "Users can delete company vacation periods" 
ON employee_vacation_periods 
FOR DELETE 
USING (
    company_id = get_current_user_company_id() 
    AND (
        status = 'pendiente' 
        OR (
            status = 'liquidada' 
            AND processed_in_period_id IS NOT NULL
            AND EXISTS (
                SELECT 1 FROM payroll_periods_real 
                WHERE id = processed_in_period_id 
                AND estado != 'cerrado'
            )
        )
    )
);

-- 3. Actualizar registros existentes para corregir estados incorrectos
UPDATE employee_vacation_periods 
SET status = CASE 
    WHEN processed_in_period_id IS NULL THEN 'pendiente'
    WHEN EXISTS (
        SELECT 1 FROM payroll_periods_real 
        WHERE id = processed_in_period_id 
        AND estado = 'cerrado'
    ) THEN 'liquidada'
    ELSE 'pendiente'
END
WHERE status = 'liquidada';

-- Documentación
COMMENT ON FUNCTION sync_novedad_to_vacation() IS 
'Sincronización unidireccional novedades -> vacaciones. Estado determinado por estado real del período.';

COMMENT ON POLICY "Users can delete company vacation periods" ON employee_vacation_periods IS 
'Permite eliminar registros pendientes o liquidados en períodos no cerrados, protege registros en períodos cerrados.';
