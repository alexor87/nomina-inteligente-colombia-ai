
-- SOLUCIÓN DEFINITIVA: Modificar política RLS para permitir eliminar registros liquidados
-- Aplicando principio KISS: Un cambio simple y directo

-- Eliminar la política restrictiva actual
DROP POLICY IF EXISTS "Users can delete company vacation periods" ON public.employee_vacation_periods;

-- Crear nueva política que permite eliminar registros pendientes Y liquidados
CREATE POLICY "Users can delete company vacation periods" 
ON public.employee_vacation_periods 
FOR DELETE 
USING (
  company_id IN (
    SELECT company_id 
    FROM profiles 
    WHERE user_id = auth.uid()
  ) 
  AND status IN ('pendiente', 'liquidada')
);

-- Agregar comentario explicativo
COMMENT ON POLICY "Users can delete company vacation periods" ON public.employee_vacation_periods IS 
'POLÍTICA KISS: Permite eliminar registros pendientes y liquidados de la empresa del usuario autenticado';
