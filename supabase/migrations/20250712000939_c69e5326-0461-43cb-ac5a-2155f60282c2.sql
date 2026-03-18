
-- Migración específica para eliminar duplicados restantes
-- Verificar y limpiar duplicados que no fueron capturados anteriormente

-- 1. Primero, verificar si existe la restricción única y eliminarla temporalmente
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'unique_employee_cedula_company' 
        AND table_name = 'employees'
    ) THEN
        ALTER TABLE employees DROP CONSTRAINT unique_employee_cedula_company;
        RAISE NOTICE 'Restricción única eliminada temporalmente';
    END IF;
END $$;

-- 2. Identificar TODOS los duplicados (incluyendo los que pudieron haberse perdido)
WITH all_duplicates AS (
  SELECT 
    cedula,
    company_id,
    COUNT(*) as total_count,
    array_agg(id ORDER BY created_at DESC, id DESC) as all_ids,
    array_agg(nombre || ' ' || apellido ORDER BY created_at DESC, id DESC) as names,
    array_agg(created_at ORDER BY created_at DESC, id DESC) as dates
  FROM employees 
  WHERE cedula IS NOT NULL 
    AND cedula != ''
    AND LENGTH(TRIM(cedula)) > 0
  GROUP BY cedula, company_id 
  HAVING COUNT(*) > 1
),
-- 3. Preparar plan de consolidación más detallado
detailed_consolidation AS (
  SELECT 
    cedula,
    company_id,
    total_count,
    all_ids[1] as keep_id, -- El más reciente (primero en el array)
    all_ids[2:] as delete_ids, -- Todos los demás
    names[1] as keep_name,
    dates[1] as keep_date
  FROM all_duplicates
)
-- 4. Log de duplicados encontrados (para debug)
SELECT 
  'DUPLICADOS ENCONTRADOS:' as info,
  cedula,
  company_id,
  total_count,
  keep_name,
  keep_date
FROM detailed_consolidation;

-- 5. Actualizar todas las referencias en payrolls
WITH all_duplicates AS (
  SELECT 
    cedula,
    company_id,
    array_agg(id ORDER BY created_at DESC, id DESC) as all_ids
  FROM employees 
  WHERE cedula IS NOT NULL 
    AND cedula != ''
    AND LENGTH(TRIM(cedula)) > 0
  GROUP BY cedula, company_id 
  HAVING COUNT(*) > 1
),
consolidation_plan AS (
  SELECT 
    cedula,
    company_id,
    all_ids[1] as keep_id,
    all_ids[2:] as delete_ids
  FROM all_duplicates
)
UPDATE payrolls 
SET employee_id = cp.keep_id
FROM consolidation_plan cp
WHERE payrolls.employee_id = ANY(cp.delete_ids)
AND payrolls.company_id = cp.company_id;

-- 6. Actualizar referencias en employee_vacation_periods
WITH all_duplicates AS (
  SELECT 
    cedula,
    company_id,
    array_agg(id ORDER BY created_at DESC, id DESC) as all_ids
  FROM employees 
  WHERE cedula IS NOT NULL 
    AND cedula != ''
    AND LENGTH(TRIM(cedula)) > 0
  GROUP BY cedula, company_id 
  HAVING COUNT(*) > 1
),
consolidation_plan AS (
  SELECT 
    cedula,
    company_id,
    all_ids[1] as keep_id,
    all_ids[2:] as delete_ids
  FROM all_duplicates
)
UPDATE employee_vacation_periods 
SET employee_id = cp.keep_id
FROM consolidation_plan cp
WHERE employee_vacation_periods.employee_id = ANY(cp.delete_ids)
AND employee_vacation_periods.company_id = cp.company_id;

-- 7. Actualizar referencias en employee_vacation_balances
WITH all_duplicates AS (
  SELECT 
    cedula,
    company_id,
    array_agg(id ORDER BY created_at DESC, id DESC) as all_ids
  FROM employees 
  WHERE cedula IS NOT NULL 
    AND cedula != ''
    AND LENGTH(TRIM(cedula)) > 0
  GROUP BY cedula, company_id 
  HAVING COUNT(*) > 1
),
consolidation_plan AS (
  SELECT 
    cedula,
    company_id,
    all_ids[1] as keep_id,
    all_ids[2:] as delete_ids
  FROM all_duplicates
)
UPDATE employee_vacation_balances 
SET employee_id = cp.keep_id
FROM consolidation_plan cp
WHERE employee_vacation_balances.employee_id = ANY(cp.delete_ids)
AND employee_vacation_balances.company_id = cp.company_id;

-- 8. Actualizar referencias en employee_notes
WITH all_duplicates AS (
  SELECT 
    cedula,
    company_id,
    array_agg(id ORDER BY created_at DESC, id DESC) as all_ids
  FROM employees 
  WHERE cedula IS NOT NULL 
    AND cedula != ''
    AND LENGTH(TRIM(cedula)) > 0
  GROUP BY cedula, company_id 
  HAVING COUNT(*) > 1
),
consolidation_plan AS (
  SELECT 
    cedula,
    company_id,
    all_ids[1] as keep_id,
    all_ids[2:] as delete_ids
  FROM all_duplicates
)
UPDATE employee_notes 
SET employee_id = cp.keep_id
FROM consolidation_plan cp
WHERE employee_notes.employee_id = ANY(cp.delete_ids)
AND employee_notes.company_id = cp.company_id;

-- 9. ELIMINAR los empleados duplicados (mantener solo el más reciente)
WITH all_duplicates AS (
  SELECT 
    cedula,
    company_id,
    array_agg(id ORDER BY created_at DESC, id DESC) as all_ids
  FROM employees 
  WHERE cedula IS NOT NULL 
    AND cedula != ''
    AND LENGTH(TRIM(cedula)) > 0
  GROUP BY cedula, company_id 
  HAVING COUNT(*) > 1
),
to_delete AS (
  SELECT 
    unnest(all_ids[2:]) as delete_id
  FROM all_duplicates
)
DELETE FROM employees 
WHERE id IN (SELECT delete_id FROM to_delete);

-- 10. Recrear la restricción única de forma más robusta
ALTER TABLE employees 
ADD CONSTRAINT unique_employee_cedula_company 
UNIQUE (cedula, company_id)
DEFERRABLE INITIALLY DEFERRED;

-- 11. Recrear índice optimizado
DROP INDEX IF EXISTS idx_employees_cedula_company;
CREATE INDEX idx_employees_cedula_company 
ON employees (cedula, company_id) 
WHERE cedula IS NOT NULL AND cedula != '' AND LENGTH(TRIM(cedula)) > 0;

-- 12. Verificación final
DO $$
DECLARE
  duplicate_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO duplicate_count
  FROM (
    SELECT cedula, company_id, COUNT(*) as cnt
    FROM employees 
    WHERE cedula IS NOT NULL AND cedula != ''
    GROUP BY cedula, company_id
    HAVING COUNT(*) > 1
  ) as remaining_duplicates;
  
  RAISE NOTICE 'Duplicados restantes después de la limpieza: %', duplicate_count;
  
  IF duplicate_count = 0 THEN
    RAISE NOTICE '✅ LIMPIEZA COMPLETADA - No quedan duplicados';
  ELSE
    RAISE WARNING '⚠️ Aún quedan % duplicados por resolver', duplicate_count;
  END IF;
END $$;
