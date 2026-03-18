
-- CORRECCIÓN DEFINITIVA: Eliminar el trigger correcto que causa recursión infinita
-- El problema era el nombre incorrecto del trigger

-- Eliminar TODOS los triggers de sincronización bidireccional
DROP TRIGGER IF EXISTS trigger_sync_vacation_to_novedad ON employee_vacation_periods;
DROP TRIGGER IF EXISTS sync_vacation_to_novedad_trigger ON employee_vacation_periods;

-- Eliminar también la función que causa problemas
DROP FUNCTION IF EXISTS sync_vacation_to_novedad() CASCADE;

-- Asegurar que solo existe la sincronización unidireccional (novedades -> vacaciones)
-- Verificar que el trigger correcto esté activo
DO $$
BEGIN
    -- Verificar si el trigger de sincronización unidireccional existe
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'sync_novedad_to_vacation_trigger' 
        AND tgrelid = 'payroll_novedades'::regclass
    ) THEN
        -- Crear el trigger si no existe
        CREATE TRIGGER sync_novedad_to_vacation_trigger
            AFTER INSERT OR UPDATE OR DELETE ON payroll_novedades
            FOR EACH ROW EXECUTE FUNCTION sync_novedad_to_vacation();
        
        RAISE NOTICE 'Trigger sync_novedad_to_vacation_trigger creado correctamente';
    ELSE
        RAISE NOTICE 'Trigger sync_novedad_to_vacation_trigger ya existe';
    END IF;
END $$;

-- Verificar que no queden triggers problemáticos
DO $$
DECLARE
    trigger_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO trigger_count
    FROM pg_trigger pt
    JOIN pg_class pc ON pt.tgrelid = pc.oid
    WHERE pc.relname = 'employee_vacation_periods'
    AND pt.tgname LIKE '%sync%vacation%';
    
    IF trigger_count > 0 THEN
        RAISE WARNING 'Aún existen % triggers de sincronización en employee_vacation_periods', trigger_count;
    ELSE
        RAISE NOTICE 'Limpieza completa: No hay triggers de sincronización en employee_vacation_periods';
    END IF;
END $$;

-- Documentación final
COMMENT ON FUNCTION sync_novedad_to_vacation() IS 
'ÚNICA sincronización permitida: novedades -> vacaciones. Eliminada recursión infinita. Novedades es la fuente única de verdad.';
