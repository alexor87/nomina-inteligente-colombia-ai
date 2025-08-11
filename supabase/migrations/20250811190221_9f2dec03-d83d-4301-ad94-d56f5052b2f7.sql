
-- Create function to assign admin role if missing (with retry logic)
CREATE OR REPLACE FUNCTION public.assign_admin_role_if_missing()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  role_exists BOOLEAN := FALSE;
  retry_count INTEGER := 0;
  max_retries INTEGER := 3;
BEGIN
  -- Only proceed if company_id was added/changed
  IF NEW.company_id IS NOT NULL AND (OLD.company_id IS NULL OR OLD.company_id != NEW.company_id) THEN
    
    -- Retry loop to ensure role gets assigned
    WHILE retry_count < max_retries AND NOT role_exists LOOP
      -- Check if admin role already exists
      SELECT EXISTS (
        SELECT 1 
        FROM public.user_roles 
        WHERE user_id = NEW.user_id 
        AND company_id = NEW.company_id 
        AND role = 'administrador'::app_role
      ) INTO role_exists;
      
      -- If role doesn't exist, create it
      IF NOT role_exists THEN
        BEGIN
          INSERT INTO public.user_roles (
            user_id,
            role,
            company_id,
            assigned_by
          ) VALUES (
            NEW.user_id,
            'administrador'::app_role,
            NEW.company_id,
            NEW.user_id
          );
          
          -- Mark as successful
          role_exists := TRUE;
          
          RAISE NOTICE 'Admin role assigned to user % for company % (attempt %)', 
            NEW.user_id, NEW.company_id, retry_count + 1;
            
        EXCEPTION WHEN unique_violation THEN
          -- Role already exists (race condition), that's fine
          role_exists := TRUE;
          RAISE NOTICE 'Admin role already exists for user % in company %', 
            NEW.user_id, NEW.company_id;
        WHEN OTHERS THEN
          retry_count := retry_count + 1;
          IF retry_count >= max_retries THEN
            RAISE NOTICE 'Failed to assign admin role after % attempts: %', max_retries, SQLERRM;
          ELSE
            -- Brief wait before retry
            PERFORM pg_sleep(0.1);
          END IF;
        END;
      END IF;
    END LOOP;
    
    -- Log final status
    IF role_exists THEN
      RAISE NOTICE 'Admin role confirmed for user % in company %', NEW.user_id, NEW.company_id;
    ELSE
      RAISE WARNING 'Failed to assign admin role for user % in company % after % attempts', 
        NEW.user_id, NEW.company_id, max_retries;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS ensure_admin_role_on_profile_update ON public.profiles;

-- Create new trigger that fires AFTER profile update
CREATE TRIGGER ensure_admin_role_on_profile_update
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_admin_role_if_missing();

-- Create function to verify and fix missing admin roles for existing users
CREATE OR REPLACE FUNCTION public.fix_missing_admin_roles()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  profile_record RECORD;
  roles_fixed INTEGER := 0;
BEGIN
  -- Find profiles with company but no admin role
  FOR profile_record IN 
    SELECT p.user_id, p.company_id
    FROM public.profiles p
    WHERE p.company_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 
      FROM public.user_roles ur 
      WHERE ur.user_id = p.user_id 
      AND ur.company_id = p.company_id
      AND ur.role = 'administrador'::app_role
    )
  LOOP
    -- Assign admin role
    INSERT INTO public.user_roles (
      user_id,
      role,
      company_id,
      assigned_by
    ) VALUES (
      profile_record.user_id,
      'administrador'::app_role,
      profile_record.company_id,
      profile_record.user_id
    ) ON CONFLICT (user_id, role, company_id) DO NOTHING;
    
    roles_fixed := roles_fixed + 1;
    RAISE NOTICE 'Fixed missing admin role for user: % in company: %', 
      profile_record.user_id, profile_record.company_id;
  END LOOP;
  
  RETURN format('Fixed %s missing admin roles', roles_fixed);
END;
$$;

-- Run the fix for existing users
SELECT public.fix_missing_admin_roles();
