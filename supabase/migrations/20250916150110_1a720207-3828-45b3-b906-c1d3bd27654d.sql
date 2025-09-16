-- Backfill function to embed employee identity into payroll_version_history snapshots
CREATE OR REPLACE FUNCTION public.backfill_version_employee_identity(p_period_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_company_id uuid;
  v_updated integer := 0;
  v_versions integer := 0;
  v_total_emps integer := 0;
  rec RECORD;
  identities jsonb;
  existing jsonb;
  merged jsonb;
  emp_ids uuid[];
BEGIN
  -- Obtener empresa del período
  SELECT company_id INTO v_company_id
  FROM public.payroll_periods_real
  WHERE id = p_period_id;

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Período no encontrado';
  END IF;

  -- Validar acceso del usuario
  IF NOT public.user_has_access_to_company(auth.uid()::text, v_company_id::text) THEN
    RAISE EXCEPTION 'Acceso no autorizado al período';
  END IF;

  -- Iterar versiones y enriquecer snapshots
  FOR rec IN
    SELECT id, snapshot_data
    FROM public.payroll_version_history
    WHERE period_id = p_period_id AND company_id = v_company_id
  LOOP
    v_versions := v_versions + 1;

    -- Recolectar IDs de empleados desde employees[] y payrolls[] del snapshot
    emp_ids := COALESCE(
      (
        SELECT array_agg(DISTINCT (e->>'id')::uuid)
        FROM jsonb_array_elements(rec.snapshot_data->'employees') e
      ), ARRAY[]::uuid[]
    );

    emp_ids := array_cat(emp_ids, COALESCE(
      (
        SELECT array_agg(DISTINCT (p->>'employee_id')::uuid)
        FROM jsonb_array_elements(rec.snapshot_data->'payrolls') p
      ), ARRAY[]::uuid[]
    ));

    -- Deduplicar
    emp_ids := (SELECT array_agg(DISTINCT x) FROM unnest(emp_ids) x);

    IF emp_ids IS NULL OR array_length(emp_ids, 1) IS NULL OR array_length(emp_ids, 1) = 0 THEN
      CONTINUE;
    END IF;

    v_total_emps := v_total_emps + COALESCE(array_length(emp_ids, 1), 0);

    -- Construir mapa de identidad
    SELECT COALESCE(
      jsonb_object_agg(
        e.id::text,
        jsonb_build_object(
          'nombre', e.nombre,
          'apellido', e.apellido,
          'cedula', e.cedula,
          'tipo_documento', COALESCE(e.tipo_documento, 'CC')
        )
      ), '{}'::jsonb)
    INTO identities
    FROM public.employees e
    WHERE e.company_id = v_company_id
      AND e.id = ANY(emp_ids);

    existing := COALESCE(rec.snapshot_data->'employeeIdentity', '{}'::jsonb);
    merged := existing || identities; -- prioriza existentes y completa faltantes

    IF merged <> existing THEN
      UPDATE public.payroll_version_history
      SET snapshot_data = jsonb_set(rec.snapshot_data, '{employeeIdentity}', merged, true)
      WHERE id = rec.id;
      v_updated := v_updated + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'versions_processed', v_versions,
    'versions_updated', v_updated,
    'employees_processed', v_total_emps
  );
END;
$$;

-- Robust identity RPC v2 including tipo_documento
CREATE OR REPLACE FUNCTION public.get_employee_identity_for_period_v2(
  p_period_id uuid,
  p_employee_ids uuid[]
)
RETURNS TABLE(
  employee_id uuid,
  nombre text,
  apellido text,
  cedula text,
  tipo_documento text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_company_id uuid;
BEGIN
  -- Obtener empresa del período
  SELECT company_id INTO v_company_id
  FROM public.payroll_periods_real
  WHERE id = p_period_id;

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Período no encontrado';
  END IF;

  -- Validar acceso del usuario
  IF NOT public.user_has_access_to_company(auth.uid()::text, v_company_id::text) THEN
    RAISE EXCEPTION 'Acceso no autorizado al período';
  END IF;

  -- Devolver identidades desde employees con tipo_documento
  RETURN QUERY
  SELECT e.id, e.nombre, e.apellido, e.cedula, COALESCE(e.tipo_documento, 'CC')
  FROM public.employees e
  WHERE e.company_id = v_company_id
    AND e.id = ANY(p_employee_ids);
END;
$$;