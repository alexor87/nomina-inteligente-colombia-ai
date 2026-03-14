
ALTER TABLE public.accounting_integrations 
ADD COLUMN IF NOT EXISTS provider_config jsonb DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.accounting_integrations.provider_config IS 'Provider-specific configuration: base_url, auth_type, custom headers, webhook URL, etc.';
