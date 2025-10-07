-- ============================================================================
-- FASE 1: SEGURIDAD CORPORATE-GRADE - REFORZAR RLS POLICIES
-- ============================================================================
-- 
-- OBJETIVO: Prevenir acceso cross-company en todas las tablas críticas
-- IMPACTO: Usuarios con rol 'soporte' en múltiples empresas NO podrán acceder
--          a datos de empresas donde no tienen la sesión activa
-- ============================================================================

-- 1. Crear función de seguridad para validar acceso de soporte
CREATE OR REPLACE FUNCTION public.validate_support_company_access(
  _user_id uuid,
  _company_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  -- Un usuario soporte solo puede acceder a una empresa si:
  -- 1. Tiene el rol soporte en esa empresa Y
  -- 2. Su perfil está asociado a esa empresa (sesión activa)
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.profiles p ON p.user_id = ur.user_id
    WHERE ur.user_id = _user_id
      AND ur.role = 'soporte'::app_role
      AND ur.company_id = _company_id
      AND p.company_id = _company_id  -- CLAVE: sesión activa
  )
$$;

-- 2. REFORZAR RLS: employees - Eliminar bypass para soporte
DROP POLICY IF EXISTS "Users can view company employees" ON public.employees;
CREATE POLICY "Users can view company employees"
ON public.employees
FOR SELECT
USING (
  (auth.uid() IS NOT NULL) AND (
    (company_id = get_current_user_company_id()) OR
    validate_support_company_access(auth.uid(), company_id)
  )
);

-- 3. REFORZAR RLS: payroll_periods_real - Eliminar bypass implícito
DROP POLICY IF EXISTS "Users can view company payroll periods" ON public.payroll_periods_real;
CREATE POLICY "Users can view company payroll periods"
ON public.payroll_periods_real
FOR SELECT
USING (
  (auth.uid() IS NOT NULL) AND (
    (company_id = get_current_user_company_id()) OR
    validate_support_company_access(auth.uid(), company_id)
  )
);

-- 4. REFORZAR RLS: payrolls - Asegurar company_id match estricto
DROP POLICY IF EXISTS "Users can view company payrolls" ON public.payrolls;
CREATE POLICY "Users can view company payrolls"
ON public.payrolls
FOR SELECT
USING (
  (auth.uid() IS NOT NULL) AND (
    (company_id = get_current_user_company_id()) OR
    validate_support_company_access(auth.uid(), company_id)
  )
);

-- 5. REFORZAR RLS: payroll_novedades - Prevenir cross-company access
DROP POLICY IF EXISTS "Users can view company novedades" ON public.payroll_novedades;
CREATE POLICY "Users can view company novedades"
ON public.payroll_novedades
FOR SELECT
USING (
  (auth.uid() IS NOT NULL) AND (
    (company_id = get_current_user_company_id()) OR
    validate_support_company_access(auth.uid(), company_id)
  )
);

-- 6. Crear índices de seguridad para optimizar validaciones
CREATE INDEX IF NOT EXISTS idx_user_roles_company_validation 
ON public.user_roles(user_id, company_id, role);

CREATE INDEX IF NOT EXISTS idx_profiles_company_session
ON public.profiles(user_id, company_id);

-- 7. Logging: Registrar políticas actualizadas
DO $$
BEGIN
  RAISE NOTICE '🔒 [SECURITY] Corporate-grade RLS policies applied successfully';
  RAISE NOTICE '✅ [SECURITY] Cross-company access blocked for soporte role';
  RAISE NOTICE '✅ [SECURITY] All queries now require profile.company_id match';
END $$;