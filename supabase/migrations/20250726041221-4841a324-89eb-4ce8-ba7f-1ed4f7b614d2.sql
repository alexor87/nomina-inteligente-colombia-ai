-- FASE 1: EMERGENCIA - PARCHES DE SEGURIDAD CRÍTICOS

-- 1.1 Crear tabla de auditoría de seguridad
CREATE TABLE IF NOT EXISTS public.security_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID,
  user_id UUID,
  table_name TEXT NOT NULL,
  action TEXT NOT NULL,
  violation_type TEXT NOT NULL,
  query_attempted TEXT,
  ip_address INET,
  user_agent TEXT,
  additional_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS en security_audit_log
ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

-- Política RLS para security_audit_log
CREATE POLICY "Users can view their company security logs" 
ON public.security_audit_log 
FOR SELECT 
USING (company_id = get_current_user_company_id());

CREATE POLICY "System can insert security logs" 
ON public.security_audit_log 
FOR INSERT 
WITH CHECK (true);

-- 1.2 Añadir RLS faltante a dashboard_activity
ALTER TABLE public.dashboard_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their company dashboard activity" 
ON public.dashboard_activity 
FOR SELECT 
USING (company_id = get_current_user_company_id());

CREATE POLICY "Users can insert company dashboard activity" 
ON public.dashboard_activity 
FOR INSERT 
WITH CHECK (company_id = get_current_user_company_id());

-- 1.3 Añadir RLS faltante a dashboard_alerts
ALTER TABLE public.dashboard_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their company dashboard alerts" 
ON public.dashboard_alerts 
FOR SELECT 
USING (company_id = get_current_user_company_id());

CREATE POLICY "Users can manage their company dashboard alerts" 
ON public.dashboard_alerts 
FOR ALL 
USING (company_id = get_current_user_company_id())
WITH CHECK (company_id = get_current_user_company_id());

-- 1.4 Función para logging de violaciones de seguridad
CREATE OR REPLACE FUNCTION public.log_security_violation(
  p_table_name TEXT,
  p_action TEXT,
  p_violation_type TEXT,
  p_query_attempted TEXT DEFAULT NULL,
  p_additional_data JSONB DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_company_id UUID;
BEGIN
  -- Obtener company_id del usuario actual
  current_company_id := get_current_user_company_id();
  
  -- Insertar log de violación
  INSERT INTO public.security_audit_log (
    company_id,
    user_id,
    table_name,
    action,
    violation_type,
    query_attempted,
    additional_data
  ) VALUES (
    current_company_id,
    auth.uid(),
    p_table_name,
    p_action,
    p_violation_type,
    p_query_attempted,
    p_additional_data
  );
  
  -- Log adicional para monitoreo
  RAISE NOTICE 'SECURITY VIOLATION: User % attempted % on % - %', 
    auth.uid(), p_action, p_table_name, p_violation_type;
END;
$$;

-- 1.5 Función helper para verificar acceso a empresa
CREATE OR REPLACE FUNCTION public.has_company_access(p_company_id UUID)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT p_company_id = get_current_user_company_id()
$$;

-- 1.6 Reforzar política de employees con logging
DROP POLICY IF EXISTS "Simple company employees access" ON public.employees;
DROP POLICY IF EXISTS "Users view their company employees" ON public.employees;

CREATE POLICY "Secure company employees access" 
ON public.employees 
FOR ALL 
USING (
  CASE 
    WHEN company_id = get_current_user_company_id() THEN true
    WHEN has_role_in_company(auth.uid(), 'soporte'::app_role, company_id) THEN true
    ELSE (
      SELECT log_security_violation('employees', TG_OP, 'unauthorized_company_access', 
        format('Attempted access to company %s from user company %s', company_id, get_current_user_company_id())
      ) IS NULL AND false
    )
  END
)
WITH CHECK (
  CASE 
    WHEN company_id = get_current_user_company_id() THEN true
    WHEN has_role_in_company(auth.uid(), 'soporte'::app_role, company_id) THEN true
    ELSE (
      SELECT log_security_violation('employees', 'INSERT/UPDATE', 'unauthorized_company_write', 
        format('Attempted write to company %s from user company %s', company_id, get_current_user_company_id())
      ) IS NULL AND false
    )
  END
);

-- 1.7 Reforzar política de payrolls
DROP POLICY IF EXISTS "Users can manage their company payrolls" ON public.payrolls;

CREATE POLICY "Secure company payrolls access" 
ON public.payrolls 
FOR ALL 
USING (
  CASE 
    WHEN company_id = get_current_user_company_id() THEN true
    ELSE (
      SELECT log_security_violation('payrolls', TG_OP, 'unauthorized_payroll_access', 
        format('Attempted access to payroll company %s from user company %s', company_id, get_current_user_company_id())
      ) IS NULL AND false
    )
  END
)
WITH CHECK (company_id = get_current_user_company_id());

-- 1.8 Reforzar política de payroll_novedades
DROP POLICY IF EXISTS "Users can manage their company novedades" ON public.payroll_novedades;

CREATE POLICY "Secure company novedades access" 
ON public.payroll_novedades 
FOR ALL 
USING (
  CASE 
    WHEN company_id = get_current_user_company_id() THEN true
    ELSE (
      SELECT log_security_violation('payroll_novedades', TG_OP, 'unauthorized_novedad_access', 
        format('Attempted access to novedad company %s from user company %s', company_id, get_current_user_company_id())
      ) IS NULL AND false
    )
  END
)
WITH CHECK (company_id = get_current_user_company_id());

-- 1.9 Función para detectar consultas sin filtro de empresa
CREATE OR REPLACE FUNCTION public.calculate_period_intersection_days(
  p_start_date DATE,
  p_end_date DATE,
  p_period_start DATE,
  p_period_end DATE
)
RETURNS INTEGER
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $$
DECLARE
  intersection_start DATE;
  intersection_end DATE;
BEGIN
  -- Calcular intersección de fechas
  intersection_start := GREATEST(p_start_date, p_period_start);
  intersection_end := LEAST(p_end_date, p_period_end);
  
  -- Si no hay intersección, retornar 0
  IF intersection_start > intersection_end THEN
    RETURN 0;
  END IF;
  
  -- Retornar días de intersección
  RETURN (intersection_end - intersection_start) + 1;
END;
$$;