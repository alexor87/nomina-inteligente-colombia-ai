-- FASE 1: Database Triggers para marcar payrolls como stale cuando hay cambios en novedades

-- Función para marcar payrolls como stale cuando cambian las novedades
CREATE OR REPLACE FUNCTION public.mark_payrolls_stale_on_novedad_changes()
RETURNS TRIGGER AS $$
BEGIN
    -- Marcar payrolls como stale cuando se insertan, actualizan o eliminan novedades
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        UPDATE public.payrolls 
        SET is_stale = true, updated_at = now()
        WHERE company_id = NEW.company_id
        AND period_id = NEW.periodo_id
        AND employee_id = NEW.empleado_id;
        
        RAISE NOTICE 'Marked payroll as stale for employee % in period %', NEW.empleado_id, NEW.periodo_id;
        RETURN NEW;
    END IF;
    
    IF TG_OP = 'DELETE' THEN
        UPDATE public.payrolls 
        SET is_stale = true, updated_at = now()
        WHERE company_id = OLD.company_id
        AND period_id = OLD.periodo_id
        AND employee_id = OLD.empleado_id;
        
        RAISE NOTICE 'Marked payroll as stale for employee % in period % (DELETE)', OLD.empleado_id, OLD.periodo_id;
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Crear triggers para payroll_novedades
DROP TRIGGER IF EXISTS trigger_mark_stale_on_novedad_insert ON public.payroll_novedades;
DROP TRIGGER IF EXISTS trigger_mark_stale_on_novedad_update ON public.payroll_novedades;
DROP TRIGGER IF EXISTS trigger_mark_stale_on_novedad_delete ON public.payroll_novedades;

CREATE TRIGGER trigger_mark_stale_on_novedad_insert
    AFTER INSERT ON public.payroll_novedades
    FOR EACH ROW
    EXECUTE FUNCTION public.mark_payrolls_stale_on_novedad_changes();

CREATE TRIGGER trigger_mark_stale_on_novedad_update
    AFTER UPDATE ON public.payroll_novedades
    FOR EACH ROW
    EXECUTE FUNCTION public.mark_payrolls_stale_on_novedad_changes();

CREATE TRIGGER trigger_mark_stale_on_novedad_delete
    AFTER DELETE ON public.payroll_novedades
    FOR EACH ROW
    EXECUTE FUNCTION public.mark_payrolls_stale_on_novedad_changes();

-- Función para obtener payrolls que necesitan sincronización
CREATE OR REPLACE FUNCTION public.get_stale_payrolls_for_company(p_company_id uuid)
RETURNS TABLE(
    payroll_id uuid,
    employee_id uuid,
    employee_name text,
    period_id uuid,
    periodo text,
    is_stale boolean,
    updated_at timestamptz
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id as payroll_id,
        p.employee_id,
        CONCAT(e.nombre, ' ', e.apellido) as employee_name,
        p.period_id,
        p.periodo,
        p.is_stale,
        p.updated_at
    FROM public.payrolls p
    JOIN public.employees e ON p.employee_id = e.id
    WHERE p.company_id = p_company_id
    AND p.is_stale = true
    ORDER BY p.updated_at DESC;
END;
$$;