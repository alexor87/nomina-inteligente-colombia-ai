-- Extender global_payroll_defaults con porcentajes de nómina, Fondo Solidaridad y ARL

ALTER TABLE public.global_payroll_defaults
  ADD COLUMN percentages JSONB NOT NULL DEFAULT '{
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
  ADD COLUMN fondo_solidaridad JSONB NOT NULL DEFAULT '{
    "ranges": [
      {"minSMMLV": 4,  "maxSMMLV": 16,   "percentage": 1},
      {"minSMMLV": 16, "maxSMMLV": 17,   "percentage": 1.2},
      {"minSMMLV": 17, "maxSMMLV": 18,   "percentage": 1.4},
      {"minSMMLV": 18, "maxSMMLV": 19,   "percentage": 1.6},
      {"minSMMLV": 19, "maxSMMLV": 20,   "percentage": 1.8},
      {"minSMMLV": 20, "maxSMMLV": null, "percentage": 2}
    ]
  }'::jsonb,
  ADD COLUMN arl_risk_levels JSONB NOT NULL DEFAULT '{
    "I": 0.348,
    "II": 0.435,
    "III": 0.783,
    "IV": 1.740,
    "V": 3.219
  }'::jsonb;

-- Actualizar trigger: ahora copia también los campos JSONB al crear empresa
CREATE OR REPLACE FUNCTION public.create_default_payroll_config_for_new_company()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rec public.global_payroll_defaults%ROWTYPE;
BEGIN
  SELECT * INTO v_rec
  FROM public.global_payroll_defaults
  WHERE is_current_default = true
  LIMIT 1;

  IF v_rec.year IS NULL THEN
    -- Fallback si la tabla está vacía
    INSERT INTO public.company_payroll_configurations
      (company_id, year, salary_min, transport_allowance, uvt)
    VALUES (NEW.id, '2026', 1750905, 249095, 52374)
    ON CONFLICT (company_id, year) DO NOTHING;
  ELSE
    INSERT INTO public.company_payroll_configurations
      (company_id, year, salary_min, transport_allowance, uvt,
       percentages, fondo_solidaridad, arl_risk_levels)
    VALUES (
      NEW.id,
      v_rec.year,
      v_rec.salary_min,
      v_rec.transport_allowance,
      v_rec.uvt,
      v_rec.percentages,
      v_rec.fondo_solidaridad,
      v_rec.arl_risk_levels
    )
    ON CONFLICT (company_id, year) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;
