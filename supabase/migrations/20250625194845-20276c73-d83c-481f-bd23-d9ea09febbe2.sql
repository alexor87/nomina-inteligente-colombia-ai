
-- Crear empresa para el superadmin con tipos correctos en dashboard_alerts
DO $$
DECLARE
    superadmin_user_id UUID := (SELECT id FROM auth.users WHERE email = 'alexor87@gmail.com');
    new_company_id UUID;
BEGIN
    -- Verificar que el usuario existe
    IF superadmin_user_id IS NULL THEN
        RAISE EXCEPTION 'Usuario superadmin no encontrado';
    END IF;
    
    -- Crear empresa principal para el superadmin
    INSERT INTO public.companies (
        nit,
        razon_social,
        email,
        telefono,
        direccion,
        ciudad,
        actividad_economica,
        representante_legal,
        estado,
        plan
    ) VALUES (
        '900123456-1',
        'TechSolutions Colombia S.A.S',
        'alexor87@gmail.com',
        '+57 1 234 5678',
        'Calle 72 #10-34, Oficina 801',
        'Bogotá',
        'Desarrollo de software y consultoría tecnológica',
        'Alejandro Rodriguez',
        'activa',
        'empresarial'
    )
    ON CONFLICT (nit) DO UPDATE SET
        razon_social = EXCLUDED.razon_social,
        email = EXCLUDED.email,
        updated_at = now()
    RETURNING id INTO new_company_id;
    
    -- Asegurar que el perfil del superadmin esté vinculado a la empresa
    INSERT INTO public.profiles (
        user_id,
        first_name,
        last_name,
        company_id
    ) VALUES (
        superadmin_user_id,
        'Alejandro',
        'Rodriguez',
        new_company_id
    )
    ON CONFLICT (user_id) DO UPDATE SET
        company_id = new_company_id,
        first_name = COALESCE(profiles.first_name, 'Alejandro'),
        last_name = COALESCE(profiles.last_name, 'Rodriguez'),
        updated_at = now();
    
    -- Asegurar rol de admin en usuarios_empresa
    INSERT INTO public.usuarios_empresa (
        usuario_id,
        empresa_id,
        rol,
        asignado_por,
        activo
    ) VALUES (
        superadmin_user_id,
        new_company_id,
        'admin',
        superadmin_user_id,
        true
    )
    ON CONFLICT (usuario_id, empresa_id) DO UPDATE SET
        rol = 'admin',
        activo = true,
        asignado_en = now();
    
    -- Crear configuración de empresa
    INSERT INTO public.company_settings (
        company_id,
        periodicity
    ) VALUES (
        new_company_id,
        'mensual'
    )
    ON CONFLICT (company_id) DO UPDATE SET
        periodicity = 'mensual',
        updated_at = now();
    
    -- Crear suscripción empresarial usando 'trial' como status
    INSERT INTO public.company_subscriptions (
        company_id,
        plan_type,
        status,
        trial_ends_at,
        max_employees,
        max_payrolls_per_month,
        features
    ) VALUES (
        new_company_id,
        'empresarial',
        'trial',
        now() + interval '365 days',
        500,
        999,
        '{"email_support": true, "phone_support": true, "custom_reports": true, "priority_support": true}'::jsonb
    )
    ON CONFLICT (company_id) DO UPDATE SET
        plan_type = 'empresarial',
        status = 'trial',
        trial_ends_at = now() + interval '365 days',
        max_employees = 500,
        max_payrolls_per_month = 999,
        updated_at = now();
    
    -- Crear algunos empleados de ejemplo
    INSERT INTO public.employees (
        company_id,
        cedula,
        nombre,
        apellido,
        email,
        telefono,
        salario_base,
        tipo_contrato,
        fecha_ingreso,
        estado,
        eps,
        afp,
        arl,
        caja_compensacion,
        cargo,
        estado_afiliacion,
        banco,
        tipo_cuenta,
        numero_cuenta,
        titular_cuenta
    ) VALUES 
    (
        new_company_id,
        '12345678',
        'María',
        'González',
        'maria.gonzalez@techsolutions.co',
        '3001234567',
        2500000,
        'indefinido',
        '2024-01-15',
        'activo',
        'SURA EPS',
        'Protección',
        'SURA ARL',
        'Compensar',
        'Desarrolladora Senior',
        'completa',
        'Bancolombia',
        'ahorros',
        '12345678901',
        'María González'
    ),
    (
        new_company_id,
        '87654321',
        'Carlos',
        'Ramírez',
        'carlos.ramirez@techsolutions.co',
        '3009876543',
        3200000,
        'indefinido',
        '2023-08-20',
        'activo',
        'Nueva EPS',
        'Colfondos',
        'Positiva',
        'Colsubsidio',
        'Gerente de Tecnología',
        'completa',
        'Banco de Bogotá',
        'corriente',
        '98765432109',
        'Carlos Ramírez'
    ),
    (
        new_company_id,
        '11223344',
        'Ana',
        'López',
        'ana.lopez@techsolutions.co',
        '3005556677',
        2800000,
        'indefinido',
        '2024-03-10',
        'activo',
        'Sanitas',
        'Porvenir',
        'SURA ARL',
        'Cafam',
        'Analista de Sistemas',
        'completa',
        'Davivienda',
        'ahorros',
        '11223344556',
        'Ana López'
    )
    ON CONFLICT (company_id, cedula) DO NOTHING;
    
    -- Crear algunas alertas del dashboard con tipos correctos ('warning', 'error', 'info')
    INSERT INTO public.dashboard_alerts (
        company_id,
        type,
        title,
        description,
        priority,
        icon,
        action_required,
        due_date
    ) VALUES 
    (
        new_company_id,
        'warning',
        'Período de nómina pendiente',
        'El período de nómina de enero debe procesarse',
        'high',
        '📊',
        true,
        CURRENT_DATE + INTERVAL '2 days'
    ),
    (
        new_company_id,
        'info',
        'Nuevos empleados registrados',
        'Se han registrado 3 empleados exitosamente',
        'medium',
        '👥',
        false,
        NULL
    );
    
    RAISE NOTICE 'Empresa creada exitosamente para superadmin: %', new_company_id;
    RAISE NOTICE 'Empleados creados: 3';
    RAISE NOTICE 'Configuración completada';
END $$;
