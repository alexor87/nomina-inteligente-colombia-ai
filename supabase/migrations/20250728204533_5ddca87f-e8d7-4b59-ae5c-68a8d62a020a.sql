-- Create table for company payroll configurations
CREATE TABLE public.company_payroll_configurations (
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

-- Enable RLS
ALTER TABLE public.company_payroll_configurations ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can manage their company payroll configurations" 
ON public.company_payroll_configurations 
FOR ALL 
USING (company_id = get_current_user_company_id())
WITH CHECK (company_id = get_current_user_company_id());

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_company_payroll_configurations_updated_at
BEFORE UPDATE ON public.company_payroll_configurations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default configurations for existing companies
INSERT INTO public.company_payroll_configurations (company_id, year, salary_min, transport_allowance, uvt)
SELECT DISTINCT 
  company_id,
  '2025' as year,
  1423500 as salary_min,
  200000 as transport_allowance,
  49799 as uvt
FROM public.employees
WHERE company_id IS NOT NULL
ON CONFLICT (company_id, year) DO NOTHING;

INSERT INTO public.company_payroll_configurations (company_id, year, salary_min, transport_allowance, uvt)
SELECT DISTINCT 
  company_id,
  '2024' as year,
  1300000 as salary_min,
  162000 as transport_allowance,
  47065 as uvt
FROM public.employees
WHERE company_id IS NOT NULL
ON CONFLICT (company_id, year) DO NOTHING;