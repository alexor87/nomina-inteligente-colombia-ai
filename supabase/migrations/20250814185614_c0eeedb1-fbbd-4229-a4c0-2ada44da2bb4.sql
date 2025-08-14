
-- V8.0: Eliminar el registro corrupto específico identificado
DELETE FROM payroll_novedades 
WHERE id = 'ebe076eb-5660-434b-aa02-e205b2460d50';

-- Log de la eliminación específica para auditoría V8.0
INSERT INTO security_audit_log (
  table_name,
  action,
  violation_type,
  query_attempted,
  additional_data,
  user_id,
  company_id
) VALUES (
  'payroll_novedades',
  'DELETE_CORRUPT_RECORD',
  'v8_debugging_cleanup',
  'Eliminación de registro corrupto específico para Plan V8.0',
  jsonb_build_object(
    'deleted_record_id', 'ebe076eb-5660-434b-aa02-e205b2460d50',
    'issue', 'incapacidad_4_dias_valor_cero',
    'plan_version', 'V8.0',
    'timestamp', now()
  ),
  auth.uid(),
  get_current_user_company_id()
);
