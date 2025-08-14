
-- Eliminar registros de incapacidades corruptos (con dias = 0 o valor = 0)
DELETE FROM payroll_novedades 
WHERE tipo_novedad = 'incapacidad' 
AND (dias = 0 OR dias IS NULL OR valor = 0);

-- También limpiar registros duplicados o malformados de incapacidades
DELETE FROM payroll_novedades 
WHERE tipo_novedad = 'incapacidad' 
AND (fecha_inicio IS NULL OR fecha_fin IS NULL);

-- Log de limpieza para auditoría
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
  'CLEANUP_CORRUPT_DATA',
  'data_corruption_fix',
  'Eliminación de registros de incapacidades corruptos',
  jsonb_build_object(
    'cleanup_type', 'incapacidad_corrupt_records',
    'timestamp', now(),
    'version', 'V7.0'
  ),
  auth.uid(),
  get_current_user_company_id()
);
