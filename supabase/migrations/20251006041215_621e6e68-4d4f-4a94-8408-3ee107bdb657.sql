-- Corregir función update_updated_at_timestamp para incluir search_path
DROP FUNCTION IF EXISTS public.update_updated_at_timestamp() CASCADE;

CREATE OR REPLACE FUNCTION public.update_updated_at_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Recrear trigger
CREATE TRIGGER update_maya_conversations_timestamp
BEFORE UPDATE ON public.maya_conversations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_timestamp();