-- Add onboarding fields to profiles table for demo flow
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS first_maya_visit BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS demo_payroll_completed BOOLEAN DEFAULT false;

-- Add comments for documentation
COMMENT ON COLUMN public.profiles.first_maya_visit IS 'Indica si es la primera vez que el usuario visita MAYA (para auto-trigger del demo)';
COMMENT ON COLUMN public.profiles.demo_payroll_completed IS 'Indica si el usuario completó la liquidación demo de onboarding';

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_profiles_first_maya_visit ON public.profiles(first_maya_visit) WHERE first_maya_visit = true;