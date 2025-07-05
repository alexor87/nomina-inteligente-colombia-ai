
-- FASE 1: REPARACIÓN CRÍTICA DE BASE DE DATOS
-- Reparar usuarios sin empresa o roles asignados

-- 1. Completar registros incompletos para usuarios sin empresa
SELECT complete_incomplete_registration('alexor87@gmail.com', 'Mi Empresa S.A.S', '900123456-1');

-- 2. Asignar roles de administrador a usuarios que tienen empresa pero no roles
INSERT INTO public.user_roles (user_id, role, company_id, assigned_by)
SELECT 
    p.user_id,
    'administrador'::app_role,
    p.company_id,
    p.user_id
FROM public.profiles p
WHERE p.company_id IS NOT NULL
AND NOT EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = p.user_id 
    AND ur.company_id = p.company_id
)
ON CONFLICT (user_id, role, company_id) DO NOTHING;

-- 3. Verificar y reparar configuraciones de empresa
INSERT INTO public.company_settings (company_id, periodicity)
SELECT c.id, 'mensual'
FROM public.companies c
WHERE NOT EXISTS (
    SELECT 1 FROM public.company_settings cs 
    WHERE cs.company_id = c.id
)
ON CONFLICT (company_id) DO NOTHING;

-- 4. Crear suscripciones faltantes
INSERT INTO public.company_subscriptions (company_id, plan_type, status, trial_ends_at, max_employees, max_payrolls_per_month)
SELECT 
    c.id,
    'profesional',
    'trial',
    now() + interval '30 days',
    25,
    12
FROM public.companies c
WHERE NOT EXISTS (
    SELECT 1 FROM public.company_subscriptions cs 
    WHERE cs.company_id = c.id
)
ON CONFLICT (company_id) DO NOTHING;

-- 5. Ejecutar función de asignación automática de roles para usuarios existentes
SELECT ensure_admin_role_for_company_users();
