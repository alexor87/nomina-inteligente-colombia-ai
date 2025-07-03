
-- ELIMINACIÓN COMPLETA Y DEFINITIVA DE PERÍODOS DE NÓMINA
-- Para la empresa específica que está causando problemas

DO $$
DECLARE
    current_company_id UUID;
    deleted_vouchers INTEGER := 0;
    deleted_novedades INTEGER := 0;
    deleted_payrolls INTEGER := 0;
    deleted_periods_real INTEGER := 0;
    deleted_periods INTEGER := 0;
    deleted_sync_logs INTEGER := 0;
    deleted_audit_logs INTEGER := 0;
BEGIN
    -- Obtener company_id del usuario actual
    SELECT company_id INTO current_company_id 
    FROM public.profiles 
    WHERE user_id = auth.uid();
    
    IF current_company_id IS NOT NULL THEN
        RAISE NOTICE 'INICIANDO ELIMINACIÓN COMPLETA para company_id: %', current_company_id;
        
        -- 1. Eliminar vouchers de nómina
        DELETE FROM public.payroll_vouchers WHERE company_id = current_company_id;
        GET DIAGNOSTICS deleted_vouchers = ROW_COUNT;
        
        -- 2. Eliminar novedades de nómina y sus auditorías
        DELETE FROM public.payroll_novedades_audit WHERE company_id = current_company_id;
        DELETE FROM public.payroll_novedades WHERE company_id = current_company_id;
        GET DIAGNOSTICS deleted_novedades = ROW_COUNT;
        
        -- 3. Eliminar registros de auditoría de reapertura
        DELETE FROM public.payroll_reopen_audit WHERE company_id = current_company_id;
        GET DIAGNOSTICS deleted_audit_logs = ROW_COUNT;
        
        -- 4. Eliminar todos los registros de nómina (payrolls)
        DELETE FROM public.payrolls WHERE company_id = current_company_id;
        GET DIAGNOSTICS deleted_payrolls = ROW_COUNT;
        
        -- 5. Eliminar logs de sincronización
        DELETE FROM public.payroll_sync_log WHERE company_id = current_company_id;
        GET DIAGNOSTICS deleted_sync_logs = ROW_COUNT;
        
        -- 6. Eliminar todos los períodos de nómina (tabla real)
        DELETE FROM public.payroll_periods_real WHERE company_id = current_company_id;
        GET DIAGNOSTICS deleted_periods_real = ROW_COUNT;
        
        -- 7. Eliminar períodos de la tabla legacy (si existen)
        DELETE FROM public.payroll_periods WHERE company_id = current_company_id;
        GET DIAGNOSTICS deleted_periods = ROW_COUNT;
        
        -- Mostrar resumen de eliminación
        RAISE NOTICE '🗑️ ELIMINACIÓN COMPLETADA:';
        RAISE NOTICE '- Vouchers eliminados: %', deleted_vouchers;
        RAISE NOTICE '- Novedades eliminadas: %', deleted_novedades;
        RAISE NOTICE '- Registros de nómina eliminados: %', deleted_payrolls;
        RAISE NOTICE '- Períodos reales eliminados: %', deleted_periods_real;
        RAISE NOTICE '- Períodos legacy eliminados: %', deleted_periods;
        RAISE NOTICE '- Logs de sincronización eliminados: %', deleted_sync_logs;
        RAISE NOTICE '- Logs de auditoría eliminados: %', deleted_audit_logs;
        
        -- Verificación final
        PERFORM 1 FROM public.payroll_periods_real WHERE company_id = current_company_id;
        IF NOT FOUND THEN
            RAISE NOTICE '✅ VERIFICACIÓN: No quedan períodos de nómina en la base de datos';
        ELSE
            RAISE NOTICE '⚠️ ADVERTENCIA: Aún quedan algunos períodos';
        END IF;
        
    ELSE
        RAISE NOTICE '❌ No se encontró company_id para el usuario actual';
    END IF;
END $$;

-- Verificar que la eliminación fue exitosa
SELECT 
    'payroll_periods_real' as tabla,
    COUNT(*) as registros_restantes
FROM public.payroll_periods_real 
WHERE company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
UNION ALL
SELECT 
    'payrolls' as tabla,
    COUNT(*) as registros_restantes
FROM public.payrolls 
WHERE company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
UNION ALL
SELECT 
    'payroll_vouchers' as tabla,  
    COUNT(*) as registros_restantes
FROM public.payroll_vouchers 
WHERE company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid());
