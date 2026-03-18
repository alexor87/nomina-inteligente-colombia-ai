
-- Crear tabla de configuración de empresa
CREATE TABLE IF NOT EXISTS public.company_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  periodicity TEXT NOT NULL DEFAULT 'mensual' CHECK (periodicity IN ('mensual', 'quincenal', 'semanal', 'personalizado')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(company_id)
);

-- Crear tabla de períodos de nómina
CREATE TABLE IF NOT EXISTS public.payroll_periods (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE NOT NULL,
  estado TEXT NOT NULL DEFAULT 'borrador' CHECK (estado IN ('borrador', 'en_proceso', 'cerrado', 'aprobado')),
  tipo_periodo TEXT NOT NULL DEFAULT 'mensual' CHECK (tipo_periodo IN ('mensual', 'quincenal', 'semanal', 'personalizado')),
  modificado_por UUID REFERENCES auth.users(id),
  modificado_en TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT valid_date_range CHECK (fecha_fin >= fecha_inicio),
  CONSTRAINT reasonable_period_length CHECK (fecha_fin - fecha_inicio <= 31)
);

-- Habilitar RLS en ambas tablas
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_periods ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para company_settings
CREATE POLICY "Users can view their company settings" 
  ON public.company_settings 
  FOR SELECT 
  USING (
    company_id IN (
      SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their company settings" 
  ON public.company_settings 
  FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

-- Políticas RLS para payroll_periods
CREATE POLICY "Users can view their company payroll periods" 
  ON public.payroll_periods 
  FOR SELECT 
  USING (
    company_id IN (
      SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their company payroll periods" 
  ON public.payroll_periods 
  FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

-- Insertar configuración por defecto para empresas existentes
INSERT INTO public.company_settings (company_id, periodicity)
SELECT id, 'mensual' 
FROM public.companies 
WHERE id NOT IN (SELECT company_id FROM public.company_settings);

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_company_settings_updated_at 
    BEFORE UPDATE ON public.company_settings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payroll_periods_updated_at 
    BEFORE UPDATE ON public.payroll_periods 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
