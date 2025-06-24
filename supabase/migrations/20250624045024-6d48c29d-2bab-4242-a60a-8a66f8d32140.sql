
-- Crear políticas RLS para payroll_vouchers (faltaban desde la migración inicial)
CREATE POLICY "Users can view their company vouchers" 
  ON public.payroll_vouchers 
  FOR SELECT 
  USING (
    company_id IN (
      SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their company vouchers" 
  ON public.payroll_vouchers 
  FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

-- Crear políticas RLS para voucher_audit_log
CREATE POLICY "Users can view their company voucher audit log" 
  ON public.voucher_audit_log 
  FOR SELECT 
  USING (
    company_id IN (
      SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert voucher audit log for their company" 
  ON public.voucher_audit_log 
  FOR INSERT 
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

-- Mejorar las políticas de company_settings para permitir UPSERT
DROP POLICY IF EXISTS "Users can update their company settings" ON public.company_settings;

CREATE POLICY "Users can insert their company settings" 
  ON public.company_settings 
  FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their company settings" 
  ON public.company_settings 
  FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
    )
  );
