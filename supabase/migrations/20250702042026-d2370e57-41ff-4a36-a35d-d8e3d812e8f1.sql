-- FASE 1: Migración crítica para corregir liquidación de nómina

-- Paso 1: Agregar campo period_id a tabla payrolls
ALTER TABLE public.payrolls 
ADD COLUMN period_id UUID REFERENCES public.payroll_periods_real(id) ON DELETE CASCADE;

-- Paso 2: Crear índice para mejor performance
CREATE INDEX IF NOT EXISTS idx_payrolls_period_id ON public.payrolls(period_id);

-- Paso 3: Migrar datos existentes - poblar period_id basado en periodo y company_id
UPDATE public.payrolls 
SET period_id = (
  SELECT pr.id 
  FROM public.payroll_periods_real pr
  WHERE pr.company_id = payrolls.company_id
    AND pr.periodo = payrolls.periodo
  LIMIT 1
)
WHERE period_id IS NULL;

-- Paso 4: Estandarizar campo periodo en payroll_periods_real para consistencia
UPDATE public.payroll_periods_real 
SET periodo = CONCAT(fecha_inicio, '-', fecha_fin)
WHERE periodo IS NULL OR periodo = '';