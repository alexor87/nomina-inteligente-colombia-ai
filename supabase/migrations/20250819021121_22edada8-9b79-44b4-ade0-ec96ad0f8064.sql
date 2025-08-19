
-- Add provision_mode column to company_settings table
ALTER TABLE public.company_settings 
ADD COLUMN provision_mode text NOT NULL DEFAULT 'on_liquidation';

-- Add a check constraint to ensure valid values
ALTER TABLE public.company_settings 
ADD CONSTRAINT provision_mode_check 
CHECK (provision_mode IN ('on_liquidation', 'monthly_consolidation'));
