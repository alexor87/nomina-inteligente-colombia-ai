
-- Agregar campos necesarios a la tabla payrolls para trazabilidad
ALTER TABLE public.payrolls 
ADD COLUMN IF NOT EXISTS editable boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS reabierto_por uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS fecha_reapertura timestamp with time zone,
ADD COLUMN IF NOT EXISTS reportado_dian boolean DEFAULT false;

-- Crear tabla para auditoría de reaperturas de períodos
CREATE TABLE IF NOT EXISTS public.payroll_reopen_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id),
  periodo text NOT NULL,
  user_id uuid NOT NULL,
  user_email text NOT NULL,
  action text NOT NULL, -- 'reabierto' o 'cerrado_nuevamente'
  previous_state text,
  new_state text,
  has_vouchers boolean DEFAULT false,
  notes text,
  created_at timestamp with time zone DEFAULT now()
);

-- Habilitar RLS en la nueva tabla
ALTER TABLE public.payroll_reopen_audit ENABLE ROW LEVEL SECURITY;

-- Política para que solo usuarios de la empresa puedan ver sus logs
CREATE POLICY "Users can view company reopen audit logs"
ON public.payroll_reopen_audit
FOR SELECT
USING (
  company_id IN (
    SELECT company_id 
    FROM public.profiles 
    WHERE user_id = auth.uid()
  )
);

-- Política para insertar logs
CREATE POLICY "Users can create reopen audit logs"
ON public.payroll_reopen_audit
FOR INSERT
WITH CHECK (
  company_id IN (
    SELECT company_id 
    FROM public.profiles 
    WHERE user_id = auth.uid()
  )
);

-- Crear índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_payroll_reopen_audit_company_periodo 
ON public.payroll_reopen_audit(company_id, periodo);

CREATE INDEX IF NOT EXISTS idx_payroll_reopen_audit_created_at 
ON public.payroll_reopen_audit(created_at DESC);
