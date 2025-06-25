
-- Verificar y eliminar políticas existentes de manera segura
DO $$
BEGIN
    -- Eliminar políticas problemáticas de usuarios_empresa si existen
    DROP POLICY IF EXISTS "Allow superadmin full access to usuarios_empresa" ON public.usuarios_empresa;
    DROP POLICY IF EXISTS "Users can view their own empresa relationships" ON public.usuarios_empresa;
    DROP POLICY IF EXISTS "Users can manage relationships where they are admin" ON public.usuarios_empresa;
    DROP POLICY IF EXISTS "Superadmin can view all user-company relationships" ON public.usuarios_empresa;
    DROP POLICY IF EXISTS "Admins can view their company relationships" ON public.usuarios_empresa;
    DROP POLICY IF EXISTS "Users can view their own relationships" ON public.usuarios_empresa;
    DROP POLICY IF EXISTS "Superadmin can manage all relationships" ON public.usuarios_empresa;
    DROP POLICY IF EXISTS "Admins can manage their company relationships" ON public.usuarios_empresa;
    
    -- Eliminar políticas de employees si existen
    DROP POLICY IF EXISTS "Users can view accessible employees" ON public.employees;
    DROP POLICY IF EXISTS "Editors and admins can manage employees" ON public.employees;
    
    -- Eliminar políticas de companies si existen
    DROP POLICY IF EXISTS "Users can view accessible companies" ON public.companies;
    DROP POLICY IF EXISTS "Superadmin can manage all companies" ON public.companies;
    DROP POLICY IF EXISTS "Admins can update their company" ON public.companies;
END $$;

-- Crear políticas más simples que no causen recursión para usuarios_empresa
CREATE POLICY "Allow superadmin full access to usuarios_empresa"
  ON public.usuarios_empresa
  FOR ALL
  TO authenticated
  USING (public.is_superadmin(auth.uid()))
  WITH CHECK (public.is_superadmin(auth.uid()));

CREATE POLICY "Users can view their own empresa relationships"
  ON public.usuarios_empresa
  FOR SELECT
  TO authenticated
  USING (usuario_id = auth.uid());

CREATE POLICY "Users can manage relationships where they are admin"
  ON public.usuarios_empresa
  FOR ALL
  TO authenticated
  USING (
    usuario_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.usuarios_empresa ue2 
      WHERE ue2.usuario_id = auth.uid() 
      AND ue2.empresa_id = usuarios_empresa.empresa_id 
      AND ue2.rol = 'admin'
      AND ue2.activo = true
    )
  )
  WITH CHECK (
    usuario_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.usuarios_empresa ue2 
      WHERE ue2.usuario_id = auth.uid() 
      AND ue2.empresa_id = usuarios_empresa.empresa_id 
      AND ue2.rol = 'admin'
      AND ue2.activo = true
    )
  );

-- Políticas para employees
CREATE POLICY "Users can view accessible employees"
  ON public.employees
  FOR SELECT
  TO authenticated
  USING (
    public.is_superadmin(auth.uid()) OR 
    public.user_has_access_to_company(auth.uid(), company_id)
  );

CREATE POLICY "Editors and admins can manage employees"
  ON public.employees
  FOR ALL
  TO authenticated
  USING (
    public.is_superadmin(auth.uid()) OR
    company_id IN (
      SELECT empresa_id 
      FROM public.usuarios_empresa 
      WHERE usuario_id = auth.uid() 
        AND rol IN ('admin', 'editor')
        AND activo = true
    )
  )
  WITH CHECK (
    public.is_superadmin(auth.uid()) OR
    company_id IN (
      SELECT empresa_id 
      FROM public.usuarios_empresa 
      WHERE usuario_id = auth.uid() 
        AND rol IN ('admin', 'editor')
        AND activo = true
    )
  );

-- Políticas para companies
CREATE POLICY "Users can view accessible companies"
  ON public.companies
  FOR SELECT
  TO authenticated
  USING (
    public.is_superadmin(auth.uid()) OR 
    public.user_has_access_to_company(auth.uid(), id)
  );

CREATE POLICY "Superadmin can manage all companies"
  ON public.companies
  FOR ALL
  TO authenticated
  USING (public.is_superadmin(auth.uid()))
  WITH CHECK (public.is_superadmin(auth.uid()));

