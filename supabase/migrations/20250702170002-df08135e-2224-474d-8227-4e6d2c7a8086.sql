
-- PASO 1: Limpiar restricciones conflictivas y asegurar integridad de datos

-- Eliminar la restricción antigua que está causando conflictos
ALTER TABLE payrolls DROP CONSTRAINT IF EXISTS payrolls_employee_id_periodo_key;

-- Eliminar el índice único anterior si existe
DROP INDEX IF EXISTS payrolls_employee_id_periodo_key;

-- Limpiar registros duplicados basados en la nueva restricción
WITH duplicates AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY company_id, employee_id, period_id 
      ORDER BY created_at DESC, id DESC
    ) as rn
  FROM payrolls 
  WHERE period_id IS NOT NULL
)
DELETE FROM payrolls 
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- Eliminar registros huérfanos que no tienen period_id válido
DELETE FROM payrolls 
WHERE period_id IS NULL OR period_id NOT IN (
  SELECT id FROM payroll_periods_real
);

-- Asegurar que la restricción única esté activa
ALTER TABLE payrolls 
DROP CONSTRAINT IF EXISTS unique_payroll_per_employee_period;

ALTER TABLE payrolls 
ADD CONSTRAINT unique_payroll_per_employee_period 
UNIQUE (company_id, employee_id, period_id);

-- Crear índice para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_payrolls_period_lookup 
ON payrolls (period_id, company_id, employee_id);

-- Verificar integridad de datos
DO $$
DECLARE
  duplicate_count INTEGER;
  orphan_count INTEGER;
BEGIN
  -- Contar duplicados restantes
  SELECT COUNT(*) INTO duplicate_count
  FROM (
    SELECT company_id, employee_id, period_id, COUNT(*) as cnt
    FROM payrolls 
    WHERE period_id IS NOT NULL
    GROUP BY company_id, employee_id, period_id
    HAVING COUNT(*) > 1
  ) as dups;

  -- Contar registros huérfanos
  SELECT COUNT(*) INTO orphan_count
  FROM payrolls p
  LEFT JOIN payroll_periods_real pr ON p.period_id = pr.id
  WHERE p.period_id IS NOT NULL AND pr.id IS NULL;

  RAISE NOTICE 'Limpieza completada - Duplicados restantes: %, Huérfanos: %', duplicate_count, orphan_count;
END $$;
