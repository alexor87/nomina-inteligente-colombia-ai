
-- Arreglar los errores de RLS en usuarios_empresa
-- Eliminar todas las políticas problemáticas existentes primero
DROP POLICY IF EXISTS "Allow superadmin full access to usuarios_empresa" ON public.usuarios_empresa;
DROP POLICY IF EXISTS "Users can manage relationships where they are admin" ON public.usuarios_empresa;
DROP POLICY IF EXISTS "Users can view their own empresa relationships" ON public.usuarios_empresa;

-- Habilitar RLS en la tabla usuarios_empresa
ALTER TABLE public.usuarios_empresa ENABLE ROW LEVEL SECURITY;

-- Crear una política simple y segura que no cause recursión
-- Solo permitir que los superadmins (usando email directamente) y usuarios autenticados accedan
CREATE POLICY "Simple: Allow authenticated users to manage usuarios_empresa" 
  ON public.usuarios_empresa 
  FOR ALL 
  TO authenticated 
  USING (
    -- Permitir si es superadmin (verificando directamente el email del usuario autenticado)
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() 
      AND email = 'alexor87@gmail.com'
    )
    OR 
    -- O si el usuario autenticado es el mismo usuario en la relación
    usuario_id = auth.uid()
  )
  WITH CHECK (
    -- Misma lógica para insertar/actualizar
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() 
      AND email = 'alexor87@gmail.com'
    )
    OR 
    usuario_id = auth.uid()
  );
