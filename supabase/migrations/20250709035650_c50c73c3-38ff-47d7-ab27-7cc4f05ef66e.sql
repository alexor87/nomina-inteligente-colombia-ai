
-- Crear tabla para balance de vacaciones con enfoque KISS
CREATE TABLE public.employee_vacation_balances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  accumulated_days DECIMAL(5,2) DEFAULT 0,
  initial_balance DECIMAL(5,2) DEFAULT 0,
  last_calculated DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(employee_id, company_id)
);

-- Habilitar RLS para la tabla
ALTER TABLE public.employee_vacation_balances ENABLE ROW LEVEL SECURITY;

-- Política para que los usuarios puedan gestionar vacaciones de empleados de su empresa
CREATE POLICY "Users can manage vacation balances for their company employees" 
ON public.employee_vacation_balances 
FOR ALL 
USING (company_id = get_current_user_company_id())
WITH CHECK (company_id = get_current_user_company_id());

-- Trigger para actualizar updated_at
CREATE TRIGGER update_employee_vacation_balances_updated_at
    BEFORE UPDATE ON public.employee_vacation_balances
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Comentarios para documentar la tabla
COMMENT ON TABLE public.employee_vacation_balances IS 'Tabla para almacenar el balance de vacaciones de empleados. Fase 1: Solo captura balance inicial.';
COMMENT ON COLUMN public.employee_vacation_balances.initial_balance IS 'Días de vacaciones que el empleado tenía acumulados al momento de su registro en el sistema';
COMMENT ON COLUMN public.employee_vacation_balances.accumulated_days IS 'Días de vacaciones acumulados automáticamente por el sistema (será usado en Fase 2)';
