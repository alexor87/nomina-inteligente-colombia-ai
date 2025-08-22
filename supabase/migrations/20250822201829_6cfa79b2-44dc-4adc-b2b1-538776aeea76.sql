
-- Reset del período 16/01/2025 - 31/01/2025 para la empresa del usuario actual
-- - Elimina vouchers y payrolls del período
-- - Deja el período en estado 'borrador' y totales en 0
-- - Registra auditoría

WITH target_periods AS (
  SELECT id, periodo, fecha_inicio, fecha_fin
  FROM public.payroll_periods_real
  WHERE company_id = get_current_user_company_id()
    AND fecha_inicio = DATE '2025-01-16'
    AND fecha_fin   = DATE '2025-01-31'
),
-- Auditoría (segura: esta tabla permite INSERT sin restricciones)
audit_log AS (
  INSERT INTO public.security_audit_log (
    company_id, user_id, table_name, action, violation_type, query_attempted, additional_data
  )
  SELECT 
    get_current_user_company_id(),
    auth.uid(),
    'payroll_periods_real',
    'RESET',
    'user_requested_period_reset',
    'Delete vouchers & payrolls and reset period to draft',
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
  -- Borra vouchers ligados a las nóminas del período o etiquetados con el mismo periodo (por si no tienen payroll_id)
  DELETE FROM public.payroll_vouchers v
  WHERE v.company_id = get_current_user_company_id()
    AND (
      v.payroll_id IN (SELECT id FROM target_payrolls)
      OR v.periodo IN (SELECT periodo FROM target_periods)
    )
  RETURNING v.id
),
deleted_payrolls AS (
  DELETE FROM public.payrolls p
  WHERE p.company_id = get_current_user_company_id()
    AND p.id IN (SELECT id FROM target_payrolls)
  RETURNING p.id
),
updated_periods AS (
  UPDATE public.payroll_periods_real ppr
  SET estado = 'borrador',
      empleados_count = 0,
      total_devengado = 0,
      total_deducciones = 0,
      total_neto = 0,
      employees_loaded = false,
      updated_at = now(),
      last_activity_at = now()
  WHERE ppr.company_id = get_current_user_company_id()
    AND ppr.id IN (SELECT id FROM target_periods)
  RETURNING ppr.id
)
SELECT
  (SELECT COUNT(*) FROM target_periods)    AS periods_found,
  (SELECT COUNT(*) FROM deleted_vouchers)  AS vouchers_deleted,
  (SELECT COUNT(*) FROM deleted_payrolls)  AS payrolls_deleted,
  (SELECT COUNT(*) FROM updated_periods)   AS periods_reset;
