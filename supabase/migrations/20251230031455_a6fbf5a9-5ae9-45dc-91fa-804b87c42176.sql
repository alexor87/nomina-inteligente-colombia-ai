-- Limpiar nóminas procesadas para períodos anteriores a la fecha de ingreso del empleado
-- Este es un problema sistémico que afecta a 11 empleados con ~89 registros incorrectos

-- Primero identificamos cuántos registros serán afectados
DO $$
DECLARE
  affected_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO affected_count
  FROM payrolls p
  JOIN employees e ON p.employee_id = e.id
  JOIN payroll_periods_real ppr ON p.period_id = ppr.id
  WHERE ppr.fecha_fin < e.fecha_ingreso;
  
  RAISE NOTICE 'Registros de payrolls a eliminar: %', affected_count;
END $$;

-- Eliminar nóminas donde el período termina antes de la fecha de ingreso
DELETE FROM payrolls
WHERE id IN (
  SELECT p.id
  FROM payrolls p
  JOIN employees e ON p.employee_id = e.id
  JOIN payroll_periods_real ppr ON p.period_id = ppr.id
  WHERE ppr.fecha_fin < e.fecha_ingreso
);

-- Crear función de validación para prevenir futuras inserciones incorrectas
CREATE OR REPLACE FUNCTION public.validate_payroll_hire_date()
RETURNS TRIGGER AS $$
DECLARE
  emp_fecha_ingreso DATE;
  period_fecha_fin DATE;
BEGIN
  -- Obtener fecha de ingreso del empleado
  SELECT fecha_ingreso INTO emp_fecha_ingreso 
  FROM employees WHERE id = NEW.employee_id;
  
  -- Obtener fecha fin del período (si existe period_id)
  IF NEW.period_id IS NOT NULL THEN
    SELECT fecha_fin INTO period_fecha_fin 
    FROM payroll_periods_real WHERE id = NEW.period_id;
    
    -- Validar que el período no termine antes de la fecha de ingreso
    IF period_fecha_fin IS NOT NULL AND emp_fecha_ingreso IS NOT NULL 
       AND period_fecha_fin < emp_fecha_ingreso THEN
      RAISE EXCEPTION 'No se puede crear nómina para período (%) que termina antes de la fecha de ingreso del empleado (%)', 
        period_fecha_fin, emp_fecha_ingreso;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Crear trigger que se ejecuta antes de insertar o actualizar payrolls
DROP TRIGGER IF EXISTS check_payroll_hire_date ON payrolls;
CREATE TRIGGER check_payroll_hire_date
  BEFORE INSERT OR UPDATE ON payrolls
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_payroll_hire_date();