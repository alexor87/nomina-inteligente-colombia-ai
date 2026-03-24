-- Parámetros legales 2026 por defecto para todas las empresas
-- Salario mínimo: 1.750.905 | Auxilio de transporte: 249.095 | UVT: 52.374

-- 1. Corregir UVT incorrecto en filas 2026 ya existentes
UPDATE public.company_payroll_configurations
SET uvt = 52374, updated_at = NOW()
WHERE year = '2026' AND uvt != 52374;

-- 2. Insertar fila 2026 para empresas que aún no la tienen
INSERT INTO public.company_payroll_configurations
  (company_id, year, salary_min, transport_allowance, uvt)
SELECT id, '2026', 1750905, 249095, 52374
FROM public.companies
WHERE id NOT IN (
  SELECT company_id FROM public.company_payroll_configurations WHERE year = '2026'
)
ON CONFLICT (company_id, year) DO NOTHING;

-- 3. Función que crea la config 2026 automáticamente al insertar una empresa nueva
CREATE OR REPLACE FUNCTION public.create_default_payroll_config_for_new_company()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.company_payroll_configurations
    (company_id, year, salary_min, transport_allowance, uvt)
  VALUES (NEW.id, '2026', 1750905, 249095, 52374)
  ON CONFLICT (company_id, year) DO NOTHING;
  RETURN NEW;
END;
$$;

-- 4. Trigger AFTER INSERT en companies
DROP TRIGGER IF EXISTS trigger_create_default_payroll_config ON public.companies;
CREATE TRIGGER trigger_create_default_payroll_config
AFTER INSERT ON public.companies
FOR EACH ROW
EXECUTE FUNCTION public.create_default_payroll_config_for_new_company();
