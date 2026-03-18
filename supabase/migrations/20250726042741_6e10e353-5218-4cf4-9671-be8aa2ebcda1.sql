-- Phase 2: Fix database functions with missing search_path
-- This migration adds SET search_path TO 'public' to all database functions
-- to resolve the 34 security warnings identified by the linter

-- Fix get_current_user_company_id function
CREATE OR REPLACE FUNCTION public.get_current_user_company_id()
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

-- Fix has_role_in_company function
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

-- Create secure helper functions for filtering and validation
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

-- Fix calculate_period_intersection_days function with search_path
CREATE OR REPLACE FUNCTION public.calculate_period_intersection_days(
  p_absence_start date,
  p_absence_end date,
  p_period_start date,
  p_period_end date
)
 RETURNS integer
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
DECLARE
  intersection_start date;
  intersection_end date;
BEGIN
  -- Calculate intersection
  intersection_start := GREATEST(p_absence_start, p_period_start);
  intersection_end := LEAST(p_absence_end, p_period_end);
  
  -- Return days if there's overlap, 0 otherwise
  IF intersection_start <= intersection_end THEN
    RETURN (intersection_end - intersection_start) + 1;
  ELSE
    RETURN 0;
  END IF;
END;
$function$;

-- Update all existing functions to include SET search_path
-- This ensures all functions follow security best practices

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_period_activity()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    NEW.last_activity_at = now();
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_company_field_definitions_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.user_has_access_to_company(p_user_id text, p_company_id text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = p_user_id::UUID AND company_id = p_company_id::UUID
  ) OR EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = p_user_id::UUID AND company_id = p_company_id::UUID
  );
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

-- Log the migration completion
DO $$
BEGIN
  RAISE NOTICE 'Phase 2 Security Migration Completed: Fixed database functions with search_path';
  RAISE NOTICE 'Added 5 new security helper functions for consistent access control';
  RAISE NOTICE 'Updated all existing functions to include SET search_path TO public';
END;
$$;