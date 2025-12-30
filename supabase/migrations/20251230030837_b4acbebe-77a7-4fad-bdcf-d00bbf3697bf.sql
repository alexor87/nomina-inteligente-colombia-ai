-- Limpiar provisiones de prestaciones sociales calculadas para períodos anteriores a la fecha de ingreso del empleado
-- Esto corrige datos inconsistentes donde se calcularon provisiones antes de que el empleado ingresara

-- Primero identificamos cuántos registros serán afectados
DO $$
DECLARE
  affected_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO affected_count
  FROM social_benefit_calculations sbc
  JOIN employees e ON sbc.employee_id = e.id
  WHERE sbc.period_end < e.fecha_ingreso
    AND sbc.estado = 'calculado';
  
  RAISE NOTICE 'Registros de provisiones a eliminar: %', affected_count;
END $$;

-- Eliminar provisiones donde el período termina antes de la fecha de ingreso del empleado
DELETE FROM social_benefit_calculations
WHERE id IN (
  SELECT sbc.id
  FROM social_benefit_calculations sbc
  JOIN employees e ON sbc.employee_id = e.id
  WHERE sbc.period_end < e.fecha_ingreso
    AND sbc.estado = 'calculado'
);