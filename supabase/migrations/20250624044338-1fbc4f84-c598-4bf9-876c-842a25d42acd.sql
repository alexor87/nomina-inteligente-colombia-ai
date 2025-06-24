
-- Solo ejecutamos la migración principal sin crear la restricción única que ya existe
DO $$
DECLARE
    company_uuid uuid;
    user_uuid uuid := '3716ea94-cab9-47a5-b83d-0ef05a817bf2';
BEGIN
    -- Buscar si existe alguna empresa
    SELECT id INTO company_uuid FROM companies LIMIT 1;
    
    -- Si no existe ninguna empresa, crear una de ejemplo
    IF company_uuid IS NULL THEN
        INSERT INTO companies (nit, razon_social, email, direccion, telefono, ciudad, estado, plan)
        VALUES (
            '900123456-1',
            'Empresa Demo Colombia',
            'demo@empresa.com',
            'Calle 123 #45-67',
            '+57 1 234 5678',
            'Bogotá',
            'activa',
            'basico'
        )
        RETURNING id INTO company_uuid;
        
        -- Crear configuración de empresa por defecto
        INSERT INTO company_settings (company_id, periodicity)
        VALUES (company_uuid, 'mensual');
    END IF;
    
    -- Actualizar el perfil del usuario para asignarlo a la empresa
    UPDATE profiles 
    SET company_id = company_uuid 
    WHERE user_id = user_uuid;
    
    -- Asignar rol de administrador al usuario
    INSERT INTO user_roles (user_id, role, company_id)
    VALUES (user_uuid, 'administrador', company_uuid)
    ON CONFLICT (user_id, role, company_id) DO NOTHING;
    
END $$;

-- Verificar que todo quedó bien configurado
SELECT 
    p.user_id,
    p.company_id,
    c.razon_social,
    ur.role
FROM profiles p
LEFT JOIN companies c ON p.company_id = c.id
LEFT JOIN user_roles ur ON p.user_id = ur.user_id
WHERE p.user_id = '3716ea94-cab9-47a5-b83d-0ef05a817bf2';
