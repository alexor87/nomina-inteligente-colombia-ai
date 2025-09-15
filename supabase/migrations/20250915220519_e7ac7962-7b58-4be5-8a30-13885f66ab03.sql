-- Ensure audit trigger function (recreate to be safe)
CREATE OR REPLACE FUNCTION public.audit_payroll_novedades_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  emp RECORD;
  new_json JSONB;
  old_json JSONB;
BEGIN
  -- Fetch employee identity using either NEW or OLD
  SELECT e.id, e.nombre, e.apellido, e.tipo_documento, e.cedula
  INTO emp
  FROM public.employees e
  WHERE e.id = COALESCE(NEW.empleado_id, OLD.empleado_id);

  IF TG_OP = 'INSERT' THEN
    new_json := to_jsonb(NEW);
    IF emp.id IS NOT NULL THEN
      new_json := COALESCE(new_json, '{}'::jsonb) || jsonb_build_object(
        'employee_identity', jsonb_build_object(
          'id', emp.id,
          'nombre', emp.nombre,
          'apellido', emp.apellido,
          'tipo_documento', emp.tipo_documento,
          'cedula', emp.cedula
        )
      );
    END IF;

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
      new_json,
      auth.uid()
    );
    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    new_json := to_jsonb(NEW);
    old_json := to_jsonb(OLD);

    IF emp.id IS NOT NULL THEN
      new_json := COALESCE(new_json, '{}'::jsonb) || jsonb_build_object(
        'employee_identity', jsonb_build_object(
          'id', emp.id,
          'nombre', emp.nombre,
          'apellido', emp.apellido,
          'tipo_documento', emp.tipo_documento,
          'cedula', emp.cedula
        )
      );
      old_json := COALESCE(old_json, '{}'::jsonb) || jsonb_build_object(
        'employee_identity', jsonb_build_object(
          'id', emp.id,
          'nombre', emp.nombre,
          'apellido', emp.apellido,
          'tipo_documento', emp.tipo_documento,
          'cedula', emp.cedula
        )
      );
    END IF;

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
      old_json,
      new_json,
      auth.uid()
    );
    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    old_json := to_jsonb(OLD);

    IF emp.id IS NOT NULL THEN
      old_json := COALESCE(old_json, '{}'::jsonb) || jsonb_build_object(
        'employee_identity', jsonb_build_object(
          'id', emp.id,
          'nombre', emp.nombre,
          'apellido', emp.apellido,
          'tipo_documento', emp.tipo_documento,
          'cedula', emp.cedula
        )
      );
    END IF;

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
      old_json,
      NULL,
      auth.uid()
    );
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

-- Drop and recreate get_period_audit_summary with desired signature
DROP FUNCTION IF EXISTS public.get_period_audit_summary(uuid);

CREATE OR REPLACE FUNCTION public.get_period_audit_summary(p_period_id uuid)
RETURNS TABLE(
  employee_name text,
  novedad_type text,
  action text,
  value_change numeric,
  user_email text,
  created_at timestamptz,
  employee_document text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  company_id_var uuid;
BEGIN
  -- Scope to the caller's company
  company_id_var := get_current_user_company_id();

  IF company_id_var IS NULL THEN
    RAISE EXCEPTION 'No se pudo determinar la empresa del usuario';
  END IF;

  RETURN QUERY
  SELECT
    -- Prefer embedded snapshot identity, fallback to live employee, then readable ID
    COALESCE(
      NULLIF(CONCAT(
        pna.new_values->'employee_identity'->>'nombre', ' ',
        pna.new_values->'employee_identity'->>'apellido'
      ), ' '),
      NULLIF(CONCAT(
        pna.old_values->'employee_identity'->>'nombre', ' ',
        pna.old_values->'employee_identity'->>'apellido'
      ), ' '),
      NULLIF(CONCAT(e.nombre, ' ', e.apellido), ' '),
      'Empleado ' || SUBSTRING(pn.empleado_id::text, 1, 8)
    ) AS employee_name,
    COALESCE(
      pn.tipo_novedad::text,
      pna.new_values->>'tipo_novedad',
      pna.old_values->>'tipo_novedad'
    ) AS novedad_type,
    UPPER(pna.action) AS action,
    CASE
      WHEN LOWER(pna.action) = 'updated' THEN
        COALESCE((pna.new_values->>'valor')::numeric, 0) - COALESCE((pna.old_values->>'valor')::numeric, 0)
      WHEN LOWER(pna.action) = 'created' THEN
        COALESCE((pna.new_values->>'valor')::numeric, 0)
      WHEN LOWER(pna.action) = 'deleted' THEN
        - COALESCE((pna.old_values->>'valor')::numeric, 0)
      ELSE 0
    END AS value_change,
    COALESCE(p.email, 'Usuario desconocido') AS user_email,
    pna.created_at,
    COALESCE(
      NULLIF(CONCAT(
        pna.new_values->'employee_identity'->>'tipo_documento', ': ',
        pna.new_values->'employee_identity'->>'cedula'
      ), ': '),
      NULLIF(CONCAT(
        pna.old_values->'employee_identity'->>'tipo_documento', ': ',
        pna.old_values->'employee_identity'->>'cedula'
      ), ': '),
      NULLIF(CONCAT(e.tipo_documento, ': ', e.cedula), ': ')
    ) AS employee_document
  FROM public.payroll_novedades_audit pna
  JOIN public.payroll_novedades pn ON pn.id = pna.novedad_id
  LEFT JOIN public.employees e ON e.id = pn.empleado_id AND e.company_id = company_id_var
  LEFT JOIN auth.users au ON pna.user_id = au.id
  LEFT JOIN public.profiles p ON au.id = p.user_id
  WHERE pn.periodo_id = p_period_id
    AND pna.company_id = company_id_var
  ORDER BY pna.created_at DESC;
END;
$$;