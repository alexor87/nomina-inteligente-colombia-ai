
-- Crear tabla para sincronización de datos históricos
CREATE TABLE IF NOT EXISTS public.payroll_sync_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  period_id UUID NOT NULL,
  sync_type TEXT NOT NULL,
  records_created INTEGER DEFAULT 0,
  records_updated INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- RLS para sync log
ALTER TABLE public.payroll_sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their company sync logs" 
  ON public.payroll_sync_log 
  FOR SELECT 
  USING (company_id = get_current_user_company_id());

CREATE POLICY "Users can create sync logs for their company" 
  ON public.payroll_sync_log 
  FOR INSERT 
  WITH CHECK (company_id = get_current_user_company_id());

-- Función para sincronizar datos históricos de períodos cerrados
CREATE OR REPLACE FUNCTION public.sync_historical_payroll_data(
  p_period_id UUID,
  p_company_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  period_record RECORD;
  employee_record RECORD;
  sync_log_id UUID;
  records_created INTEGER := 0;
  result JSONB;
BEGIN
  -- Validar acceso del usuario
  IF p_company_id IS NULL THEN
    p_company_id := get_current_user_company_id();
  END IF;
  
  IF p_company_id IS NULL THEN
    RAISE EXCEPTION 'No se pudo determinar la empresa del usuario';
  END IF;

  -- Crear log de sincronización
  INSERT INTO public.payroll_sync_log (
    company_id, period_id, sync_type, status
  ) VALUES (
    p_company_id, p_period_id, 'historical_sync', 'processing'
  ) RETURNING id INTO sync_log_id;

  -- Obtener información del período
  SELECT * INTO period_record
  FROM public.payroll_periods_real 
  WHERE id = p_period_id AND company_id = p_company_id;
  
  IF NOT FOUND THEN
    UPDATE public.payroll_sync_log 
    SET status = 'error', error_message = 'Período no encontrado'
    WHERE id = sync_log_id;
    
    RETURN jsonb_build_object('success', false, 'message', 'Período no encontrado');
  END IF;

  -- Si ya existen registros en payrolls para este período, no hacer nada
  IF EXISTS (
    SELECT 1 FROM public.payrolls 
    WHERE company_id = p_company_id 
    AND (period_id = p_period_id OR periodo = period_record.periodo)
  ) THEN
    UPDATE public.payroll_sync_log 
    SET status = 'completed', records_created = 0, completed_at = now()
    WHERE id = sync_log_id;
    
    RETURN jsonb_build_object('success', true, 'message', 'Ya existen registros para este período');
  END IF;

  -- Crear registros básicos para empleados activos
  FOR employee_record IN
    SELECT * FROM public.employees 
    WHERE company_id = p_company_id AND estado = 'activo'
  LOOP
    INSERT INTO public.payrolls (
      company_id,
      employee_id,
      periodo,
      period_id,
      salario_base,
      dias_trabajados,
      total_devengado,
      total_deducciones,
      neto_pagado,
      estado,
      created_at
    ) VALUES (
      p_company_id,
      employee_record.id,
      period_record.periodo,
      p_period_id,
      employee_record.salario_base,
      COALESCE(employee_record.dias_trabajo, 30),
      employee_record.salario_base, -- Valor básico
      employee_record.salario_base * 0.08, -- 8% deducciones aproximadas
      employee_record.salario_base * 0.92, -- Neto aproximado
      'cerrado',
      period_record.created_at
    );
    
    records_created := records_created + 1;
  END LOOP;

  -- Actualizar log de sincronización
  UPDATE public.payroll_sync_log 
  SET 
    status = 'completed',
    records_created = records_created,
    completed_at = now()
  WHERE id = sync_log_id;

  RETURN jsonb_build_object(
    'success', true, 
    'message', format('Se crearon %s registros históricos', records_created),
    'records_created', records_created
  );

EXCEPTION WHEN OTHERS THEN
  -- Actualizar log con error
  UPDATE public.payroll_sync_log 
  SET 
    status = 'error',
    error_message = SQLERRM,
    completed_at = now()
  WHERE id = sync_log_id;
  
  RAISE;
END;
$$;
