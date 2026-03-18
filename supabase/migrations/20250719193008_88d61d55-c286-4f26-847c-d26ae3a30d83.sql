
-- SOLUCIÓN KISS: Eliminar recursión infinita en triggers de sincronización
-- Desactivar el trigger que causa la recursión (vacaciones -> novedades)
DROP TRIGGER IF EXISTS sync_vacation_to_novedad_trigger ON employee_vacation_periods;

-- Mantener solo la sincronización unidireccional (novedades -> vacaciones)
-- El trigger sync_novedad_to_vacation ya existe y funciona correctamente

-- Verificar que el trigger correcto esté activo
DO $$
BEGIN
    -- Verificar si el trigger existe
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'sync_novedad_to_vacation_trigger' 
        AND tgrelid = 'payroll_novedades'::regclass
    ) THEN
        -- Crear el trigger si no existe
        CREATE TRIGGER sync_novedad_to_vacation_trigger
            AFTER INSERT OR UPDATE OR DELETE ON payroll_novedades
            FOR EACH ROW EXECUTE FUNCTION sync_novedad_to_vacation();
    END IF;
END $$;

-- Comentario de documentación
COMMENT ON FUNCTION sync_novedad_to_vacation() IS 
'Sincronización unidireccional: novedades -> vacaciones. Evita recursión infinita manteniendo novedades como fuente única de verdad.';
