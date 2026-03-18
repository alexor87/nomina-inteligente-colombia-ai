-- Modificar función sync_novedad_to_vacation para solo permitir INSERT
-- Eliminar UPDATE y DELETE, solo conservar INSERT

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
    -- Solo sincronizar INSERT: crear desde novedades hacia vacaciones
    IF TG_OP = 'INSERT' THEN
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
            
            -- CAMBIO CLAVE: ON CONFLICT DO NOTHING en lugar de DO UPDATE
            -- Esto significa que solo se crea la primera vez, no se actualiza después
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
            ) ON CONFLICT (id) DO NOTHING; -- CAMBIO: DO NOTHING en lugar de DO UPDATE
        END IF;
        RETURN NEW;
    END IF;
    
    -- ELIMINADAS: las secciones UPDATE y DELETE completamente
    -- Solo permite INSERT desde novedades hacia vacaciones
    
    RETURN NULL;
END;
$function$;

-- Actualizar el trigger para ejecutarse solo en INSERT
DROP TRIGGER IF EXISTS trigger_sync_novedad_to_vacation ON payroll_novedades;

CREATE TRIGGER trigger_sync_novedad_to_vacation
    AFTER INSERT ON public.payroll_novedades
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_novedad_to_vacation();

-- Comentario explicando el nuevo comportamiento
COMMENT ON FUNCTION public.sync_novedad_to_vacation() IS 
'Sincronización unidireccional: solo permite crear ausencias desde Novedades hacia Vacaciones. 
No permite actualizar ni eliminar desde Novedades. 
El módulo Vacaciones es la fuente de verdad para modificaciones.';

-- Verificar que el trigger de vacaciones hacia novedades sigue activo (no modificar)
SELECT tgname, tgenabled 
FROM pg_trigger 
WHERE tgrelid = 'employee_vacation_periods'::regclass 
AND tgname = 'trigger_sync_vacation_to_novedad';