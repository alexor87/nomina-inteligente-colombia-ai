
-- Crear solo la empresa de ejemplo para el usuario administrador
INSERT INTO public.companies (
  nit,
  razon_social,
  email,
  telefono,
  direccion,
  ciudad,
  representante_legal,
  actividad_economica,
  estado,
  plan
) 
SELECT 
  '900123456-1',
  'Empresa Demo',
  'admin@nominacol.com',
  '3001234567',
  'Calle 123 #45-67',
  'Bogotá',
  'Administrador Demo',
  'Servicios de Software',
  'activa',
  'basico'
WHERE NOT EXISTS (
  SELECT 1 FROM public.companies WHERE email = 'admin@nominacol.com'
);
