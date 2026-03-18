
-- Insertar configuración de empresa para tu cuenta
INSERT INTO public.company_settings (company_id, periodicity)
SELECT company_id, 'mensual'
FROM public.profiles 
WHERE user_id = '3716ea94-cab9-47a5-b83d-0ef05a817bf2'
ON CONFLICT (company_id) DO UPDATE SET
  periodicity = EXCLUDED.periodicity,
  updated_at = now();

-- Insertar algunos empleados dummy para tu empresa
INSERT INTO public.employees (
  company_id,
  cedula,
  nombre,
  apellido,
  email,
  telefono,
  salario_base,
  tipo_contrato,
  fecha_ingreso,
  estado,
  eps,
  afp,
  arl,
  caja_compensacion,
  cargo,
  estado_afiliacion
)
SELECT 
  p.company_id,
  '12345678',
  'María',
  'González',
  'maria.gonzalez@email.com',
  '3001234567',
  1500000,
  'indefinido',
  '2024-01-15',
  'activo',
  'SURA EPS',
  'Protección',
  'SURA ARL',
  'Compensar',
  'Analista de Sistemas',
  'completa'
FROM public.profiles p
WHERE p.user_id = '3716ea94-cab9-47a5-b83d-0ef05a817bf2'
AND NOT EXISTS (
  SELECT 1 FROM public.employees e 
  WHERE e.company_id = p.company_id 
  AND e.cedula = '12345678'
);

INSERT INTO public.employees (
  company_id,
  cedula,
  nombre,
  apellido,
  email,
  telefono,
  salario_base,
  tipo_contrato,
  fecha_ingreso,
  estado,
  eps,
  afp,
  arl,
  caja_compensacion,
  cargo,
  estado_afiliacion
)
SELECT 
  p.company_id,
  '87654321',
  'Carlos',
  'Ramírez',
  'carlos.ramirez@email.com',
  '3009876543',
  2200000,
  'indefinido',
  '2023-08-20',
  'activo',
  'Nueva EPS',
  'Colfondos',
  'Positiva',
  'Colsubsidio',
  'Gerente de Ventas',
  'completa'
FROM public.profiles p
WHERE p.user_id = '3716ea94-cab9-47a5-b83d-0ef05a817bf2'
AND NOT EXISTS (
  SELECT 1 FROM public.employees e 
  WHERE e.company_id = p.company_id 
  AND e.cedula = '87654321'
);

INSERT INTO public.employees (
  company_id,
  cedula,
  nombre,
  apellido,
  email,
  telefono,
  salario_base,
  tipo_contrato,
  fecha_ingreso,
  estado,
  eps,
  afp,
  arl,
  caja_compensacion,
  cargo,
  estado_afiliacion
)
SELECT 
  p.company_id,
  '11223344',
  'Ana',
  'López',
  'ana.lopez@email.com',
  '3005556677',
  1800000,
  'fijo',
  '2024-03-10',
  'activo',
  'Sanitas',
  'Porvenir',
  'SURA ARL',
  'Cafam',
  'Contadora',
  'pendiente'
FROM public.profiles p
WHERE p.user_id = '3716ea94-cab9-47a5-b83d-0ef05a817bf2'
AND NOT EXISTS (
  SELECT 1 FROM public.employees e 
  WHERE e.company_id = p.company_id 
  AND e.cedula = '11223344'
);

-- Insertar algunas alertas dummy para el dashboard
INSERT INTO public.dashboard_alerts (
  company_id,
  type,
  title,
  description,
  priority,
  icon,
  action_required,
  due_date
)
SELECT 
  p.company_id,
  'empleados',
  'Empleado con afiliación pendiente',
  'Ana López tiene afiliaciones pendientes por completar',
  'high',
  '⚠️',
  true,
  CURRENT_DATE + INTERVAL '7 days'
FROM public.profiles p
WHERE p.user_id = '3716ea94-cab9-47a5-b83d-0ef05a817bf2'
AND NOT EXISTS (
  SELECT 1 FROM public.dashboard_alerts da 
  WHERE da.company_id = p.company_id 
  AND da.title = 'Empleado con afiliación pendiente'
);

INSERT INTO public.dashboard_alerts (
  company_id,
  type,
  title,
  description,
  priority,
  icon,
  action_required,
  due_date
)
SELECT 
  p.company_id,
  'nomina',
  'Período de nómina próximo a vencer',
  'El período de nómina de marzo debe cerrarse pronto',
  'medium',
  '📅',
  true,
  CURRENT_DATE + INTERVAL '3 days'
FROM public.profiles p
WHERE p.user_id = '3716ea94-cab9-47a5-b83d-0ef05a817bf2'
AND NOT EXISTS (
  SELECT 1 FROM public.dashboard_alerts da 
  WHERE da.company_id = p.company_id 
  AND da.title = 'Período de nómina próximo a vencer'
);
