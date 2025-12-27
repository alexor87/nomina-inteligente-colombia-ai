-- 1. Crear tabla social_benefit_payments para registrar pagos/liquidaciones
CREATE TABLE public.social_benefit_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  benefit_type TEXT NOT NULL CHECK (benefit_type IN ('cesantias', 'intereses_cesantias', 'prima', 'vacaciones')),
  period_label TEXT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  employees_count INTEGER NOT NULL DEFAULT 0,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  payment_details JSONB DEFAULT '{}'::jsonb,
  estado TEXT NOT NULL DEFAULT 'pagado' CHECK (estado IN ('pagado', 'anulado')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Habilitar RLS
ALTER TABLE public.social_benefit_payments ENABLE ROW LEVEL SECURITY;

-- 3. Política para que usuarios autenticados puedan ver pagos de su compañía
CREATE POLICY "Users can view their company payments"
ON public.social_benefit_payments
FOR SELECT
USING (
  company_id IN (
    SELECT company_id FROM public.profiles WHERE id = auth.uid()
  )
);

-- 4. Política para insertar pagos
CREATE POLICY "Users can insert payments for their company"
ON public.social_benefit_payments
FOR INSERT
WITH CHECK (
  company_id IN (
    SELECT company_id FROM public.profiles WHERE id = auth.uid()
  )
);

-- 5. Política para actualizar pagos (anular)
CREATE POLICY "Users can update payments for their company"
ON public.social_benefit_payments
FOR UPDATE
USING (
  company_id IN (
    SELECT company_id FROM public.profiles WHERE id = auth.uid()
  )
);

-- 6. Índices para rendimiento
CREATE INDEX idx_sbp_company_type ON public.social_benefit_payments(company_id, benefit_type);
CREATE INDEX idx_sbp_period ON public.social_benefit_payments(period_start, period_end);

-- 7. Agregar columna payment_id a social_benefit_calculations para trazabilidad
ALTER TABLE public.social_benefit_calculations 
ADD COLUMN IF NOT EXISTS payment_id UUID REFERENCES public.social_benefit_payments(id);

-- 8. Índice para la nueva columna
CREATE INDEX IF NOT EXISTS idx_sbc_payment_id ON public.social_benefit_calculations(payment_id);

-- 9. Actualizar constraint de estado en social_benefit_calculations para incluir 'liquidado'
ALTER TABLE public.social_benefit_calculations 
DROP CONSTRAINT IF EXISTS social_benefit_calculations_estado_check;

ALTER TABLE public.social_benefit_calculations 
ADD CONSTRAINT social_benefit_calculations_estado_check 
CHECK (estado IN ('calculado', 'liquidado', 'anulado'));