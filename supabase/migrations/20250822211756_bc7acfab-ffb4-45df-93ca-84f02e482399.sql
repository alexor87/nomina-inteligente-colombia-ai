
-- Eliminar el período específico y sus payrolls asociados para la empresa finppi_nom25@outlook.com
WITH company AS (
  SELECT p.company_id
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.user_id
  WHERE u.email = 'finppi_nom25@outlook.com'
  LIMIT 1
),
target_period AS (
  SELECT 
    ppr.id,
    ppr.company_id,
    ppr.periodo,
    ppr.fecha_inicio,
    ppr.fecha_fin,
    ppr.tipo_periodo,
    ppr.estado
  FROM public.payroll_periods_real ppr
  WHERE ppr.id = '2c0b5a5f-58a1-49ff-9e7f-f42f308998d6'::uuid
    AND ppr.company_id = (SELECT company_id FROM company)
),
pre_counts AS (
  SELECT 
    (SELECT COUNT(*) FROM public.payrolls WHERE period_id = (SELECT id FROM target_period)) AS payrolls_to_delete
),
delete_payrolls AS (
  DELETE FROM public.payrolls 
  WHERE period_id = (SELECT id FROM target_period)
  RETURNING id
),
delete_period AS (
  DELETE FROM public.payroll_periods_real 
  WHERE id = (SELECT id FROM target_period)
  RETURNING id
),
audit AS (
  INSERT INTO public.security_audit_log (
    company_id, user_id, table_name, action, violation_type, query_attempted, additional_data
  )
  SELECT
    (SELECT company_id FROM target_period),
    auth.uid(),
    'payroll_periods_real',
    'DELETE_PERIOD',
    'manual_cleanup',
    'DELETE period by id + DELETE related payrolls',
    jsonb_build_object(
      'target_period', (SELECT to_jsonb(target_period) FROM target_period),
      'payrolls_deleted', (SELECT COUNT(*) FROM delete_payrolls)
    )
  RETURNING id
)
SELECT
  (SELECT company_id FROM company) AS company_id,
  (SELECT id FROM target_period) AS deleted_period_id,
  (SELECT periodo FROM target_period) AS deleted_period_label,
  (SELECT payrolls_to_delete FROM pre_counts) AS payrolls_deleted,
  (SELECT id FROM audit) AS audit_log_id;
