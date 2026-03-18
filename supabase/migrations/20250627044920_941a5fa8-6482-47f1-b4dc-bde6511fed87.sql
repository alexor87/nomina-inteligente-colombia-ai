
-- Crear tabla de suscripciones si no existe
CREATE TABLE IF NOT EXISTS public.company_subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    plan_type TEXT NOT NULL CHECK (plan_type IN ('basico', 'profesional', 'empresarial')),
    status TEXT NOT NULL CHECK (status IN ('activa', 'suspendida', 'cancelada', 'trial')),
    trial_ends_at TIMESTAMPTZ,
    max_employees INTEGER NOT NULL DEFAULT 5,
    max_payrolls_per_month INTEGER NOT NULL DEFAULT 1,
    features JSONB DEFAULT '{
        "email_support": true,
        "phone_support": false,
        "custom_reports": false
    }'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id)
);

-- Insertar suscripción básica para tu empresa
INSERT INTO public.company_subscriptions (
    company_id,
    plan_type,
    status,
    trial_ends_at,
    max_employees,
    max_payrolls_per_month,
    features
) VALUES (
    '969badef-d724-47f7-931a-e6924795c86e',
    'profesional',
    'activa',
    NOW() + INTERVAL '30 days',
    25,
    12,
    '{
        "email_support": true,
        "phone_support": true,
        "custom_reports": true
    }'::jsonb
) ON CONFLICT (company_id) DO UPDATE SET
    plan_type = EXCLUDED.plan_type,
    status = EXCLUDED.status,
    max_employees = EXCLUDED.max_employees,
    max_payrolls_per_month = EXCLUDED.max_payrolls_per_month,
    features = EXCLUDED.features;

-- Trigger para actualizar updated_at
CREATE OR REPLACE TRIGGER update_company_subscriptions_updated_at
    BEFORE UPDATE ON public.company_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
