-- Migration 2/5: Add SET search_path to access/audit helpers

CREATE OR REPLACE FUNCTION public.user_has_access_to_company(p_user_id text, p_company_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
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

CREATE OR REPLACE FUNCTION public.get_novedad_audit_history(p_novedad_id uuid)
RETURNS TABLE(action text, old_values jsonb, new_values jsonb, user_email text, created_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    pna.action,
    pna.old_values,
    pna.new_values,
    COALESCE(p.email, 'Usuario desconocido') as user_email,
    pna.created_at
  FROM payroll_novedades_audit pna
  LEFT JOIN auth.users au ON pna.user_id = au.id
  LEFT JOIN profiles p ON au.id = p.user_id
  WHERE pna.novedad_id = p_novedad_id
  ORDER BY pna.created_at DESC;
END;
$function$;

CREATE OR REPLACE FUNCTION public.audit_payroll_corrections_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO payroll_novedades_audit (
      novedad_id,
      company_id,
      action,
      old_values,
      new_values,
      user_id
    ) VALUES (
      NEW.id,
      NEW.company_id,
      'created',
      NULL,
      to_jsonb(NEW),
      auth.uid()
    );
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_payroll_adjustment(p_period_id uuid, p_employee_id uuid, p_concept text, p_amount numeric, p_observations text, p_created_by uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.payroll_adjustments (
    period_id,
    employee_id,
    concept,
    amount,
    observations,
    created_by
  ) VALUES (
    p_period_id,
    p_employee_id,
    p_concept,
    p_amount,
    p_observations,
    p_created_by
  );
END;
$function$;