-- FASE 5: Marcar el payroll de Eliana como stale para probar el sistema
-- Esta es una actualización temporal para demostrar el funcionamiento

UPDATE public.payrolls 
SET is_stale = true, updated_at = now()
WHERE period_id = '570c775d-a680-425c-9566-d6e38ae7f729'
AND employee_id IN (
  SELECT id FROM public.employees 
  WHERE nombre ILIKE '%eliana%' OR apellido ILIKE '%eliana%'
  LIMIT 1
);

-- También podemos marcar algunos otros registros para mostrar la funcionalidad completa
UPDATE public.payrolls 
SET is_stale = true, updated_at = now()
WHERE period_id = '570c775d-a680-425c-9566-d6e38ae7f729'
LIMIT 2;