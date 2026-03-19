-- Ensure company_payroll_configurations exists in all environments (idempotent)
-- Fixes: "No se pudo crear la configuración por defecto" in staging where this table was missing
CREATE TABLE IF NOT EXISTS public.company_payroll_configurations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  year TEXT NOT NULL,
  salary_min NUMERIC NOT NULL DEFAULT 1423500,
  transport_allowance NUMERIC NOT NULL DEFAULT 200000,
  uvt NUMERIC NOT NULL DEFAULT 49799,
  percentages JSONB NOT NULL DEFAULT '{
    "saludEmpleado": 0.04,
    "pensionEmpleado": 0.04,
    "saludEmpleador": 0.085,
    "pensionEmpleador": 0.12,
    "arl": 0.00522,
    "cajaCompensacion": 0.04,
    "icbf": 0.03,
    "sena": 0.02,
    "cesantias": 0.0833,
    "interesesCesantias": 0.12,
    "prima": 0.0833,
    "vacaciones": 0.0417
  }'::jsonb,
  fondo_solidaridad JSONB NOT NULL DEFAULT '{
    "ranges": [
      {"minSMMLV": 4, "maxSMMLV": 16, "percentage": 1},
      {"minSMMLV": 16, "maxSMMLV": 17, "percentage": 1.2},
      {"minSMMLV": 17, "maxSMMLV": 18, "percentage": 1.4},
      {"minSMMLV": 18, "maxSMMLV": 19, "percentage": 1.6},
      {"minSMMLV": 19, "maxSMMLV": 20, "percentage": 1.8},
      {"minSMMLV": 20, "maxSMMLV": null, "percentage": 2}
    ]
  }'::jsonb,
  arl_risk_levels JSONB NOT NULL DEFAULT '{
    "I": 0.348,
    "II": 0.435,
    "III": 0.783,
    "IV": 1.740,
    "V": 3.219
  }'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(company_id, year)
);

-- Enable RLS (safe if already enabled)
ALTER TABLE public.company_payroll_configurations ENABLE ROW LEVEL SECURITY;

-- Create policy idempotently
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'company_payroll_configurations'
      AND policyname = 'Users can manage their company payroll configurations'
  ) THEN
    CREATE POLICY "Users can manage their company payroll configurations"
    ON public.company_payroll_configurations FOR ALL
    USING (company_id = get_current_user_company_id())
    WITH CHECK (company_id = get_current_user_company_id());
  END IF;
END $$;

-- Ensure update_updated_at_column trigger function exists
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Create updated_at trigger idempotently
DROP TRIGGER IF EXISTS update_company_payroll_configurations_updated_at
  ON public.company_payroll_configurations;
CREATE TRIGGER update_company_payroll_configurations_updated_at
BEFORE UPDATE ON public.company_payroll_configurations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed 2025 defaults for every company (uses companies table, not employees)
INSERT INTO public.company_payroll_configurations (company_id, year, salary_min, transport_allowance, uvt)
SELECT id, '2025', 1423500, 200000, 49799
FROM public.companies
ON CONFLICT (company_id, year) DO NOTHING;

-- Seed 2024 defaults for every company
INSERT INTO public.company_payroll_configurations (company_id, year, salary_min, transport_allowance, uvt)
SELECT id, '2024', 1300000, 162000, 47065
FROM public.companies
ON CONFLICT (company_id, year) DO NOTHING;

-- Grant table access to authenticated role (required for RLS to work)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.company_payroll_configurations TO authenticated;
GRANT SELECT ON public.company_payroll_configurations TO anon;
