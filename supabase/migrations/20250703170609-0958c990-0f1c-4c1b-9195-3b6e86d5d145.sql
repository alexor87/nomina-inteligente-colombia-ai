
-- Actualizar el estado del período "1 - 15 Julio 2025" de borrador a cerrado
UPDATE public.payroll_periods_real 
SET estado = 'cerrado',
    updated_at = now()
WHERE periodo = '1 - 15 Julio 2025' 
  AND estado = 'borrador';

-- Verificar que se actualizó correctamente
SELECT id, periodo, estado, updated_at 
FROM public.payroll_periods_real 
WHERE periodo = '1 - 15 Julio 2025';
