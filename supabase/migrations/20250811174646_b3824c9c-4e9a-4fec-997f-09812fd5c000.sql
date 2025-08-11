
-- Permitir que los usuarios se auto-asignen el rol de administrador si no tienen roles
CREATE POLICY "Users can self-assign admin role when no roles exist"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  role = 'administrador' 
  AND user_id = auth.uid()
  AND company_id IN (
    SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND company_id = user_roles.company_id
  )
);

-- Permitir que los usuarios lean sus propios roles siempre
CREATE POLICY "Users can always read their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());
