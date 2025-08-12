
-- Fase 1: Limpieza de datos demo históricos
-- Eliminar todos los empleados con emails @test.com

-- Primero, registrar la operación de limpieza en audit log
INSERT INTO public.security_audit_log (
  table_name,
  action,
  violation_type,
  query_attempted,
  additional_data,
  created_at
) VALUES (
  'employees',
  'BULK_DELETE',
  'demo_data_cleanup',
  'DELETE FROM employees WHERE email LIKE ''%@test.com''',
  jsonb_build_object(
    'reason', 'Limpieza de empleados demo históricos',
    'timestamp', now(),
    'affected_pattern', '%@test.com'
  ),
  now()
);

-- Eliminar empleados demo (con emails @test.com)
DELETE FROM public.employees 
WHERE email LIKE '%@test.com'
AND nombre IN ('Juan Demo', 'María Demo', 'Carlos Demo', 'Ana Demo', 'Luis Demo');

-- Fase 2: Crear función de validación para prevenir futuros empleados demo
CREATE OR REPLACE FUNCTION public.validate_employee_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Bloquear emails que terminen en @test.com
  IF NEW.email IS NOT NULL AND NEW.email LIKE '%@test.com' THEN
    -- Registrar el intento de violación
    INSERT INTO public.security_audit_log (
      table_name,
      action,
      violation_type,
      query_attempted,
      additional_data,
      user_id,
      company_id
    ) VALUES (
      'employees',
      'INSERT_BLOCKED',
      'demo_email_blocked',
      'Intento de crear empleado con email @test.com',
      jsonb_build_object(
        'blocked_email', NEW.email,
        'employee_name', NEW.nombre || ' ' || NEW.apellido,
        'timestamp', now()
      ),
      auth.uid(),
      NEW.company_id
    );
    
    RAISE EXCEPTION 'No se permiten empleados con emails @test.com. Use emails reales para empleados.';
  END IF;
  
  -- Bloquear nombres típicos de demo
  IF NEW.nombre IS NOT NULL AND NEW.nombre IN ('Juan Demo', 'María Demo', 'Carlos Demo', 'Ana Demo', 'Luis Demo') THEN
    -- Registrar el intento de violación
    INSERT INTO public.security_audit_log (
      table_name,
      action,
      violation_type,
      query_attempted,
      additional_data,
      user_id,
      company_id
    ) VALUES (
      'employees',
      'INSERT_BLOCKED',
      'demo_name_blocked',
      'Intento de crear empleado con nombre demo',
      jsonb_build_object(
        'blocked_name', NEW.nombre,
        'employee_email', NEW.email,
        'timestamp', now()
      ),
      auth.uid(),
      NEW.company_id
    );
    
    RAISE EXCEPTION 'No se permiten empleados con nombres demo. Use nombres reales para empleados.';
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Crear trigger para validar empleados en INSERT y UPDATE
DROP TRIGGER IF EXISTS trigger_validate_employee_email ON public.employees;
CREATE TRIGGER trigger_validate_employee_email
  BEFORE INSERT OR UPDATE ON public.employees
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_employee_email();

-- Función para verificar limpieza completa
CREATE OR REPLACE FUNCTION public.verify_demo_data_cleanup()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  demo_employees_count INTEGER;
  affected_companies_count INTEGER;
  cleanup_report jsonb;
BEGIN
  -- Contar empleados demo restantes
  SELECT COUNT(*) INTO demo_employees_count
  FROM public.employees 
  WHERE email LIKE '%@test.com' 
  OR nombre IN ('Juan Demo', 'María Demo', 'Carlos Demo', 'Ana Demo', 'Luis Demo');
  
  -- Contar empresas que tenían empleados demo
  SELECT COUNT(DISTINCT company_id) INTO affected_companies_count
  FROM public.security_audit_log 
  WHERE violation_type = 'demo_data_cleanup'
  AND created_at >= now() - INTERVAL '1 hour';
  
  -- Generar reporte
  cleanup_report := jsonb_build_object(
    'cleanup_completed', demo_employees_count = 0,
    'remaining_demo_employees', demo_employees_count,
    'companies_cleaned', affected_companies_count,
    'verification_timestamp', now(),
    'status', CASE 
      WHEN demo_employees_count = 0 THEN 'SUCCESS'
      ELSE 'INCOMPLETE'
    END
  );
  
  RETURN cleanup_report;
END;
$function$;

-- Registrar completación de la migración
INSERT INTO public.security_audit_log (
  table_name,
  action,
  violation_type,
  query_attempted,
  additional_data,
  created_at
) VALUES (
  'employees',
  'MIGRATION_COMPLETED',
  'demo_data_prevention_setup',
  'Created validation triggers and cleanup functions',
  jsonb_build_object(
    'reason', 'Configuración de prevención de datos demo',
    'timestamp', now(),
    'triggers_created', true,
    'validation_functions_created', true
  ),
  now()
);
