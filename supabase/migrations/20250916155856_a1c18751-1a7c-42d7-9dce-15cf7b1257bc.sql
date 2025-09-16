-- Create V2 RPC with historical identity via ledger, matching client param order
CREATE OR REPLACE FUNCTION public.get_employee_identity_for_period_v2(
  p_period_id uuid,
  p_employee_ids uuid[]
)
RETURNS TABLE (
  employee_id uuid,
  nombre text,
  apellido text,
  cedula text,
  tipo_documento text
) AS $$
DECLARE
  v_end_date date;
BEGIN
  SELECT fecha_fin INTO v_end_date
  FROM public.payroll_periods_real
  WHERE id = p_period_id
  LIMIT 1;

  IF v_end_date IS NULL THEN
    v_end_date := CURRENT_DATE;
  END IF;

  RETURN QUERY
  WITH ids AS (
    SELECT UNNEST(p_employee_ids) AS id
  ),
  last_ledger AS (
    SELECT l.employee_id,
           l.nombre,
           l.apellido,
           l.cedula,
           l.tipo_documento,
           ROW_NUMBER() OVER (PARTITION BY l.employee_id ORDER BY l.effective_at DESC) AS rn
    FROM public.employee_identity_ledger l
    JOIN ids ON ids.id = l.employee_id
    WHERE l.effective_at <= (v_end_date + INTERVAL '1 day')
  )
  SELECT 
    ids.id AS employee_id,
    COALESCE(ll.nombre, e.nombre) AS nombre,
    COALESCE(ll.apellido, e.apellido) AS apellido,
    COALESCE(ll.cedula, e.cedula) AS cedula,
    COALESCE(ll.tipo_documento, e.tipo_documento, 'CC') AS tipo_documento
  FROM ids
  LEFT JOIN last_ledger ll ON ll.employee_id = ids.id AND ll.rn = 1
  LEFT JOIN public.employees e ON e.id = ids.id;
END;
$$ LANGUAGE plpgsql STABLE SET search_path = public;