
-- Phase 1b: Create subscription_events table, is_superadmin() function, and RLS policies

-- 1. Create subscription_events audit trail table
CREATE TABLE public.subscription_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  changed_by UUID REFERENCES auth.users(id),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  previous_plan TEXT,
  new_plan TEXT NOT NULL,
  previous_status TEXT,
  new_status TEXT NOT NULL,
  reason TEXT NOT NULL
);

-- 2. Enable RLS
ALTER TABLE public.subscription_events ENABLE ROW LEVEL SECURITY;

-- 3. Create is_superadmin() SECURITY DEFINER function
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role = 'superadmin'
  )
$$;

-- 4. RLS policies for subscription_events
CREATE POLICY "Superadmins can view all subscription events"
ON public.subscription_events FOR SELECT TO authenticated
USING (public.is_superadmin());

CREATE POLICY "Superadmins can insert subscription events"
ON public.subscription_events FOR INSERT TO authenticated
WITH CHECK (public.is_superadmin());

-- 5. Superadmin cross-company policies
CREATE POLICY "Superadmins can view all companies"
ON public.companies FOR SELECT TO authenticated
USING (public.is_superadmin());

CREATE POLICY "Superadmins can update all companies"
ON public.companies FOR UPDATE TO authenticated
USING (public.is_superadmin());

CREATE POLICY "Superadmins can view all subscriptions"
ON public.company_subscriptions FOR SELECT TO authenticated
USING (public.is_superadmin());

CREATE POLICY "Superadmins can update all subscriptions"
ON public.company_subscriptions FOR UPDATE TO authenticated
USING (public.is_superadmin());

CREATE POLICY "Superadmins can view all employees"
ON public.employees FOR SELECT TO authenticated
USING (public.is_superadmin());

CREATE POLICY "Superadmins can view all profiles"
ON public.profiles FOR SELECT TO authenticated
USING (public.is_superadmin());

CREATE POLICY "Superadmins can view all user_roles"
ON public.user_roles FOR SELECT TO authenticated
USING (public.is_superadmin());
