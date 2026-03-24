-- Tabla para gestionar parámetros legales globales desde el panel de superadmin
-- Permite actualizar salario mínimo, auxilio de transporte y UVT sin tocar código

CREATE TABLE public.global_payroll_defaults (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year TEXT NOT NULL UNIQUE,
  salary_min NUMERIC NOT NULL,
  transport_allowance NUMERIC NOT NULL,
  uvt NUMERIC NOT NULL,
  is_current_default BOOLEAN NOT NULL DEFAULT false,
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.global_payroll_defaults ENABLE ROW LEVEL SECURITY;

-- Solo superadmins pueden escribir
CREATE POLICY "SuperAdmins can manage global payroll defaults"
ON public.global_payroll_defaults FOR ALL
USING (EXISTS (SELECT 1 FROM public.saas_admins WHERE user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.saas_admins WHERE user_id = auth.uid()));

-- Cualquier usuario autenticado puede leer
CREATE POLICY "Authenticated users can read global payroll defaults"
ON public.global_payroll_defaults FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Trigger: garantiza que solo un año sea el predeterminado activo a la vez
CREATE OR REPLACE FUNCTION public.enforce_single_current_default()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.is_current_default = true THEN
    UPDATE public.global_payroll_defaults
    SET is_current_default = false
    WHERE id != NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_single_current_default
BEFORE INSERT OR UPDATE ON public.global_payroll_defaults
FOR EACH ROW EXECUTE FUNCTION public.enforce_single_current_default();

-- Seed con valores históricos (2026 es el activo por defecto)
INSERT INTO public.global_payroll_defaults (year, salary_min, transport_allowance, uvt, is_current_default)
VALUES
  ('2026', 1750905, 249095, 52374, true),
  ('2025', 1423500, 200000, 49799, false),
  ('2024', 1300000, 162000, 47065, false)
ON CONFLICT (year) DO NOTHING;

-- Actualizar el trigger de creación de empresas para leer dinámicamente de global_payroll_defaults
CREATE OR REPLACE FUNCTION public.create_default_payroll_config_for_new_company()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_year TEXT;
  v_salary_min NUMERIC;
  v_transport NUMERIC;
  v_uvt NUMERIC;
BEGIN
  SELECT year, salary_min, transport_allowance, uvt
  INTO v_year, v_salary_min, v_transport, v_uvt
  FROM public.global_payroll_defaults
  WHERE is_current_default = true
  LIMIT 1;

  -- Fallback si la tabla está vacía
  IF v_year IS NULL THEN
    v_year := '2026';
    v_salary_min := 1750905;
    v_transport := 249095;
    v_uvt := 52374;
  END IF;

  INSERT INTO public.company_payroll_configurations
    (company_id, year, salary_min, transport_allowance, uvt)
  VALUES (NEW.id, v_year, v_salary_min, v_transport, v_uvt)
  ON CONFLICT (company_id, year) DO NOTHING;

  RETURN NEW;
END;
$$;
