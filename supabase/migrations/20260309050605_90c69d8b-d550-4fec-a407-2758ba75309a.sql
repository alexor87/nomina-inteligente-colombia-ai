
-- System settings table for global platform configuration
CREATE TABLE public.system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text UNIQUE NOT NULL,
  setting_value jsonb NOT NULL DEFAULT '{}',
  description text,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Only superadmins can read
CREATE POLICY "Superadmins can view system settings"
  ON public.system_settings FOR SELECT
  TO authenticated
  USING (is_superadmin());

-- Only superadmins can insert
CREATE POLICY "Superadmins can insert system settings"
  ON public.system_settings FOR INSERT
  TO authenticated
  WITH CHECK (is_superadmin());

-- Only superadmins can update
CREATE POLICY "Superadmins can update system settings"
  ON public.system_settings FOR UPDATE
  TO authenticated
  USING (is_superadmin());

-- Seed default settings
INSERT INTO public.system_settings (setting_key, setting_value, description) VALUES
  ('default_trial_days', '14', 'Duración default del periodo trial en días'),
  ('platform_name', '"Nómina Inteligente"', 'Nombre de la plataforma'),
  ('support_email', '"soporte@nominainteligente.com"', 'Email de soporte'),
  ('feature_flags', '{}', 'Feature flags globales de la plataforma');
