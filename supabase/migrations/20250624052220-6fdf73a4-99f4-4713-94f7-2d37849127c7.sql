
-- Verificar y crear perfil del usuario con empresa existente
DO $$
DECLARE
    existing_company_id UUID;
    user_profile_exists BOOLEAN := FALSE;
BEGIN
    -- Buscar empresa existente
    SELECT id INTO existing_company_id 
    FROM public.companies 
    WHERE nit = '900123456-1' OR email = 'alexor87@gmail.com'
    LIMIT 1;
    
    -- Si no existe empresa, crear una nueva con NIT único
    IF existing_company_id IS NULL THEN
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
            '900' || EXTRACT(EPOCH FROM NOW())::bigint || '-' || (RANDOM() * 9)::int,
            'Mi Empresa Demo S.A.S',
            'alexor87@gmail.com',
            '3001234567',
            'Calle 123 #45-67',
            'Bogotá',
            'Desarrollo de software',
            'Admin Demo',
            'activa',
            'basico'
        )
        RETURNING id INTO existing_company_id;
    END IF;
    
    -- Verificar si existe perfil
    SELECT EXISTS(
        SELECT 1 FROM public.profiles 
        WHERE user_id = '3716ea94-cab9-47a5-b83d-0ef05a817bf2'
    ) INTO user_profile_exists;
    
    -- Crear o actualizar perfil
    IF user_profile_exists THEN
        UPDATE public.profiles 
        SET 
            company_id = existing_company_id,
            first_name = COALESCE(first_name, 'Admin'),
            last_name = COALESCE(last_name, 'Demo'),
            updated_at = now()
        WHERE user_id = '3716ea94-cab9-47a5-b83d-0ef05a817bf2';
    ELSE
        INSERT INTO public.profiles (
            user_id,
            first_name,
            last_name,
            company_id
        ) VALUES (
            '3716ea94-cab9-47a5-b83d-0ef05a817bf2',
            'Admin',
            'Demo',
            existing_company_id
        );
    END IF;
    
    RAISE NOTICE 'Perfil configurado correctamente con company_id: %', existing_company_id;
END $$;
