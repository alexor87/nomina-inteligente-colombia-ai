
-- 1. Identificar empleados duplicados por cédula y empresa
WITH duplicate_employees AS (
  SELECT 
    cedula,
    company_id,
    COUNT(*) as duplicate_count,
    array_agg(id ORDER BY created_at ASC) as employee_ids,
    array_agg(created_at ORDER BY created_at ASC) as creation_dates
  FROM employees 
  WHERE cedula IS NOT NULL AND cedula != ''
  GROUP BY cedula, company_id 
  HAVING COUNT(*) > 1
),
-- 2. Preparar consolidación de datos
consolidation_plan AS (
  SELECT 
    cedula,
    company_id,
    employee_ids[1] as keep_id, -- El más antiguo
    employee_ids[2:] as delete_ids -- Los demás
  FROM duplicate_employees
)
-- 3. Actualizar referencias en tablas relacionadas
UPDATE payrolls 
SET employee_id = cp.keep_id
FROM consolidation_plan cp
WHERE payrolls.employee_id = ANY(cp.delete_ids)
AND payrolls.company_id = cp.company_id;

-- 4. Actualizar referencias en employee_vacation_periods
UPDATE employee_vacation_periods 
SET employee_id = cp.keep_id
FROM consolidation_plan cp
WHERE employee_vacation_periods.employee_id = ANY(cp.delete_ids)
AND employee_vacation_periods.company_id = cp.company_id;

-- 5. Actualizar referencias en employee_vacation_balances
UPDATE employee_vacation_balances 
SET employee_id = cp.keep_id
FROM consolidation_plan cp
WHERE employee_vacation_balances.employee_id = ANY(cp.delete_ids)
AND employee_vacation_balances.company_id = cp.company_id;

-- 6. Actualizar referencias en employee_notes
UPDATE employee_notes 
SET employee_id = cp.keep_id
FROM consolidation_plan cp
WHERE employee_notes.employee_id = ANY(cp.delete_ids)
AND employee_notes.company_id = cp.company_id;

-- 7. Eliminar empleados duplicados
DELETE FROM employees 
WHERE id IN (
  SELECT unnest(delete_ids)
  FROM consolidation_plan
);

-- 8. Crear constraint único para prevenir duplicados futuros
ALTER TABLE employees 
ADD CONSTRAINT unique_employee_cedula_company 
UNIQUE (cedula, company_id);

-- 9. Crear índice para mejorar performance en búsquedas por cédula
CREATE INDEX IF NOT EXISTS idx_employees_cedula_company 
ON employees (cedula, company_id) 
WHERE cedula IS NOT NULL AND cedula != '';
