-- Create trigger function for payroll_novedades audit
CREATE OR REPLACE FUNCTION audit_payroll_novedades_changes()
RETURNS TRIGGER AS $$
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
      'CREATE',
      NULL,
      to_jsonb(NEW),
      auth.uid()
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
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
      'UPDATE',
      to_jsonb(OLD),
      to_jsonb(NEW),
      auth.uid()
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO payroll_novedades_audit (
      novedad_id,
      company_id,
      action,
      old_values,
      new_values,
      user_id
    ) VALUES (
      OLD.id,
      OLD.company_id,
      'DELETE',
      to_jsonb(OLD),
      NULL,
      auth.uid()
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
CREATE TRIGGER payroll_novedades_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON payroll_novedades
  FOR EACH ROW EXECUTE FUNCTION audit_payroll_novedades_changes();

-- Create function to get audit history for a novedad
CREATE OR REPLACE FUNCTION get_novedad_audit_history(p_novedad_id uuid)
RETURNS TABLE(
  action text,
  old_values jsonb,
  new_values jsonb,
  user_email text,
  created_at timestamp with time zone
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;

-- Create function to get period audit summary
CREATE OR REPLACE FUNCTION get_period_audit_summary(p_period_id uuid)
RETURNS TABLE(
  employee_name text,
  novedad_type text,
  action text,
  value_change numeric,
  user_email text,
  created_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
      WHEN pna.action = 'CREATE' THEN (pna.new_values->>'valor')::numeric
      WHEN pna.action = 'DELETE' THEN -((pna.old_values->>'valor')::numeric)
      WHEN pna.action = 'UPDATE' THEN 
        (pna.new_values->>'valor')::numeric - (pna.old_values->>'valor')::numeric
      ELSE 0
    END as value_change,
    COALESCE(p.email, 'Usuario desconocido') as user_email,
    pna.created_at
  FROM payroll_novedades_audit pna
  LEFT JOIN payroll_novedades pn ON pna.novedad_id = pn.id
  LEFT JOIN employees e ON 
    COALESCE(
      (pna.new_values->>'empleado_id')::uuid,
      (pna.old_values->>'empleado_id')::uuid
    ) = e.id
  LEFT JOIN auth.users au ON pna.user_id = au.id
  LEFT JOIN profiles p ON au.id = p.user_id
  WHERE COALESCE(
    (pna.new_values->>'periodo_id')::uuid,
    (pna.old_values->>'periodo_id')::uuid
  ) = p_period_id
  AND pna.company_id = get_current_user_company_id()
  ORDER BY pna.created_at DESC;
END;
$$;