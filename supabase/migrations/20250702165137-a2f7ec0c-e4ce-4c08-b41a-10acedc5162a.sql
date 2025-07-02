
-- Crear índice único para la tabla payrolls para permitir upsert
-- Esto permitirá usar ON CONFLICT en la combinación company_id, employee_id, period_id

-- Primero, eliminamos duplicados existentes si los hay
DELETE FROM payrolls a USING (
  SELECT MIN(ctid) as ctid, company_id, employee_id, period_id
  FROM payrolls 
  WHERE period_id IS NOT NULL
  GROUP BY company_id, employee_id, period_id 
  HAVING COUNT(*) > 1
) b
WHERE a.company_id = b.company_id 
  AND a.employee_id = b.employee_id 
  AND a.period_id = b.period_id 
  AND a.ctid <> b.ctid;

-- Crear el índice único compuesto para permitir upsert
CREATE UNIQUE INDEX IF NOT EXISTS idx_payrolls_unique_period 
ON payrolls (company_id, employee_id, period_id) 
WHERE period_id IS NOT NULL;

-- Como alternativa, también podemos crear una restricción única
ALTER TABLE payrolls 
ADD CONSTRAINT unique_payroll_per_employee_period 
UNIQUE (company_id, employee_id, period_id);
