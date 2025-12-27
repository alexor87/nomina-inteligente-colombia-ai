-- ============================================
-- Migración: Campos de anulación para liquidaciones de prestaciones sociales
-- ============================================

-- 1. Agregar campos de anulación a social_benefit_payments
ALTER TABLE social_benefit_payments 
ADD COLUMN IF NOT EXISTS anulado BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS anulado_por UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS anulado_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS anulacion_motivo TEXT;

-- 2. Actualizar constraint de estado en social_benefit_calculations para incluir 'anulado'
-- Primero eliminamos el constraint existente si lo hay
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'social_benefit_calculations_estado_check'
        AND table_name = 'social_benefit_calculations'
    ) THEN
        ALTER TABLE social_benefit_calculations DROP CONSTRAINT social_benefit_calculations_estado_check;
    END IF;
END $$;

-- Agregar el nuevo constraint con el estado 'anulado'
ALTER TABLE social_benefit_calculations 
ADD CONSTRAINT social_benefit_calculations_estado_check 
CHECK (estado IN ('calculado', 'liquidado', 'anulado'));

-- 3. Crear índice para búsquedas de liquidaciones no anuladas
CREATE INDEX IF NOT EXISTS idx_social_benefit_payments_active 
ON social_benefit_payments (company_id, benefit_type, period_start, period_end) 
WHERE anulado = false;

-- 4. Crear índice para historial de anulaciones
CREATE INDEX IF NOT EXISTS idx_social_benefit_payments_anulado 
ON social_benefit_payments (company_id, anulado, created_at DESC);

-- 5. Agregar comentarios para documentación
COMMENT ON COLUMN social_benefit_payments.anulado IS 'Indica si la liquidación fue anulada';
COMMENT ON COLUMN social_benefit_payments.anulado_por IS 'Usuario que realizó la anulación';
COMMENT ON COLUMN social_benefit_payments.anulado_at IS 'Fecha y hora de la anulación';
COMMENT ON COLUMN social_benefit_payments.anulacion_motivo IS 'Razón o justificación de la anulación';