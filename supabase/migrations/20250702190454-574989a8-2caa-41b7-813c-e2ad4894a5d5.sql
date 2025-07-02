
-- SCRIPT DE LIMPIEZA COMPLETA PARA CUENTA DE PRUEBAS
-- Empresa: TechSolutions Colombia S.A.S
-- ADVERTENCIA: Este script eliminará TODOS los datos de empleados y nóminas

-- Paso 1: Obtener y verificar el company_id
DO $$
DECLARE
    target_company_id UUID;
    company_name TEXT;
    employee_count INTEGER;
    payroll_count INTEGER;
    period_count INTEGER;
BEGIN
    -- Obtener company_id de TechSolutions Colombia S.A.S
    SELECT id, razon_social INTO target_company_id, company_name
    FROM public.companies 
    WHERE razon_social ILIKE '%TechSolutions%' OR razon_social ILIKE '%Colombia%'
    LIMIT 1;
    
    IF target_company_id IS NULL THEN
        RAISE EXCEPTION 'No se encontró la empresa TechSolutions Colombia S.A.S';
    END IF;
    
    -- Verificar conteos actuales
    SELECT COUNT(*) INTO employee_count FROM public.employees WHERE company_id = target_company_id;
    SELECT COUNT(*) INTO payroll_count FROM public.payrolls WHERE company_id = target_company_id;
    SELECT COUNT(*) INTO period_count FROM public.payroll_periods_real WHERE company_id = target_company_id;
    
    RAISE NOTICE 'INICIANDO LIMPIEZA PARA: % (ID: %)', company_name, target_company_id;
    RAISE NOTICE 'Empleados a eliminar: %', employee_count;
    RAISE NOTICE 'Registros de nómina a eliminar: %', payroll_count;
    RAISE NOTICE 'Períodos a eliminar: %', period_count;
    
    -- PASO 2: ELIMINACIÓN EN ORDEN CORRECTO
    
    -- 2.1: Eliminar registros de auditoría y logs
    DELETE FROM public.payroll_novedades_audit WHERE company_id = target_company_id;
    DELETE FROM public.payroll_reopen_audit WHERE company_id = target_company_id;
    DELETE FROM public.voucher_audit_log WHERE company_id = target_company_id;
    DELETE FROM public.dashboard_activity WHERE company_id = target_company_id;
    
    -- 2.2: Eliminar vouchers de nómina
    DELETE FROM public.payroll_vouchers WHERE company_id = target_company_id;
    
    -- 2.3: Eliminar notas y menciones de empleados
    DELETE FROM public.employee_note_mentions 
    WHERE note_id IN (
        SELECT id FROM public.employee_notes WHERE company_id = target_company_id
    );
    DELETE FROM public.employee_notes WHERE company_id = target_company_id;
    
    -- 2.4: Eliminar novedades de nómina
    DELETE FROM public.payroll_novedades WHERE company_id = target_company_id;
    
    -- 2.5: Eliminar registros de nómina (payrolls)
    DELETE FROM public.payrolls WHERE company_id = target_company_id;
    
    -- 2.6: Eliminar períodos de nómina
    DELETE FROM public.payroll_periods_real WHERE company_id = target_company_id;
    DELETE FROM public.payroll_periods WHERE company_id = target_company_id;
    
    -- 2.7: Eliminar importaciones de empleados
    DELETE FROM public.employee_imports WHERE company_id = target_company_id;
    
    -- 2.8: Eliminar empleados
    DELETE FROM public.employees WHERE company_id = target_company_id;
    
    -- 2.9: Eliminar notificaciones de usuarios
    DELETE FROM public.user_notifications WHERE company_id = target_company_id;
    
    -- 2.10: Eliminar alertas del dashboard
    DELETE FROM public.dashboard_alerts WHERE company_id = target_company_id;
    
    -- PASO 3: VERIFICACIÓN POST-LIMPIEZA
    SELECT COUNT(*) INTO employee_count FROM public.employees WHERE company_id = target_company_id;
    SELECT COUNT(*) INTO payroll_count FROM public.payrolls WHERE company_id = target_company_id;
    SELECT COUNT(*) INTO period_count FROM public.payroll_periods_real WHERE company_id = target_company_id;
    
    RAISE NOTICE '✅ LIMPIEZA COMPLETADA EXITOSAMENTE';
    RAISE NOTICE 'Empleados restantes: %', employee_count;
    RAISE NOTICE 'Registros de nómina restantes: %', payroll_count;
    RAISE NOTICE 'Períodos restantes: %', period_count;
    
    -- PASO 4: MANTENER CONFIGURACIONES IMPORTANTES
    -- (Las siguientes tablas NO se eliminan para preservar la configuración)
    -- - public.companies (información de la empresa)
    -- - public.company_settings (configuraciones)
    -- - public.company_subscriptions (suscripción)
    -- - public.profiles (perfiles de usuario)
    -- - public.user_roles (roles de usuario)
    -- - public.branches (sucursales)
    -- - public.cost_centers (centros de costo)
    
    RAISE NOTICE '📋 CONFIGURACIONES PRESERVADAS:';
    RAISE NOTICE '- Información de la empresa';
    RAISE NOTICE '- Configuraciones del sistema';
    RAISE NOTICE '- Suscripción activa';
    RAISE NOTICE '- Perfiles de usuario y roles';
    RAISE NOTICE '- Sucursales y centros de costo';
    
    RAISE NOTICE '🚀 LA CUENTA ESTÁ LISTA PARA NUEVOS DATOS DE PRUEBA';
    
END $$;

-- Script adicional para verificar que la limpieza fue exitosa
SELECT 
    'VERIFICACIÓN FINAL' as status,
    (SELECT COUNT(*) FROM public.employees WHERE company_id = (SELECT id FROM public.companies WHERE razon_social ILIKE '%TechSolutions%' LIMIT 1)) as empleados,
    (SELECT COUNT(*) FROM public.payrolls WHERE company_id = (SELECT id FROM public.companies WHERE razon_social ILIKE '%TechSolutions%' LIMIT 1)) as nominas,
    (SELECT COUNT(*) FROM public.payroll_periods_real WHERE company_id = (SELECT id FROM public.companies WHERE razon_social ILIKE '%TechSolutions%' LIMIT 1)) as periodos,
    (SELECT COUNT(*) FROM public.payroll_vouchers WHERE company_id = (SELECT id FROM public.companies WHERE razon_social ILIKE '%TechSolutions%' LIMIT 1)) as vouchers;

-- Resetear secuencias para que los nuevos registros empiecen desde 1
-- (Opcional, pero útil para datos de prueba limpios)
-- Las secuencias se resetearán automáticamente al crear nuevos registros con UUIDs
