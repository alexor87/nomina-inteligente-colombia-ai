
-- Agregar columna para rastrear última actividad en períodos
ALTER TABLE public.payroll_periods_real 
ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Crear trigger para actualizar automáticamente last_activity_at
CREATE OR REPLACE FUNCTION update_period_activity()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_activity_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger a la tabla de períodos
DROP TRIGGER IF EXISTS trigger_update_period_activity ON public.payroll_periods_real;
CREATE TRIGGER trigger_update_period_activity
    BEFORE UPDATE ON public.payroll_periods_real
    FOR EACH ROW
    EXECUTE FUNCTION update_period_activity();

-- Función para limpiar períodos en borrador abandonados (más de 7 días sin actividad)
CREATE OR REPLACE FUNCTION clean_abandoned_draft_periods()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    cleaned_count INTEGER := 0;
BEGIN
    -- Eliminar registros de payrolls en borrador de períodos abandonados
    DELETE FROM public.payrolls 
    WHERE estado = 'borrador' 
    AND period_id IN (
        SELECT id FROM public.payroll_periods_real 
        WHERE estado = 'en_proceso' 
        AND last_activity_at < now() - INTERVAL '7 days'
    );
    
    -- Eliminar períodos abandonados
    DELETE FROM public.payroll_periods_real 
    WHERE estado = 'en_proceso' 
    AND last_activity_at < now() - INTERVAL '7 days';
    
    GET DIAGNOSTICS cleaned_count = ROW_COUNT;
    RETURN cleaned_count;
END;
$$;

-- Función para recuperar período en progreso
CREATE OR REPLACE FUNCTION get_active_period_for_company(p_company_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    company_id_var UUID;
    active_period RECORD;
    employees_count INTEGER;
BEGIN
    -- Obtener company_id
    IF p_company_id IS NULL THEN
        company_id_var := get_current_user_company_id();
    ELSE
        company_id_var := p_company_id;
    END IF;
    
    IF company_id_var IS NULL THEN
        RAISE EXCEPTION 'No se pudo determinar la empresa del usuario';
    END IF;

    -- Buscar período activo (en_proceso o borrador con empleados cargados)
    SELECT * INTO active_period
    FROM public.payroll_periods_real 
    WHERE company_id = company_id_var
    AND estado IN ('en_proceso', 'borrador')
    AND last_activity_at > now() - INTERVAL '24 hours' -- Solo períodos activos recientes
    ORDER BY last_activity_at DESC
    LIMIT 1;
    
    IF active_period.id IS NULL THEN
        RETURN jsonb_build_object('has_active_period', false);
    END IF;
    
    -- Contar empleados en el período
    SELECT COUNT(*) INTO employees_count
    FROM public.payrolls 
    WHERE period_id = active_period.id;
    
    RETURN jsonb_build_object(
        'has_active_period', true,
        'period', jsonb_build_object(
            'id', active_period.id,
            'periodo', active_period.periodo,
            'fecha_inicio', active_period.fecha_inicio,
            'fecha_fin', active_period.fecha_fin,
            'estado', active_period.estado,
            'last_activity_at', active_period.last_activity_at,
            'employees_count', employees_count
        )
    );
END;
$$;
