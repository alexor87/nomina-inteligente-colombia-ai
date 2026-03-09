-- Create accounting_account_mappings table for PUC configuration
CREATE TABLE public.accounting_account_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  concept text NOT NULL,
  puc_account text NOT NULL,
  puc_description text NOT NULL,
  entry_type text NOT NULL CHECK (entry_type IN ('debito', 'credito')),
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(company_id, concept)
);

-- Enable RLS
ALTER TABLE public.accounting_account_mappings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their company mappings"
  ON public.accounting_account_mappings FOR SELECT
  USING (company_id = get_current_user_company_id());

CREATE POLICY "Users can insert their company mappings"
  ON public.accounting_account_mappings FOR INSERT
  WITH CHECK (company_id = get_current_user_company_id());

CREATE POLICY "Users can update their company mappings"
  ON public.accounting_account_mappings FOR UPDATE
  USING (company_id = get_current_user_company_id());

CREATE POLICY "Users can delete their company mappings"
  ON public.accounting_account_mappings FOR DELETE
  USING (company_id = get_current_user_company_id());

-- Create function to initialize default PUC mappings for a company
CREATE OR REPLACE FUNCTION public.initialize_puc_mappings(p_company_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete existing mappings for this company
  DELETE FROM public.accounting_account_mappings WHERE company_id = p_company_id;
  
  -- Insert default Colombian PUC mappings
  INSERT INTO public.accounting_account_mappings (company_id, concept, puc_account, puc_description, entry_type) VALUES
    -- Devengados (Débitos - Gastos de personal)
    (p_company_id, 'salario_basico', '510506', 'Sueldos y salarios', 'debito'),
    (p_company_id, 'auxilio_transporte', '510527', 'Auxilio de transporte', 'debito'),
    (p_company_id, 'horas_extra', '510515', 'Horas extras y recargos', 'debito'),
    (p_company_id, 'recargos_nocturnos', '510518', 'Recargos nocturnos', 'debito'),
    (p_company_id, 'bonificaciones', '510530', 'Bonificaciones', 'debito'),
    (p_company_id, 'comisiones', '510533', 'Comisiones', 'debito'),
    (p_company_id, 'incapacidades', '510536', 'Incapacidades', 'debito'),
    (p_company_id, 'licencias', '510539', 'Licencias remuneradas', 'debito'),
    
    -- Aportes patronales (Débitos - Gastos)
    (p_company_id, 'salud_empleador', '510568', 'Aportes salud empleador', 'debito'),
    (p_company_id, 'pension_empleador', '510570', 'Aportes pensión empleador', 'debito'),
    (p_company_id, 'arl', '510572', 'Aportes ARL', 'debito'),
    (p_company_id, 'caja_compensacion', '510581', 'Aportes caja compensación', 'debito'),
    (p_company_id, 'sena', '510575', 'Aportes SENA', 'debito'),
    (p_company_id, 'icbf', '510578', 'Aportes ICBF', 'debito'),
    
    -- Deducciones empleado (Créditos - Pasivos)
    (p_company_id, 'salud_empleado', '237005', 'Aportes salud empleado', 'credito'),
    (p_company_id, 'pension_empleado', '238030', 'Aportes pensión empleado', 'credito'),
    (p_company_id, 'fondo_solidaridad', '238033', 'Fondo de solidaridad pensional', 'credito'),
    (p_company_id, 'retencion_fuente', '236505', 'Retención en la fuente', 'credito'),
    
    -- Provisiones (Créditos - Pasivos)
    (p_company_id, 'cesantias', '261005', 'Cesantías consolidadas', 'credito'),
    (p_company_id, 'intereses_cesantias', '261010', 'Intereses sobre cesantías', 'credito'),
    (p_company_id, 'prima_servicios', '261505', 'Prima de servicios', 'credito'),
    (p_company_id, 'vacaciones', '261015', 'Vacaciones consolidadas', 'credito'),
    
    -- Neto a pagar (Crédito - Pasivo)
    (p_company_id, 'neto_pagar', '250505', 'Salarios por pagar', 'credito');
END;
$$;

-- Create index for performance
CREATE INDEX idx_accounting_mappings_company ON public.accounting_account_mappings(company_id);

-- Add comment for documentation
COMMENT ON TABLE public.accounting_account_mappings IS 'Configuración de cuentas PUC por empresa para exportación contable';