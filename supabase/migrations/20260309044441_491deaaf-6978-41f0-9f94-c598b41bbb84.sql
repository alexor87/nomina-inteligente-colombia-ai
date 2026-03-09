-- Create subscription_plans table
CREATE TABLE public.subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id text NOT NULL UNIQUE,
  nombre text NOT NULL,
  precio numeric NOT NULL DEFAULT 0,
  max_employees integer NOT NULL DEFAULT 10,
  max_payrolls_per_month integer NOT NULL DEFAULT 1,
  caracteristicas jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read active plans
CREATE POLICY "Authenticated users can read plans"
  ON public.subscription_plans FOR SELECT
  TO authenticated
  USING (true);

-- Only superadmins can insert
CREATE POLICY "Superadmins can insert plans"
  ON public.subscription_plans FOR INSERT
  TO authenticated
  WITH CHECK (is_superadmin());

-- Only superadmins can update
CREATE POLICY "Superadmins can update plans"
  ON public.subscription_plans FOR UPDATE
  TO authenticated
  USING (is_superadmin());

-- Only superadmins can delete
CREATE POLICY "Superadmins can delete plans"
  ON public.subscription_plans FOR DELETE
  TO authenticated
  USING (is_superadmin());

-- Seed with existing hardcoded plans
INSERT INTO public.subscription_plans (plan_id, nombre, precio, max_employees, max_payrolls_per_month, caracteristicas, sort_order)
VALUES
  ('basico', 'Básico', 15000, 10, 2, '["Nómina básica", "Reportes simples", "Soporte email"]'::jsonb, 1),
  ('profesional', 'Profesional', 35000, 50, 10, '["Nómina completa", "Reportes avanzados", "Soporte prioritario", "API access"]'::jsonb, 2),
  ('empresarial', 'Empresarial', 75000, 9999, 9999, '["Todo incluido", "Personalización", "Soporte 24/7", "Integrations"]'::jsonb, 3);