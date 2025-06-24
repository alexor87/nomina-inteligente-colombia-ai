
-- Crear tabla de comprobantes de nómina
CREATE TABLE public.payroll_vouchers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  payroll_id UUID REFERENCES public.payrolls(id) ON DELETE SET NULL,
  periodo TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  net_pay DECIMAL(15,2) NOT NULL DEFAULT 0,
  voucher_status TEXT CHECK (voucher_status IN ('generado', 'pendiente', 'firmado', 'error')) DEFAULT 'pendiente',
  sent_to_employee BOOLEAN DEFAULT false,
  sent_date TIMESTAMP WITH TIME ZONE,
  pdf_url TEXT,
  xml_url TEXT,
  dian_status TEXT CHECK (dian_status IN ('pendiente', 'firmado', 'rechazado', 'error')) DEFAULT 'pendiente',
  dian_cufe TEXT, -- Código único de facturación electrónica
  electronic_signature_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  generated_by UUID REFERENCES auth.users(id),
  UNIQUE(company_id, employee_id, periodo)
);

-- Crear tabla de auditoría para acciones sobre comprobantes
CREATE TABLE public.voucher_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  voucher_id UUID NOT NULL REFERENCES public.payroll_vouchers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  action TEXT NOT NULL CHECK (action IN ('generated', 'downloaded', 'sent_email', 'sent_whatsapp', 'regenerated', 'viewed')),
  method TEXT, -- 'email', 'whatsapp', 'download', etc.
  recipient_email TEXT,
  recipient_phone TEXT,
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar Row Level Security
ALTER TABLE public.payroll_vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voucher_audit_log ENABLE ROW LEVEL SECURITY;

-- Crear índices para optimizar consultas
CREATE INDEX idx_payroll_vouchers_company_periodo ON public.payroll_vouchers(company_id, periodo);
CREATE INDEX idx_payroll_vouchers_employee ON public.payroll_vouchers(employee_id);
CREATE INDEX idx_payroll_vouchers_status ON public.payroll_vouchers(voucher_status);
CREATE INDEX idx_voucher_audit_company_date ON public.voucher_audit_log(company_id, created_at);

-- Insertar datos de ejemplo
INSERT INTO public.payroll_vouchers (company_id, employee_id, periodo, start_date, end_date, net_pay, voucher_status, sent_to_employee, pdf_url, xml_url, dian_status)
SELECT 
  c.id,
  e.id,
  '2025-06-01 al 2025-06-15',
  '2025-06-01',
  '2025-06-15',
  2500000,
  'firmado',
  true,
  '/vouchers/pdf/' || e.cedula || '_2025-06-15.pdf',
  '/vouchers/xml/' || e.cedula || '_2025-06-15.xml',
  'firmado'
FROM public.companies c
CROSS JOIN public.employees e
WHERE c.nit = '900123456-7'
LIMIT 3;

INSERT INTO public.payroll_vouchers (company_id, employee_id, periodo, start_date, end_date, net_pay, voucher_status, sent_to_employee, pdf_url, dian_status)
SELECT 
  c.id,
  e.id,
  '2025-05-16 al 2025-05-31',
  '2025-05-16',
  '2025-05-31',
  2200000,
  'generado',
  false,
  '/vouchers/pdf/' || e.cedula || '_2025-05-31.pdf',
  'pendiente'
FROM public.companies c
CROSS JOIN public.employees e
WHERE c.nit = '900123456-7'
LIMIT 2;
