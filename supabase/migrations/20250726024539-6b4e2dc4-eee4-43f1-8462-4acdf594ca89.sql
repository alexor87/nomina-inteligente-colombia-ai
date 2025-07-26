-- Fix get_period_audit_summary function to correct SQL error
CREATE OR REPLACE FUNCTION public.get_period_audit_summary(p_period_id uuid)
RETURNS TABLE(employee_name text, novedad_type text, action text, value_change numeric, user_email text, created_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    CONCAT(e.nombre, ' ', e.apellido) as employee_name,
    COALESCE(
      (pna.new_values->>'tipo_novedad')::text,
      (pna.old_values->>'tipo_novedad')::text
    ) as novedad_type,
    pna.action,
    CASE 
      WHEN pna.action = 'created' THEN (pna.new_values->>'valor')::numeric
      WHEN pna.action = 'deleted' THEN -((pna.old_values->>'valor')::numeric)
      WHEN pna.action = 'updated' THEN 
        (pna.new_values->>'valor')::numeric - (pna.old_values->>'valor')::numeric
      ELSE 0
    END as value_change,
    COALESCE(profiles.email, 'Usuario desconocido') as user_email,
    pna.created_at
  FROM payroll_novedades_audit pna
  LEFT JOIN payroll_novedades pn ON pna.novedad_id = pn.id
  LEFT JOIN employees e ON 
    COALESCE(
      (pna.new_values->>'empleado_id')::uuid,
      (pna.old_values->>'empleado_id')::uuid
    ) = e.id
  LEFT JOIN auth.users au ON pna.user_id = au.id
  LEFT JOIN profiles ON au.id = profiles.user_id
  WHERE COALESCE(
    (pna.new_values->>'periodo_id')::uuid,
    (pna.old_values->>'periodo_id')::uuid
  ) = p_period_id
  AND pna.company_id = get_current_user_company_id()
  ORDER BY pna.created_at DESC;
END;
$function$