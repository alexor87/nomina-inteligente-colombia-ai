-- FASE 1: Crear bucket de storage para comprobantes de nómina
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) 
VALUES (
  'payroll-vouchers', 
  'payroll-vouchers', 
  false,
  10485760, -- 10MB limit
  ARRAY['application/pdf']
);

-- Políticas RLS para acceso seguro por empresa
CREATE POLICY "Users can view their company voucher files" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'payroll-vouchers' 
  AND (storage.foldername(name))[1]::uuid IN (
    SELECT company_id::text FROM profiles WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can upload voucher files for their company" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'payroll-vouchers' 
  AND (storage.foldername(name))[1]::uuid IN (
    SELECT company_id::text FROM profiles WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their company voucher files" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'payroll-vouchers' 
  AND (storage.foldername(name))[1]::uuid IN (
    SELECT company_id::text FROM profiles WHERE user_id = auth.uid()
  )
);

-- FASE 2: Agregar configuración de empresa para almacenamiento automático
ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS auto_store_vouchers BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS voucher_retention_years INTEGER DEFAULT 7,
ADD COLUMN IF NOT EXISTS voucher_storage_enabled BOOLEAN DEFAULT true;

-- Comentar en las columnas para documentación
COMMENT ON COLUMN companies.auto_store_vouchers IS 'Habilita almacenamiento automático de PDFs de comprobantes';
COMMENT ON COLUMN companies.voucher_retention_years IS 'Años de retención de comprobantes (cumplimiento legal)';
COMMENT ON COLUMN companies.voucher_storage_enabled IS 'Habilita el sistema de storage de comprobantes';

-- FASE 3: Actualizar tabla payroll_vouchers con campos adicionales
ALTER TABLE payroll_vouchers 
ADD COLUMN IF NOT EXISTS file_path TEXT,
ADD COLUMN IF NOT EXISTS file_size BIGINT,
ADD COLUMN IF NOT EXISTS storage_bucket TEXT DEFAULT 'payroll-vouchers',
ADD COLUMN IF NOT EXISTS auto_generated BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS generation_attempts INTEGER DEFAULT 0;

-- Comentarios para documentación
COMMENT ON COLUMN payroll_vouchers.file_path IS 'Ruta del archivo en Supabase Storage';
COMMENT ON COLUMN payroll_vouchers.file_size IS 'Tamaño del archivo PDF en bytes';
COMMENT ON COLUMN payroll_vouchers.storage_bucket IS 'Bucket donde se almacena el archivo';
COMMENT ON COLUMN payroll_vouchers.auto_generated IS 'Indica si el PDF fue generado automáticamente';
COMMENT ON COLUMN payroll_vouchers.generation_attempts IS 'Número de intentos de generación de PDF';

-- Índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_payroll_vouchers_company_period 
ON payroll_vouchers(company_id, start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_payroll_vouchers_pdf_url 
ON payroll_vouchers(pdf_url) WHERE pdf_url IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payroll_vouchers_status 
ON payroll_vouchers(voucher_status);

-- FASE 4: Crear función para limpiar archivos antiguos
CREATE OR REPLACE FUNCTION public.cleanup_old_voucher_files(retention_years INTEGER DEFAULT 7)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  files_deleted INTEGER := 0;
  voucher_record RECORD;
BEGIN
  -- Buscar comprobantes más antiguos que el período de retención
  FOR voucher_record IN
    SELECT pv.id, pv.file_path, pv.storage_bucket
    FROM payroll_vouchers pv
    WHERE pv.created_at < (CURRENT_DATE - INTERVAL '1 year' * retention_years)
    AND pv.file_path IS NOT NULL
  LOOP
    -- Eliminar archivo de storage (esto se haría desde una edge function)
    -- Por ahora solo marcamos para limpieza
    UPDATE payroll_vouchers 
    SET file_path = NULL, pdf_url = NULL
    WHERE id = voucher_record.id;
    
    files_deleted := files_deleted + 1;
  END LOOP;
  
  RETURN files_deleted;
END;
$$;

-- FASE 5: Función para obtener estadísticas de comprobantes
CREATE OR REPLACE FUNCTION public.get_voucher_storage_stats(p_company_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  stats JSON;
BEGIN
  SELECT json_build_object(
    'total_vouchers', COUNT(*),
    'vouchers_with_pdf', COUNT(*) FILTER (WHERE pdf_url IS NOT NULL),
    'vouchers_without_pdf', COUNT(*) FILTER (WHERE pdf_url IS NULL),
    'total_size_mb', COALESCE(SUM(file_size), 0) / 1024.0 / 1024.0,
    'auto_generated', COUNT(*) FILTER (WHERE auto_generated = true),
    'manual_generated', COUNT(*) FILTER (WHERE auto_generated = false OR auto_generated IS NULL)
  ) INTO stats
  FROM payroll_vouchers
  WHERE company_id = p_company_id;
  
  RETURN stats;
END;
$$;