
-- Step 1: Drop all existing problematic RLS policies on profiles table
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow profile creation" ON public.profiles;
DROP POLICY IF EXISTS "Allow profile updates" ON public.profiles;

-- Step 2: Create simple, non-circular RLS policies for profiles
CREATE POLICY "Users can view own profile" 
  ON public.profiles 
  FOR SELECT 
  TO authenticated 
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own profile" 
  ON public.profiles 
  FOR UPDATE 
  TO authenticated 
  USING (user_id = auth.uid()) 
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can insert own profile" 
  ON public.profiles 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (user_id = auth.uid());

-- Step 3: Update get_current_user_company_id to use SECURITY DEFINER to bypass RLS
CREATE OR REPLACE FUNCTION public.get_current_user_company_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT company_id 
  FROM public.profiles 
  WHERE user_id = auth.uid()
  LIMIT 1
$$;

-- Step 4: Also update any other functions that might have similar issues
-- Make sure get_user_companies_simple also uses SECURITY DEFINER properly
CREATE OR REPLACE FUNCTION public.get_user_companies_simple(_user_id uuid DEFAULT auth.uid())
RETURNS TABLE(company_id uuid, role_name text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT ur.company_id, ur.role::text as role_name
  FROM public.user_roles ur
  WHERE ur.user_id = _user_id
$$;

-- Step 5: Create a simple function to check if user has support role without recursion
CREATE OR REPLACE FUNCTION public.is_support_user(_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = _user_id
    AND ur.role = 'soporte'::app_role
  )
$$;

-- Step 6: Add a policy for support users to view profiles of companies they support
CREATE POLICY "Support users can view company profiles" 
  ON public.profiles 
  FOR SELECT 
  TO authenticated 
  USING (
    public.is_support_user(auth.uid()) AND 
    company_id IN (
      SELECT ur.company_id 
      FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.role = 'soporte'::app_role
    )
  );
