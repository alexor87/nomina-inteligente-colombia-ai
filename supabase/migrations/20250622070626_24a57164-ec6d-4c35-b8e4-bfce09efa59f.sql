
-- Corregir función has_role con search_path fijo
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role, _company_id UUID DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
      AND (company_id = _company_id OR _company_id IS NULL)
  )
$$;

-- Corregir función get_user_roles con search_path fijo
CREATE OR REPLACE FUNCTION public.get_user_roles(_company_id UUID DEFAULT NULL)
RETURNS TABLE(role app_role, company_id UUID)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT ur.role, ur.company_id
  FROM public.user_roles ur
  WHERE ur.user_id = auth.uid()
    AND (ur.company_id = _company_id OR _company_id IS NULL)
$$;