CREATE POLICY "Admins can update their company"
  ON public.companies
  FOR UPDATE
  TO authenticated
  USING (
    id IN (
      SELECT empresa_id 
      FROM public.usuarios_empresa 
      WHERE usuario_id = auth.uid() 
        AND rol = 'admin' 
        AND activo = true
    )
  )
  WITH CHECK (
    id IN (
      SELECT empresa_id 
      FROM public.usuarios_empresa 
      WHERE usuario_id = auth.uid() 
        AND rol = 'admin' 
        AND activo = true
    )
  );

-- Simplificar la función get_user_companies para evitar recursión
CREATE OR REPLACE FUNCTION public.get_user_companies(_user_id UUID DEFAULT auth.uid())
RETURNS TABLE(company_id UUID, rol TEXT)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  -- Si es superadmin, devolver todas las empresas
  SELECT c.id as company_id, 'superadmin'::text as rol
  FROM public.companies c
  WHERE public.is_superadmin(_user_id)
  
  UNION ALL
  
  -- Si no es superadmin, devolver solo las empresas donde tiene rol
  SELECT ue.empresa_id as company_id, ue.rol::text as rol
  FROM public.usuarios_empresa ue
  WHERE ue.usuario_id = _user_id 
  AND ue.activo = true
  AND NOT public.is_superadmin(_user_id)
$$;

-- Crear empleados de ejemplo adicionales (corregido el ON CONFLICT)
DO $$
DECLARE
    primera_empresa_id UUID;
    empleado_contador INTEGER;
BEGIN
    -- Obtener la primera empresa disponible
    SELECT id INTO primera_empresa_id FROM public.companies LIMIT 1;
    
    -- Verificar cuántos empleados ya existen
    SELECT COUNT(*) INTO empleado_contador FROM public.employees WHERE company_id = primera_empresa_id;
    
    -- Solo crear empleados adicionales si hay menos de 10
    IF empleado_contador < 10 AND primera_empresa_id IS NOT NULL THEN
        -- Crear empleados de ejemplo adicionales
        INSERT INTO public.employees (
            company_id, cedula, tipo_documento, nombre, apellido, 
            email, telefono, salario_base, tipo_contrato, fecha_ingreso, 
            estado, eps, afp, arl, cargo
        ) VALUES 
        (primera_empresa_id, '12345678', 'CC', 'Ana', 'Rodríguez', 'ana.rodriguez@empresa.com', '3101234567', 2500000, 'indefinido', '2024-01-15', 'activo', 'EPS Sura', 'Porvenir', 'ARL Sura', 'Contadora'),
        (primera_empresa_id, '23456789', 'CC', 'Carlos', 'Mendoza', 'carlos.mendoza@empresa.com', '3109876543', 1800000, 'indefinido', '2024-02-01', 'activo', 'Nueva EPS', 'Colfondos', 'Positiva', 'Desarrollador'),
        (primera_empresa_id, '34567890', 'CC', 'María', 'Torres', 'maria.torres@empresa.com', '3205432167', 2200000, 'indefinido', '2024-03-10', 'activo', 'Compensar', 'Protección', 'Bolivar', 'Diseñadora'),
        (primera_empresa_id, '45678901', 'CC', 'Luis', 'Gómez', 'luis.gomez@empresa.com', '3156789012', 1600000, 'fijo', '2024-04-05', 'activo', 'Sanitas', 'Porvenir', 'Liberty', 'Asistente'),
        (primera_empresa_id, '56789012', 'CC', 'Patricia', 'Vargas', 'patricia.vargas@empresa.com', '3187654321', 2800000, 'indefinido', '2024-01-20', 'activo', 'EPS Sura', 'Colfondos', 'ARL Sura', 'Gerente de Ventas')
        ON CONFLICT (company_id, cedula) DO NOTHING;
        
        RAISE NOTICE 'Empleados de ejemplo creados exitosamente para empresa %', primera_empresa_id;
    ELSE
        RAISE NOTICE 'Ya existen suficientes empleados (%) en la empresa %', empleado_contador, primera_empresa_id;
    END IF;
END $$;
