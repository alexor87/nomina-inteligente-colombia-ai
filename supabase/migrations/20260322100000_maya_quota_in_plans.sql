-- ============================================================================
-- Agregar maya_queries_per_month a subscription_plans
-- NULL = ilimitado (plan empresarial)
-- ============================================================================

ALTER TABLE subscription_plans
  ADD COLUMN IF NOT EXISTS maya_queries_per_month INTEGER DEFAULT NULL;

-- Seed con los valores actuales (hardcodeados en token-budget-service)
UPDATE subscription_plans SET maya_queries_per_month = 30  WHERE plan_id = 'basico';
UPDATE subscription_plans SET maya_queries_per_month = 150 WHERE plan_id = 'profesional';
-- empresarial queda NULL (ilimitado)
