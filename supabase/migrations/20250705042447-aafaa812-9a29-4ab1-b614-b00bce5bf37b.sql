
-- FASE 1: ESTABILIZACIÓN CRÍTICA DE DATOS
-- Paso 1: Sincronización forzada entre payroll_periods_real y payrolls

-- Actualizar períodos huérfanos en payrolls que no tienen period_id
UPDATE payrolls 
SET period_id = (
  SELECT pr.id 
  FROM payroll_periods_real pr
  WHERE pr.company_id = payrolls.company_id
    AND pr.periodo = payrolls.periodo
  LIMIT 1
)
WHERE period_id IS NULL;

-- Paso 2: Normalizar estados a solo 3 valores permitidos
UPDATE payroll_periods_real 
SET estado = CASE 
  WHEN estado IN ('borrador', 'draft') THEN 'draft'
  WHEN estado IN ('en_proceso', 'processing', 'active') THEN 'active'  
  WHEN estado IN ('cerrado', 'closed', 'completed') THEN 'closed'
  ELSE 'draft'
END;

UPDATE payrolls 
SET estado = CASE 
  WHEN estado IN ('borrador', 'draft') THEN 'draft'
  WHEN estado IN ('procesada', 'processing', 'active') THEN 'active'
  WHEN estado IN ('cerrada', 'closed', 'completed') THEN 'closed'
  ELSE 'draft'
END;

-- Paso 3: Crear constraint para prevenir estados inválidos
ALTER TABLE payroll_periods_real 
DROP CONSTRAINT IF EXISTS valid_period_status;

ALTER TABLE payroll_periods_real 
ADD CONSTRAINT valid_period_status 
CHECK (estado IN ('draft', 'active', 'closed'));

ALTER TABLE payrolls 
DROP CONSTRAINT IF EXISTS valid_payroll_status;

ALTER TABLE payrolls 
ADD CONSTRAINT valid_payroll_status 
CHECK (estado IN ('draft', 'active', 'closed'));

-- Paso 4: Crear índices estratégicos para optimizar queries frecuentes
CREATE INDEX IF NOT EXISTS idx_payroll_periods_company_status 
ON payroll_periods_real (company_id, estado, fecha_inicio DESC);

CREATE INDEX IF NOT EXISTS idx_payrolls_period_employee 
ON payrolls (period_id, employee_id);

CREATE INDEX IF NOT EXISTS idx_payrolls_company_period_status 
ON payrolls (company_id, periodo, estado);

-- Paso 5: Función para mantener sincronización automática
CREATE OR REPLACE FUNCTION sync_payroll_totals()
RETURNS TRIGGER AS $$
BEGIN
  -- Actualizar totales del período cuando se modifica un payroll
  UPDATE payroll_periods_real 
  SET 
    empleados_count = (
      SELECT COUNT(*) 
      FROM payrolls 
      WHERE period_id = NEW.period_id OR period_id = OLD.period_id
    ),
    total_devengado = (
      SELECT COALESCE(SUM(total_devengado), 0) 
      FROM payrolls 
      WHERE period_id = NEW.period_id OR period_id = OLD.period_id
    ),
    total_deducciones = (
      SELECT COALESCE(SUM(total_deducciones), 0) 
      FROM payrolls 
      WHERE period_id = NEW.period_id OR period_id = OLD.period_id
    ),
    total_neto = (
      SELECT COALESCE(SUM(neto_pagado), 0) 
      FROM payrolls 
      WHERE period_id = NEW.period_id OR period_id = OLD.period_id
    ),
    updated_at = now()
  WHERE id = NEW.period_id OR id = OLD.period_id;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Crear trigger para sincronización automática
DROP TRIGGER IF EXISTS trigger_sync_payroll_totals ON payrolls;
CREATE TRIGGER trigger_sync_payroll_totals
  AFTER INSERT OR UPDATE OR DELETE ON payrolls
  FOR EACH ROW EXECUTE FUNCTION sync_payroll_totals();

-- Paso 6: Limpiar registros duplicados definitivamente
WITH duplicate_periods AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY company_id, periodo 
      ORDER BY 
        CASE WHEN estado = 'closed' THEN 1 ELSE 2 END,
        created_at ASC
    ) as rn
  FROM payroll_periods_real
)
DELETE FROM payroll_periods_real 
WHERE id IN (
  SELECT id FROM duplicate_periods WHERE rn > 1
);

-- Paso 7: Función mejorada para detectar período actual
CREATE OR REPLACE FUNCTION get_current_active_period(p_company_id uuid)
RETURNS TABLE(
  period_id uuid,
  period_name text,
  status text,
  start_date date,
  end_date date,
  can_continue boolean,
  needs_creation boolean
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Buscar período activo primero
  RETURN QUERY
  SELECT 
    pr.id,
    pr.periodo,
    pr.estado,
    pr.fecha_inicio,
    pr.fecha_fin,
    true as can_continue,
    false as needs_creation
  FROM payroll_periods_real pr
  WHERE pr.company_id = p_company_id
    AND pr.estado IN ('draft', 'active')
  ORDER BY pr.created_at DESC
  LIMIT 1;
  
  -- Si no hay período activo, indicar que se necesita crear uno
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT 
      NULL::uuid,
      'Nuevo período'::text,
      'needs_creation'::text,
      CURRENT_DATE,
      CURRENT_DATE + INTERVAL '30 days',
      false as can_continue,
      true as needs_creation;
  END IF;
END;
$$;
