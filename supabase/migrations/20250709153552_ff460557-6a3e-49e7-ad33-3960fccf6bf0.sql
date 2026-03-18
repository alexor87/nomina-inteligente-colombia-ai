
-- Crear tabla para períodos de vacaciones aprobados
CREATE TABLE public.employee_vacation_periods (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  days_count INTEGER NOT NULL,
  observations TEXT,
  status TEXT NOT NULL DEFAULT 'pendiente',
  created_by UUID REFERENCES auth.users(id),
  processed_in_period_id UUID REFERENCES public.payroll_periods_real(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Validaciones a nivel de tabla
  CONSTRAINT valid_date_range CHECK (end_date >= start_date),
  CONSTRAINT valid_days_count CHECK (days_count > 0),
  CONSTRAINT valid_status CHECK (status IN ('pendiente', 'liquidado', 'cancelado'))
);

-- Habilitar RLS
ALTER TABLE public.employee_vacation_periods ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para que usuarios solo vean vacaciones de su empresa
CREATE POLICY "Users can view company vacation periods" 
  ON public.employee_vacation_periods 
  FOR SELECT 
  USING (company_id = get_current_user_company_id());

CREATE POLICY "Users can create company vacation periods" 
  ON public.employee_vacation_periods 
  FOR INSERT 
  WITH CHECK (company_id = get_current_user_company_id() AND created_by = auth.uid());

CREATE POLICY "Users can update company vacation periods" 
  ON public.employee_vacation_periods 
  FOR UPDATE 
  USING (company_id = get_current_user_company_id())
  WITH CHECK (company_id = get_current_user_company_id());

CREATE POLICY "Users can delete company vacation periods" 
  ON public.employee_vacation_periods 
  FOR DELETE 
  USING (company_id = get_current_user_company_id() AND status = 'pendiente');

-- Índices para optimizar consultas
CREATE INDEX idx_vacation_periods_employee ON public.employee_vacation_periods(employee_id);
CREATE INDEX idx_vacation_periods_company ON public.employee_vacation_periods(company_id);
CREATE INDEX idx_vacation_periods_dates ON public.employee_vacation_periods(start_date, end_date);
CREATE INDEX idx_vacation_periods_status ON public.employee_vacation_periods(status);

-- Trigger para actualizar updated_at
CREATE TRIGGER update_vacation_periods_updated_at
  BEFORE UPDATE ON public.employee_vacation_periods
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
