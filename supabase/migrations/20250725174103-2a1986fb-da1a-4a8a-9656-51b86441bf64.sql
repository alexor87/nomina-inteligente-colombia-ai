-- Primer paso: eliminar la función existente que tiene conflicto de parámetros
DROP FUNCTION IF EXISTS public.user_has_access_to_company(uuid,uuid);

-- Crear política RLS específica para Edge Functions en payroll_sync_log
-- Esta política permite que las Edge Functions autenticadas puedan insertar registros
-- cuando el company_id coincide con una empresa a la que el usuario tiene acceso

-- Eliminar la política restrictiva actual que usa get_current_user_company_id()
DROP POLICY IF EXISTS "Users can create sync logs for their company" ON public.payroll_sync_log;

-- Crear nueva política más flexible para Edge Functions
CREATE POLICY "Users can create sync logs for accessible companies" 
ON public.payroll_sync_log 
FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL AND 
  (
    -- Permitir si el company_id coincide con el de su perfil
    company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()) 
    OR 
    -- Permitir si tiene rol en esa empresa
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.company_id = payroll_sync_log.company_id
    )
  )
);

-- Actualizar también la política de SELECT para mayor flexibilidad
DROP POLICY IF EXISTS "Users can view their company sync logs" ON public.payroll_sync_log;

CREATE POLICY "Users can view sync logs for accessible companies" 
ON public.payroll_sync_log 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND 
  (
    -- Permitir si el company_id coincide con el de su perfil
    company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()) 
    OR 
    -- Permitir si tiene rol en esa empresa
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.company_id = payroll_sync_log.company_id
    )
  )
);

-- Crear función auxiliar para validar acceso a empresa desde Edge Functions
CREATE OR REPLACE FUNCTION public.user_has_access_to_company(p_user_id UUID, p_company_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = p_user_id AND company_id = p_company_id
  ) OR EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = p_user_id AND company_id = p_company_id
  );
$$;