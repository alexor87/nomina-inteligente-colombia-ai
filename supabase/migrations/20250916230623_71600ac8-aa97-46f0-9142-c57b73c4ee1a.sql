-- FASE 5: Marcar payrolls como stale para probar el sistema
-- Esta es una actualización temporal para demostrar el funcionamiento

-- Marcar payrolls específicos como stale para testing
UPDATE public.payrolls 
SET is_stale = true, updated_at = now()
WHERE period_id = '570c775d-a680-425c-9566-d6e38ae7f729'
AND id IN (
  SELECT id FROM public.payrolls 
  WHERE period_id = '570c775d-a680-425c-9566-d6e38ae7f729'
  ORDER BY updated_at DESC
  LIMIT 2
);