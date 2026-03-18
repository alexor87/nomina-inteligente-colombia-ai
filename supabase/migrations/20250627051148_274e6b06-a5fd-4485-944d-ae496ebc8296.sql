
-- Enable RLS on company_subscriptions table
ALTER TABLE public.company_subscriptions ENABLE ROW LEVEL SECURITY;

-- Policy for users to read subscriptions of their company
CREATE POLICY "Users can view their company subscription" 
  ON public.company_subscriptions 
  FOR SELECT 
  USING (
    company_id IN (
      SELECT company_id 
      FROM public.profiles 
      WHERE user_id = auth.uid()
    )
  );

-- Policy for users to insert subscriptions for their company
CREATE POLICY "Users can create their company subscription" 
  ON public.company_subscriptions 
  FOR INSERT 
  WITH CHECK (
    company_id IN (
      SELECT company_id 
      FROM public.profiles 
      WHERE user_id = auth.uid()
    )
  );

-- Policy for users to update subscriptions of their company
CREATE POLICY "Users can update their company subscription" 
  ON public.company_subscriptions 
  FOR UPDATE 
  USING (
    company_id IN (
      SELECT company_id 
      FROM public.profiles 
      WHERE user_id = auth.uid()
    )
  );

-- Insert the missing subscription for the current company
INSERT INTO public.company_subscriptions (
  company_id,
  plan_type,
  status,
  trial_ends_at,
  max_employees,
  max_payrolls_per_month,
  features
) VALUES (
  '969badef-d724-47f7-931a-e6924795c86e',
  'profesional',
  'activa',
  NOW() + INTERVAL '30 days',
  25,
  12,
  '{
    "email_support": true,
    "phone_support": true,
    "custom_reports": true
  }'::jsonb
) ON CONFLICT (company_id) DO UPDATE SET
  plan_type = EXCLUDED.plan_type,
  status = EXCLUDED.status,
  max_employees = EXCLUDED.max_employees,
  max_payrolls_per_month = EXCLUDED.max_payrolls_per_month,
  features = EXCLUDED.features;
