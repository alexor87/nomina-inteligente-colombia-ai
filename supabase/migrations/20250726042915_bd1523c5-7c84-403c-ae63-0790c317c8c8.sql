-- Phase 2: Fix database functions - Drop and recreate function with correct parameter name
-- The error indicates we need to drop the function first due to parameter name change

-- Drop the existing function
DROP FUNCTION IF EXISTS public.has_role_in_company(uuid, app_role, uuid);

-- Create helper functions for filtering and validation
CREATE OR REPLACE FUNCTION public.secure_company_filter()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT company_id 
  FROM public.profiles 
  WHERE user_id = auth.uid()
  LIMIT 1
$function$;

CREATE OR REPLACE FUNCTION public.validate_company_access(p_resource_company_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT CASE 
    WHEN p_resource_company_id IS NULL THEN false
    WHEN auth.uid() IS NULL THEN false
    ELSE p_resource_company_id = (
      SELECT company_id 
      FROM public.profiles 
      WHERE user_id = auth.uid()
      LIMIT 1
    )
  END
$function$;

-- Create audit helper function for company access logging
CREATE OR REPLACE FUNCTION public.audit_company_access(
  p_table_name text,
  p_action text,
  p_resource_company_id uuid,
  p_success boolean
)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.security_audit_log (
    table_name,
    action,
    violation_type,
    company_id,
    user_id,
    additional_data
  ) VALUES (
    p_table_name,
    p_action,
    CASE WHEN p_success THEN 'access_granted' ELSE 'access_denied' END,
    p_resource_company_id,
    auth.uid(),
    jsonb_build_object(
      'resource_company_id', p_resource_company_id,
      'user_company_id', get_current_user_company_id(),
      'success', p_success
    )
  );
END;
$function$;

-- Recreate has_role_in_company function with correct parameter name
CREATE OR REPLACE FUNCTION public.has_role_in_company(p_user_id uuid, p_role app_role, p_company_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = p_user_id 
    AND role = p_role 
    AND company_id = p_company_id
  )
$function$;

-- Create comprehensive RLS policy helper function
CREATE OR REPLACE FUNCTION public.user_has_company_access(p_company_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT CASE 
    WHEN auth.uid() IS NULL THEN false
    WHEN p_company_id IS NULL THEN false
    ELSE EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND company_id = p_company_id
    ) OR EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND company_id = p_company_id
    )
  END
$function$;

-- Log the completion
DO $$
BEGIN
  RAISE NOTICE 'Phase 2 Security Migration Fixed: Added security helper functions';
  RAISE NOTICE 'Created 4 new security helper functions for consistent access control';
END;
$$;