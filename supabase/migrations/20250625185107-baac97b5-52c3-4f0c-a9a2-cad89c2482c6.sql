
-- Verificar y corregir la situación de los datos para el superadmin
-- Primero, vamos a verificar qué empresas y empleados existen

-- Asegurar que las tablas tienen RLS habilitado
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- Verificar si existe el perfil del superadmin y vincularlo a una empresa si es necesario
DO $$
DECLARE
    superadmin_id UUID := (SELECT id FROM auth.users WHERE email = 'alexor87@gmail.com');
    first_company_id UUID;
BEGIN
    -- Si existe el superadmin
    IF superadmin_id IS NOT NULL THEN
        -- Buscar la primera empresa disponible
        SELECT id INTO first_company_id FROM public.companies LIMIT 1;
        
        -- Si existe una empresa, asegurar que el perfil esté vinculado
        IF first_company_id IS NOT NULL THEN
            -- Crear o actualizar el perfil del superadmin
            INSERT INTO public.profiles (user_id, company_id, first_name, last_name)
            VALUES (superadmin_id, first_company_id, 'Super', 'Admin')
            ON CONFLICT (user_id) DO UPDATE SET
                company_id = COALESCE(profiles.company_id, first_company_id),
                updated_at = now();
                
            -- Asegurar que tenga un registro en usuarios_empresa si no lo tiene
            INSERT INTO public.usuarios_empresa (usuario_id, empresa_id, rol, asignado_por)
            VALUES (superadmin_id, first_company_id, 'admin', superadmin_id)
            ON CONFLICT (usuario_id, empresa_id) DO UPDATE SET
                activo = true,
                rol = 'admin';
        END IF;
    END IF;
END $$;

-- Verificar que todos los empleados tengan company_id válido
UPDATE public.employees 
SET company_id = (SELECT id FROM public.companies LIMIT 1)
WHERE company_id IS NULL OR company_id NOT IN (SELECT id FROM public.companies);

-- Verificar que todos los payrolls tengan company_id válido
UPDATE public.payrolls 
SET company_id = (SELECT id FROM public.companies LIMIT 1)
WHERE company_id IS NULL OR company_id NOT IN (SELECT id FROM public.companies);

-- Mostrar estadísticas de lo que tenemos
DO $$
DECLARE
    company_count INTEGER;
    employee_count INTEGER;
    payroll_count INTEGER;
    profile_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO company_count FROM public.companies;
    SELECT COUNT(*) INTO employee_count FROM public.employees;
    SELECT COUNT(*) INTO payroll_count FROM public.payrolls;
    SELECT COUNT(*) INTO profile_count FROM public.profiles;
    
    RAISE NOTICE 'Estadísticas de datos:';
    RAISE NOTICE 'Empresas: %', company_count;
    RAISE NOTICE 'Empleados: %', employee_count;
    RAISE NOTICE 'Nóminas: %', payroll_count;
    RAISE NOTICE 'Perfiles: %', profile_count;
END $$;
