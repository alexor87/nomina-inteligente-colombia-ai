
-- Simplificar la política RLS de DELETE para employee_vacation_periods
-- Eliminar la política actual compleja
DROP POLICY IF EXISTS "Users can delete company vacation periods" ON public.employee_vacation_periods;

-- Crear nueva política simple con lógica KISS
CREATE POLICY "Users can delete company vacation periods" 
ON public.employee_vacation_periods 
FOR DELETE 
USING (
  company_id = get_current_user_company_id() AND 
  (
    status = 'pendiente' OR 
    processed_in_period_id IS NULL OR
    EXISTS (
      SELECT 1 FROM payroll_periods_real ppr 
      WHERE ppr.id = processed_in_period_id 
      AND ppr.estado != 'cerrado'
    )
  )
);

-- Agregar comentario para documentar la lógica simplificada
COMMENT ON POLICY "Users can delete company vacation periods" ON public.employee_vacation_periods IS 
'LÓGICA SIMPLE: Permite eliminar si estado=pendiente O no tiene período asignado O el período no está cerrado';
