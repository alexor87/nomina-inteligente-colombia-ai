-- Fix: actualizar suscripciones con trial vencido a estado activo
-- El trial expirado no debe bloquear operaciones normales mientras no exista
-- infraestructura de facturación activa. Solo se bloquean cuentas suspendidas/canceladas.

UPDATE company_subscriptions
SET
  status = 'activa',
  trial_ends_at = NOW() + INTERVAL '365 days',
  updated_at = NOW()
WHERE
  status = 'trial'
  AND (trial_ends_at IS NULL OR trial_ends_at < NOW());
