-- Fix audit trigger function to use correct action values
CREATE OR REPLACE FUNCTION public.audit_payroll_novedades_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
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
      'updated',
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
      'deleted',
      to_jsonb(OLD),
      NULL,
      auth.uid()
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$function$