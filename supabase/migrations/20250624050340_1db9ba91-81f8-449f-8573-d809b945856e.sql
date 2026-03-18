
-- Limpiar políticas existentes y crear nuevas para multi-tenancy

-- Actualizar políticas para companies - cada usuario solo ve su empresa
DROP POLICY IF EXISTS "Users can view companies" ON public.companies;
DROP POLICY IF EXISTS "Users can view their company" ON public.companies;
DROP POLICY IF EXISTS "Users can update their company" ON public.companies;

CREATE POLICY "Users can view their company" 
  ON public.companies 
  FOR SELECT 
  TO authenticated 
  USING (
    id IN (
      SELECT company_id 
      FROM public.profiles 
      WHERE user_id = auth.uid() 
      AND company_id IS NOT NULL
    )
  );

CREATE POLICY "Users can update their company" 
  ON public.companies 
  FOR UPDATE 
  TO authenticated 
  USING (
    id IN (
      SELECT company_id 
      FROM public.profiles 
      WHERE user_id = auth.uid() 
      AND company_id IS NOT NULL
    )
  );

-- Limpiar políticas existentes en company_settings
DROP POLICY IF EXISTS "Users can view their company settings" ON public.company_settings;
DROP POLICY IF EXISTS "Users can manage their company settings" ON public.company_settings;

-- Habilitar RLS si no está habilitado
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

-- Crear nuevas políticas para company_settings
CREATE POLICY "Users can view their company settings" 
  ON public.company_settings 
  FOR SELECT 
  TO authenticated 
  USING (
    company_id IN (
      SELECT company_id 
      FROM public.profiles 
      WHERE user_id = auth.uid() 
      AND company_id IS NOT NULL
    )
  );

CREATE POLICY "Users can manage their company settings" 
  ON public.company_settings 
  FOR ALL 
  TO authenticated 
  USING (
    company_id IN (
      SELECT company_id 
      FROM public.profiles 
      WHERE user_id = auth.uid() 
      AND company_id IS NOT NULL
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id 
      FROM public.profiles 
      WHERE user_id = auth.uid() 
      AND company_id IS NOT NULL
    )
  );

-- Limpiar datos de prueba existentes para evitar conflictos
-- Solo mantener la empresa del usuario actual
DELETE FROM public.companies 
WHERE email != 'alexor87@gmail.com' 
AND razon_social = 'Empresa Demo S.A.S';

-- Asegurar que el usuario actual tenga una empresa única
UPDATE public.companies 
SET email = 'alexor87@gmail.com' 
WHERE id IN (
  SELECT company_id 
  FROM public.profiles 
  WHERE user_id = '3716ea94-cab9-47a5-b83d-0ef05a817bf2'
);
