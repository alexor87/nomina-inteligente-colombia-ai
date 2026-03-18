
-- SOLUCIÓN DEFINITIVA: Crear sincronización bidireccional para eliminaciones
-- Crear función para sincronizar eliminaciones de vacaciones hacia novedades
CREATE OR REPLACE FUNCTION sync_vacation_to_novedad()
RETURNS TRIGGER AS $$
DECLARE
    vacation_types novedad_type[] := ARRAY['vacaciones', 'licencia_remunerada', 'licencia_no_remunerada', 'incapacidad', 'ausencia'];
BEGIN
    -- Solo manejar eliminaciones de tipos relacionados con vacaciones/ausencias
    IF TG_OP = 'DELETE' THEN
        IF OLD.type = ANY(vacation_types) THEN
            -- Eliminar la novedad correspondiente con el mismo ID
            DELETE FROM payroll_novedades WHERE id = OLD.id;
            RAISE NOTICE 'Eliminada novedad sincronizada ID: %', OLD.id;
        END IF;
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger para sincronización de eliminaciones vacation -> novedad
CREATE TRIGGER trigger_sync_vacation_to_novedad
    AFTER DELETE ON employee_vacation_periods
    FOR EACH ROW EXECUTE FUNCTION sync_vacation_to_novedad();

-- Verificar que ambos triggers estén activos
DO $$
BEGIN
    -- Verificar trigger novedad -> vacation
    IF EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'sync_novedad_to_vacation_trigger' 
        AND tgrelid = 'payroll_novedades'::regclass
    ) THEN
        RAISE NOTICE '✅ Trigger novedad -> vacation ACTIVO';
    ELSE
        RAISE WARNING '⚠️ Trigger novedad -> vacation NO ENCONTRADO';
    END IF;
    
    -- Verificar trigger vacation -> novedad
    IF EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'trigger_sync_vacation_to_novedad' 
        AND tgrelid = 'employee_vacation_periods'::regclass
    ) THEN
        RAISE NOTICE '✅ Trigger vacation -> novedad ACTIVO';
    ELSE
        RAISE WARNING '⚠️ Trigger vacation -> novedad NO ENCONTRADO';
    END IF;
END $$;

-- Documentación final
COMMENT ON FUNCTION sync_vacation_to_novedad() IS 
'Sincronización bidireccional: eliminaciones de vacaciones -> novedades. Complementa sync_novedad_to_vacation para sincronización completa.';
