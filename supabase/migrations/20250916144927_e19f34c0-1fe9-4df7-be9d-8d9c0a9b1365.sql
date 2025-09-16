-- Secure RPC to resolve employee identities for a period
CREATE OR REPLACE FUNCTION public.get_employee_identity_for_period(
  p_period_id uuid,
  p_employee_ids uuid[]
)
RETURNS TABLE (
  employee_id uuid,
  nombre text,
  apellido text,
  cedula text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_company_id uuid;
BEGIN
  -- Validate period exists and get company
  SELECT company_id INTO v_company_id
  FROM public.payroll_periods_real
  WHERE id = p_period_id;

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Período no encontrado';
  END IF;

  -- Ensure current user has access to this company
  IF NOT public.user_has_access_to_company(auth.uid()::text, v_company_id::text) THEN
    RAISE EXCEPTION 'Acceso no autorizado al período';
  END IF;

  -- Return identities only for employees within the same company
  RETURN QUERY
  SELECT e.id, e.nombre, e.apellido, e.cedula
  FROM public.employees e
  WHERE e.company_id = v_company_id
    AND e.id = ANY(p_employee_ids);
END;
$function$;