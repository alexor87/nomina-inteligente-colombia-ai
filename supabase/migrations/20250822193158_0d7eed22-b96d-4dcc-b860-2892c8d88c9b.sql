
-- Eliminar el período "15/01/2025 - 30/01/2025" y sus datos relacionados,
-- SOLO para la empresa del usuario autenticado

WITH target_periods AS (
  SELECT id, periodo, fecha_inicio, fecha_fin
  FROM public.payroll_periods_real
  WHERE company_id = get_current_user_company_id()
    AND fecha_inicio = DATE '2025-01-15'
    AND fecha_fin   = DATE '2025-01-30'
),
-- Registrar auditoría por cada período a eliminar
audit AS (
  INSERT INTO public.security_audit_log (
    company_id, user_id, table_name, action, violation_type, query_attempted, additional_data
  )
  SELECT 
    get_current_user_company_id(),
    auth.uid(),
    'payroll_periods_real',
    'DELETE',
    'user_requested_period_delete',
    'Delete period and related payrolls by exact date range',
    jsonb_build_object(
      'periodo', tp.periodo,
      'fecha_inicio', tp.fecha_inicio,
      'fecha_fin', tp.fecha_fin
    )
  FROM target_periods tp
  RETURNING id
),
target_payrolls AS (
  SELECT p.id
  FROM public.payrolls p
  WHERE p.company_id = get_current_user_company_id()
    AND p.period_id IN (SELECT id FROM target_periods)
),
deleted_vouchers AS (
  -- Si existen comprobantes ligados a esas nóminas, eliminarlos primero para evitar restricciones
  DELETE FROM public.payroll_vouchers v
  WHERE v.company_id = get_current_user_company_id()
    AND v.payroll_id IN (SELECT id FROM target_payrolls)
  RETURNING v.id
),
deleted_payrolls AS (
  DELETE FROM public.payrolls
  WHERE company_id = get_current_user_company_id()
    AND id IN (SELECT id FROM target_payrolls)
  RETURNING id
),
deleted_periods AS (
  DELETE FROM public.payroll_periods_real
  WHERE company_id = get_current_user_company_id()
    AND id IN (SELECT id FROM target_periods)
  RETURNING id
)
SELECT
  (SELECT COUNT(*) FROM target_periods)    AS periods_found,
  (SELECT COUNT(*) FROM deleted_vouchers)  AS vouchers_deleted,
  (SELECT COUNT(*) FROM deleted_payrolls)  AS payrolls_deleted,
  (SELECT COUNT(*) FROM deleted_periods)   AS periods_deleted;
