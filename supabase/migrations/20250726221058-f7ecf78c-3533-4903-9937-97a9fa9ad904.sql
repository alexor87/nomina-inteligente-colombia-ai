-- Corregir usuarios sin empresa asignada
-- PASO 1: Asignar company_id por defecto a usuarios huérfanos
UPDATE public.profiles 
SET company_id = (SELECT id FROM public.companies ORDER BY created_at ASC LIMIT 1)
WHERE company_id IS NULL;

-- PASO 2: Crear roles de administrador para usuarios sin roles
INSERT INTO public.user_roles (user_id, role, company_id, assigned_by)
SELECT 
  p.user_id, 
  'administrador'::app_role, 
  p.company_id,
  p.user_id as assigned_by
FROM public.profiles p
WHERE p.company_id IS NOT NULL
AND NOT EXISTS (
  SELECT 1 FROM public.user_roles ur 
  WHERE ur.user_id = p.user_id 
  AND ur.company_id = p.company_id
)
ON CONFLICT (user_id, role, company_id) DO NOTHING;

-- PASO 3: Verificar que todos los usuarios tengan empresa asignada
DO $$
DECLARE
  orphaned_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO orphaned_count 
  FROM public.profiles 
  WHERE company_id IS NULL;
  
  IF orphaned_count > 0 THEN
    RAISE EXCEPTION 'Aún existen % usuarios sin empresa asignada', orphaned_count;
  ELSE
    RAISE NOTICE 'Migración exitosa: Todos los usuarios tienen empresa asignada';
  END IF;
END $$;