-- CORRECCIÓN CRÍTICA: Función que acepta TEXT en lugar de UUID para evitar errores de tipo desde Edge Functions
DROP FUNCTION IF EXISTS public.user_has_access_to_company(UUID, UUID);

-- Nueva función que acepta TEXT y hace casting interno a UUID
CREATE OR REPLACE FUNCTION public.user_has_access_to_company(p_user_id TEXT, p_company_id TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = p_user_id::UUID AND company_id = p_company_id::UUID
  ) OR EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = p_user_id::UUID AND company_id = p_company_id::UUID
  );
$$;