-- FASE 1: Crear bucket de storage para comprobantes de nómina
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) 
VALUES (
  'payroll-vouchers', 
  'payroll-vouchers', 
  false,
  10485760, -- 10MB limit
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Políticas RLS para acceso seguro por empresa (corregidas)
CREATE POLICY "Users can view their company voucher files" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'payroll-vouchers' 
  AND (storage.foldername(name))[1] IN (
    SELECT company_id::text FROM profiles WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can upload voucher files for their company" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'payroll-vouchers' 
  AND (storage.foldername(name))[1] IN (
    SELECT company_id::text FROM profiles WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their company voucher files" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'payroll-vouchers' 
  AND (storage.foldername(name))[1] IN (
    SELECT company_id::text FROM profiles WHERE user_id = auth.uid()
  )
);

-- FASE 2: Agregar configuración de empresa para almacenamiento automático
ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS auto_store_vouchers BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS voucher_retention_years INTEGER DEFAULT 7,
ADD COLUMN IF NOT EXISTS voucher_storage_enabled BOOLEAN DEFAULT true;

-- FASE 3: Actualizar tabla payroll_vouchers con campos adicionales
ALTER TABLE payroll_vouchers 
ADD COLUMN IF NOT EXISTS file_path TEXT,
ADD COLUMN IF NOT EXISTS file_size BIGINT,
ADD COLUMN IF NOT EXISTS storage_bucket TEXT DEFAULT 'payroll-vouchers',
ADD COLUMN IF NOT EXISTS auto_generated BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS generation_attempts INTEGER DEFAULT 0;

-- Índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_payroll_vouchers_company_period 
ON payroll_vouchers(company_id, start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_payroll_vouchers_pdf_url 
ON payroll_vouchers(pdf_url) WHERE pdf_url IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payroll_vouchers_status 
ON payroll_vouchers(voucher_status);