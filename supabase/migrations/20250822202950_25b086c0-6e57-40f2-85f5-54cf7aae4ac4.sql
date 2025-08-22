
-- Limpieza definitiva de períodos duplicados para la empresa del email dado
-- - Detecta duplicados
-- - Elimina y re-vincula payrolls al período correcto
-- - Registra auditoría del proceso
-- - Devuelve un resumen con antes/después

WITH company AS (
  SELECT p.company_id
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.user_id
  WHERE u.email = 'finppi_nom25@outlook.com'
  LIMIT 1
),
before_diag AS (
  SELECT diagnose_duplicate_periods((SELECT company_id FROM company)) AS report
),
cleanup AS (
  SELECT clean_specific_duplicate_periods((SELECT company_id FROM company)) AS result
),
after_diag AS (
  SELECT diagnose_duplicate_periods((SELECT company_id FROM company)) AS report
),
audit AS (
  INSERT INTO public.security_audit_log (
    company_id, user_id, table_name, action, violation_type, query_attempted, additional_data
  )
  SELECT 
    (SELECT company_id FROM company),
    auth.uid(),
    'payroll_periods_real',
    'CLEAN_DUPLICATES',
    'duplicate_periods_cleanup',
    'clean_specific_duplicate_periods() + diagnose_duplicate_periods()',
    jsonb_build_object(
      'before', (SELECT report FROM before_diag),
      'cleanup', (SELECT result FROM cleanup),
      'after', (SELECT report FROM after_diag)
    )
  RETURNING id
)
SELECT
  (SELECT company_id FROM company)                            AS company_id,
  COALESCE(((SELECT report FROM before_diag)->>'duplicates_found')::int, 0) AS duplicates_before,
  COALESCE(((SELECT result FROM cleanup)->>'periods_deleted')::int, 0)      AS periods_deleted,
  COALESCE(((SELECT result FROM cleanup)->>'payrolls_updated')::int, 0)     AS payrolls_updated,
  COALESCE(((SELECT report FROM after_diag)->>'duplicates_found')::int, 0)  AS duplicates_after,
  (SELECT id FROM audit) AS audit_log_id;
