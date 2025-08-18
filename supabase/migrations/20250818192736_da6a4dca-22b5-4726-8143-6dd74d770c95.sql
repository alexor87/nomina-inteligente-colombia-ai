
-- Add performance indices and constraints for social_benefit_provisions
CREATE INDEX IF NOT EXISTS idx_social_benefit_provisions_company_period 
  ON social_benefit_provisions(company_id, period_id);

CREATE INDEX IF NOT EXISTS idx_social_benefit_provisions_employee_type 
  ON social_benefit_provisions(employee_id, benefit_type);

CREATE INDEX IF NOT EXISTS idx_social_benefit_provisions_period_type 
  ON social_benefit_provisions(period_id, benefit_type);

-- Add unique constraint to prevent duplicates
ALTER TABLE social_benefit_provisions 
ADD CONSTRAINT unique_provision_per_employee_period_type 
UNIQUE (company_id, period_id, employee_id, benefit_type);

-- Enable realtime for provisions table
ALTER TABLE social_benefit_provisions REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE social_benefit_provisions;

-- Create view for aggregated provisions data
CREATE OR REPLACE VIEW social_benefit_provisions_summary AS
SELECT 
  sbp.company_id,
  sbp.period_id,
  sbp.employee_id,
  e.nombre || ' ' || e.apellido as employee_name,
  e.cedula as employee_cedula,
  ppr.periodo as period_name,
  ppr.fecha_inicio as period_start,
  ppr.fecha_fin as period_end,
  ppr.tipo_periodo as period_type,
  sbp.benefit_type,
  sbp.base_salary,
  sbp.variable_average,
  sbp.transport_allowance,
  sbp.other_included,
  sbp.days_count,
  sbp.provision_amount,
  sbp.calculation_method,
  sbp.source,
  sbp.created_at,
  sbp.updated_at
FROM social_benefit_provisions sbp
JOIN employees e ON sbp.employee_id = e.id
JOIN payroll_periods_real ppr ON sbp.period_id = ppr.id
WHERE e.company_id = sbp.company_id;

-- Grant access to the view
GRANT SELECT ON social_benefit_provisions_summary TO authenticated;

-- Add RLS policy for the view
CREATE POLICY "Users can view their company provisions summary" 
  ON social_benefit_provisions_summary
  FOR SELECT 
  USING (company_id = get_current_user_company_id());
