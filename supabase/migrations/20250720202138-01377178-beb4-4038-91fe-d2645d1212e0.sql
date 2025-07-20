
-- SOLUCIÓN DEFINITIVA: Eliminar triggers duplicados y limpiar registros duplicados
-- Aplicando principio KISS: Un trigger, una función, una sincronización por registro

-- PASO 1: Eliminar trigger duplicado
DROP TRIGGER IF EXISTS sync_novedad_to_vacation_trigger ON payroll_novedades;

-- PASO 2: Verificar que el trigger correcto permanezca activo
DO $$
BEGIN
    -- Verificar si el trigger principal existe
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'trigger_sync_novedad_to_vacation' 
        AND tgrelid = 'payroll_novedades'::regclass
    ) THEN
        -- Crear el trigger principal si no existe
        CREATE TRIGGER trigger_sync_novedad_to_vacation
            AFTER INSERT OR UPDATE OR DELETE ON payroll_novedades
            FOR EACH ROW EXECUTE FUNCTION sync_novedad_to_vacation();
        
        RAISE NOTICE 'Trigger principal creado correctamente';
    ELSE
        RAISE NOTICE 'Trigger principal ya existe - OK';
    END IF;
END $$;

-- PASO 3: Limpiar registros duplicados en employee_vacation_periods
-- Mantener solo el primer registro por ID (basado en created_at)
WITH duplicates AS (
    SELECT id, 
           ROW_NUMBER() OVER (PARTITION BY id ORDER BY created_at ASC) as row_num
    FROM employee_vacation_periods
)
DELETE FROM employee_vacation_periods 
WHERE id IN (
    SELECT id FROM duplicates WHERE row_num > 1
);

-- PASO 4: Verificar limpieza
DO $$
DECLARE
    duplicate_count INTEGER;
    total_triggers INTEGER;
BEGIN
    -- Contar registros con IDs duplicados
    SELECT COUNT(*) INTO duplicate_count
    FROM (
        SELECT id, COUNT(*) 
        FROM employee_vacation_periods 
        GROUP BY id 
        HAVING COUNT(*) > 1
    ) duplicated;
    
    -- Contar triggers activos en payroll_novedades
    SELECT COUNT(*) INTO total_triggers
    FROM pg_trigger pt
    JOIN pg_class pc ON pt.tgrelid = pc.oid
    WHERE pc.relname = 'payroll_novedades'
    AND pt.tgname LIKE '%sync%vacation%';
    
    RAISE NOTICE 'Limpieza completada:';
    RAISE NOTICE '- Registros duplicados restantes: %', duplicate_count;
    RAISE NOTICE '- Triggers de sincronización activos: %', total_triggers;
    
    IF duplicate_count = 0 AND total_triggers = 1 THEN
        RAISE NOTICE '✅ SOLUCIÓN EXITOSA: Sin duplicados, un solo trigger activo';
    ELSE
        RAISE WARNING '⚠️ Verificar manualmente el estado del sistema';
    END IF;
END $$;

-- Documentación final
COMMENT ON TRIGGER trigger_sync_novedad_to_vacation ON payroll_novedades IS 
'ÚNICO trigger de sincronización novedades -> vacaciones. Principio KISS aplicado.';
