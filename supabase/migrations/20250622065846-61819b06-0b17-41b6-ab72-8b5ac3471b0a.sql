
-- Asignar rol de administrador al usuario registrado
INSERT INTO public.user_roles (
  user_id,
  role,
  company_id,
  assigned_by,
  assigned_at
)
SELECT 
  u.id,
  'administrador'::app_role,
  c.id,
  u.id,
  now()
FROM auth.users u
CROSS JOIN public.companies c
WHERE u.email = 'alexor87@gmail.com'
  AND c.email = 'alexor87@gmail.com'
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = u.id 
      AND ur.role = 'administrador'
      AND ur.company_id = c.id
  );

-- Actualizar el perfil del usuario con la empresa
UPDATE public.profiles 
SET company_id = (
  SELECT id FROM public.companies WHERE email = 'alexor87@gmail.com'
)
WHERE user_id IN (
  SELECT id FROM auth.users WHERE email = 'alexor87@gmail.com'
);
