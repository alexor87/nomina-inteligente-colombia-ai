
-- Diagnosticar el estado actual del usuario prueba4@gmail.com
DO $$
DECLARE
    user_record RECORD;
    profile_record RECORD;
    company_record RECORD;
    role_record RECORD;
BEGIN
    -- Buscar el usuario en auth.users
    SELECT id, email, created_at INTO user_record
    FROM auth.users 
    WHERE email = 'prueba4@gmail.com';
    
    IF user_record.id IS NOT NULL THEN
        RAISE NOTICE 'Usuario encontrado: % (ID: %)', user_record.email, user_record.id;
        
        -- Verificar perfil
        SELECT * INTO profile_record
        FROM public.profiles 
        WHERE user_id = user_record.id;
        
        IF profile_record.id IS NOT NULL THEN
            RAISE NOTICE 'Perfil encontrado - Company ID: %', profile_record.company_id;
        ELSE
            RAISE NOTICE 'PROBLEMA: No existe perfil para el usuario';
        END IF;
        
        -- Verificar roles
        SELECT * INTO role_record
        FROM public.user_roles 
        WHERE user_id = user_record.id;
        
        IF role_record.id IS NOT NULL THEN
            RAISE NOTICE 'Rol encontrado: % para empresa %', role_record.role, role_record.company_id;
        ELSE
            RAISE NOTICE 'PROBLEMA: No existen roles para el usuario';
        END IF;
        
        -- Si el perfil tiene company_id, verificar la empresa
        IF profile_record.company_id IS NOT NULL THEN
            SELECT * INTO company_record
            FROM public.companies 
            WHERE id = profile_record.company_id;
            
            IF company_record.id IS NOT NULL THEN
                RAISE NOTICE 'Empresa encontrada: % (NIT: %)', company_record.razon_social, company_record.nit;
            ELSE
                RAISE NOTICE 'PROBLEMA: Company ID en perfil no corresponde a empresa existente';
            END IF;
        END IF;
        
    ELSE
        RAISE NOTICE 'PROBLEMA CRÍTICO: Usuario no encontrado en auth.users';
    END IF;
END $$;

-- Función para completar registro incompleto
CREATE OR REPLACE FUNCTION complete_incomplete_registration(
    p_user_email TEXT,
    p_company_name TEXT DEFAULT 'Mi Empresa',
    p_nit TEXT DEFAULT '900000000-0'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_id_var UUID;
    company_id_var UUID;
    profile_exists BOOLEAN := FALSE;
    company_exists BOOLEAN := FALSE;
    role_exists BOOLEAN := FALSE;
    result JSONB;
BEGIN
    -- Obtener el usuario
    SELECT id INTO user_id_var
    FROM auth.users 
    WHERE email = p_user_email;
    
    IF user_id_var IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Usuario no encontrado'
        );
    END IF;
    
    -- Verificar si ya tiene perfil con empresa
    SELECT EXISTS(
        SELECT 1 FROM public.profiles 
        WHERE user_id = user_id_var AND company_id IS NOT NULL
    ) INTO profile_exists;
    
    -- Si no tiene empresa, crear una
    IF NOT profile_exists THEN
        -- Crear empresa
        INSERT INTO public.companies (
            nit, razon_social, email, estado, plan
        ) VALUES (
            p_nit, p_company_name, p_user_email, 'activa', 'profesional'
        ) RETURNING id INTO company_id_var;
        
        -- Actualizar o crear perfil
        INSERT INTO public.profiles (
            user_id, company_id, first_name, last_name
        ) VALUES (
            user_id_var, company_id_var, 'Usuario', 'Prueba'
        ) ON CONFLICT (user_id) DO UPDATE SET
            company_id = company_id_var,
            updated_at = now();
            
        -- Asignar rol de administrador
        INSERT INTO public.user_roles (
            user_id, role, company_id, assigned_by
        ) VALUES (
            user_id_var, 'administrador', company_id_var, user_id_var
        ) ON CONFLICT (user_id, role, company_id) DO NOTHING;
        
        -- Crear configuración de empresa
        INSERT INTO public.company_settings (
            company_id, periodicity
        ) VALUES (
            company_id_var, 'mensual'
        ) ON CONFLICT (company_id) DO NOTHING;
        
        -- Crear suscripción
        INSERT INTO public.company_subscriptions (
            company_id, plan_type, status, trial_ends_at, max_employees, max_payrolls_per_month
        ) VALUES (
            company_id_var, 'profesional', 'trial', now() + interval '30 days', 25, 12
        ) ON CONFLICT (company_id) DO NOTHING;
        
        result := jsonb_build_object(
            'success', true,
            'message', 'Registro completado exitosamente',
            'company_id', company_id_var,
            'user_id', user_id_var
        );
    ELSE
        result := jsonb_build_object(
            'success', true,
            'message', 'Usuario ya tiene configuración completa'
        );
    END IF;
    
    RETURN result;
END;
$$;

-- Ejecutar corrección para el usuario específico
SELECT complete_incomplete_registration('prueba4@gmail.com', 'Prueba 4 SAS', '900000004-4');
