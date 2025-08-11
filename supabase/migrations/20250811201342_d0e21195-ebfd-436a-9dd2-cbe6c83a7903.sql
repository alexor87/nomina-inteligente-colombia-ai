
-- 1) Función: asignar rol admin en INSERT de profiles
CREATE OR REPLACE FUNCTION public.assign_admin_role_on_profile_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE 
  role_exists BOOLEAN;
BEGIN
  IF NEW.company_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 
      FROM public.user_roles 
      WHERE user_id = NEW.user_id 
        AND company_id = NEW.company_id 
        AND role = 'administrador'::app_role
    ) INTO role_exists;

    IF NOT role_exists THEN
      INSERT INTO public.user_roles (
        user_id, role, company_id, assigned_by
      ) VALUES (
        NEW.user_id, 'administrador'::app_role, NEW.company_id, NEW.user_id
      )
      ON CONFLICT (user_id, role, company_id) DO NOTHING;

      RAISE NOTICE 'Admin role assigned on profile INSERT for user % company %',
        NEW.user_id, NEW.company_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- 2) Trigger: ejecutar función tras INSERT en profiles
DROP TRIGGER IF EXISTS ensure_admin_role_on_profile_insert ON public.profiles;

CREATE TRIGGER ensure_admin_role_on_profile_insert
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_admin_role_on_profile_insert();

-- 3) (Opcional pero recomendado) volver a ejecutar la corrección para usuarios existentes
--    que ya tienen company_id pero siguen sin rol de administrador
SELECT public.fix_missing_admin_roles();
