
-- SOLUCIÓN DEFINITIVA: Política RLS ultra-simple para eliminación
-- Eliminar la política actual que falla
DROP POLICY IF EXISTS "Users can delete company vacation periods" ON public.employee_vacation_periods;

-- Crear política súper simple usando directamente la tabla profiles
CREATE POLICY "Users can delete company vacation periods" 
ON public.employee_vacation_periods 
FOR DELETE 
USING (
  company_id IN (
    SELECT company_id 
    FROM profiles 
    WHERE user_id = auth.uid()
  ) 
  AND status = 'pendiente'
);

-- Agregar comentario explicativo
COMMENT ON POLICY "Users can delete company vacation periods" ON public.employee_vacation_periods IS 
'POLÍTICA ULTRA-SIMPLE: Solo permite eliminar registros pendientes de la empresa del usuario autenticado';
