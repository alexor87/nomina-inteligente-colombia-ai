-- ============================================================================
-- ACCOUNTING INTEGRATIONS - Siigo & Alegra Connection Configuration
-- ============================================================================

-- Table: accounting_integrations
-- Stores the connection configuration for each company's accounting software
CREATE TABLE public.accounting_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('siigo', 'alegra')),
  -- Note: Actual credentials stored as Supabase secrets, this stores metadata only
  credentials_ref TEXT, -- Reference to secret name (e.g., 'siigo_token_<company_id>')
  is_active BOOLEAN DEFAULT false,
  auto_sync BOOLEAN DEFAULT false,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  last_sync_status TEXT CHECK (last_sync_status IN ('success', 'error', 'pending')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  -- Only one active integration per company per provider
  UNIQUE(company_id, provider)
);

-- Enable RLS
ALTER TABLE public.accounting_integrations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their company integrations"
ON public.accounting_integrations
FOR SELECT
USING (company_id = get_current_user_company_id());

CREATE POLICY "Users can create their company integrations"
ON public.accounting_integrations
FOR INSERT
WITH CHECK (company_id = get_current_user_company_id());

CREATE POLICY "Users can update their company integrations"
ON public.accounting_integrations
FOR UPDATE
USING (company_id = get_current_user_company_id());

CREATE POLICY "Users can delete their company integrations"
ON public.accounting_integrations
FOR DELETE
USING (company_id = get_current_user_company_id());

-- Table: accounting_sync_logs
-- Stores the history of synchronization attempts
CREATE TABLE public.accounting_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  integration_id UUID NOT NULL REFERENCES public.accounting_integrations(id) ON DELETE CASCADE,
  period_id UUID REFERENCES public.payroll_periods_real(id) ON DELETE SET NULL,
  provider TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'error')),
  entries_sent INTEGER DEFAULT 0,
  response_data JSONB DEFAULT '{}'::jsonb,
  error_message TEXT,
  external_reference TEXT, -- ID of the journal entry in Siigo/Alegra
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.accounting_sync_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their company sync logs"
ON public.accounting_sync_logs
FOR SELECT
USING (company_id = get_current_user_company_id());

CREATE POLICY "Users can create their company sync logs"
ON public.accounting_sync_logs
FOR INSERT
WITH CHECK (company_id = get_current_user_company_id());

-- Create indexes for performance
CREATE INDEX idx_accounting_integrations_company ON public.accounting_integrations(company_id);
CREATE INDEX idx_accounting_sync_logs_company ON public.accounting_sync_logs(company_id);
CREATE INDEX idx_accounting_sync_logs_period ON public.accounting_sync_logs(period_id);
CREATE INDEX idx_accounting_sync_logs_created ON public.accounting_sync_logs(created_at DESC);

-- Trigger to update updated_at
CREATE TRIGGER update_accounting_integrations_updated_at
BEFORE UPDATE ON public.accounting_integrations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();