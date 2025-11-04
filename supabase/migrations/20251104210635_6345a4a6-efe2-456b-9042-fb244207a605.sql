-- Add ibc_snapshot field to payrolls table for professional IBC tracking
ALTER TABLE public.payrolls 
ADD COLUMN IF NOT EXISTS ibc_snapshot JSONB;

-- Add comment explaining the structure
COMMENT ON COLUMN public.payrolls.ibc_snapshot IS 
'Snapshot del cálculo de IBC original. Estructura: 
{
  "ibc_base_salario": number,
  "ibc_novedades_constitutivas": [
    {
      "novedad_id": "uuid",
      "tipo_novedad": "string",
      "valor": number,
      "dias": number,
      "constitutivo": boolean
    }
  ],
  "ibc_total": number,
  "fecha_calculo": "timestamp"
}';

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_payrolls_ibc_snapshot 
ON public.payrolls USING gin (ibc_snapshot);