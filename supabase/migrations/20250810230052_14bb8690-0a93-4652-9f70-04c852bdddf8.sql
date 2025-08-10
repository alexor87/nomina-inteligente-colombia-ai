-- FASE 1: Corrección de Security Warnings - Funciones Auxiliares (12 funciones)
-- Agregando SET search_path TO 'public' para prevenir SQL injection

-- 1. calculate_worked_days_for_period
CREATE OR REPLACE FUNCTION public.calculate_worked_days_for_period(p_tipo_periodo text, p_fecha_inicio date, p_fecha_fin date)
RETURNS integer
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $function$
BEGIN
  -- Para períodos quincenales, siempre 15 días (ley laboral)
  IF p_tipo_periodo = 'quincenal' THEN
    RETURN 15;
  END IF;
  
  -- Para períodos semanales, siempre 7 días
  IF p_tipo_periodo = 'semanal' THEN
    RETURN 7;
  END IF;
  
  -- Para otros tipos, calcular días reales
  RETURN (p_fecha_fin - p_fecha_inicio) + 1;
END;
$function$;

-- 2. normalize_biweekly_period_labels
CREATE OR REPLACE FUNCTION public.normalize_biweekly_period_labels()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  corrected_count INTEGER := 0;
  period_record RECORD;
BEGIN
  -- Corregir etiquetas de períodos quincenales de febrero
  FOR period_record IN
    SELECT id, fecha_inicio, fecha_fin, periodo
    FROM public.payroll_periods_real
    WHERE tipo_periodo = 'quincenal'
    AND EXTRACT(MONTH FROM fecha_inicio) = 2  -- Febrero
    AND EXTRACT(DAY FROM fecha_inicio) = 16   -- Segunda quincena
    AND periodo NOT LIKE '%16 - 30%'          -- No corregido aún
  LOOP
    -- Actualizar solo el label a "16 - 30"
    UPDATE public.payroll_periods_real
    SET 
      periodo = REPLACE(period_record.periodo, 
                       '16 - ' || EXTRACT(DAY FROM period_record.fecha_fin)::text,
                       '16 - 30'),
      updated_at = now()
    WHERE id = period_record.id;
    
    corrected_count := corrected_count + 1;
    
    RAISE NOTICE 'Normalizado label del período: % -> 16 - 30 Febrero', period_record.periodo;
  END LOOP;
  
  RETURN corrected_count;
END;
$function$;

-- 3. clean_abandoned_draft_periods
CREATE OR REPLACE FUNCTION public.clean_abandoned_draft_periods()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
$function$;

-- 4. clean_duplicate_periods
CREATE OR REPLACE FUNCTION public.clean_duplicate_periods()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  duplicates_removed INTEGER := 0;
BEGIN
  -- Eliminar períodos duplicados manteniendo el más reciente
  WITH duplicate_periods AS (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY company_id, periodo ORDER BY updated_at DESC) as rn
    FROM public.payroll_periods_real
  )
  DELETE FROM public.payroll_periods_real 
  WHERE id IN (SELECT id FROM duplicate_periods WHERE rn > 1);
  
  GET DIAGNOSTICS duplicates_removed = ROW_COUNT;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', format('%s períodos duplicados eliminados', duplicates_removed),
    'duplicates_removed', duplicates_removed
  );
END;
$function$;

-- 5. clean_specific_duplicate_periods
CREATE OR REPLACE FUNCTION public.clean_specific_duplicate_periods(p_company_id uuid DEFAULT NULL::uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  company_id_var UUID;
  periods_to_delete UUID[];
  deleted_count INTEGER := 0;
  payrolls_updated INTEGER := 0;
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

  -- Encontrar períodos duplicados por nombre y eliminar los borradores más recientes
  WITH duplicate_analysis AS (
    SELECT 
      periodo,
      id,
      estado,
      created_at,
      ROW_NUMBER() OVER (
        PARTITION BY periodo 
        ORDER BY 
          CASE WHEN estado = 'cerrado' THEN 1 ELSE 2 END, -- Priorizar cerrados
          created_at ASC -- Mantener el más antiguo en caso de empate
      ) as priority_rank
    FROM public.payroll_periods_real 
    WHERE company_id = company_id_var
    AND periodo IN (
      SELECT periodo 
      FROM public.payroll_periods_real 
      WHERE company_id = company_id_var
      GROUP BY periodo 
      HAVING COUNT(*) > 1
    )
  ),
  periods_to_remove AS (
    SELECT id 
    FROM duplicate_analysis 
    WHERE priority_rank > 1  -- Eliminar duplicados, mantener el prioritario
  )
  SELECT array_agg(id) INTO periods_to_delete
  FROM periods_to_remove;

  -- Si hay períodos para eliminar
  IF periods_to_delete IS NOT NULL AND array_length(periods_to_delete, 1) > 0 THEN
    -- Primero actualizar payrolls huérfanos para vincularlos al período correcto
    WITH correct_periods AS (
      SELECT DISTINCT 
        p1.periodo,
        p1.id as correct_period_id
      FROM public.payroll_periods_real p1
      WHERE p1.company_id = company_id_var
      AND p1.id NOT IN (SELECT unnest(periods_to_delete))
      AND p1.periodo IN (
        SELECT p2.periodo 
        FROM public.payroll_periods_real p2 
        WHERE p2.id IN (SELECT unnest(periods_to_delete))
      )
    )
    UPDATE public.payrolls 
    SET period_id = cp.correct_period_id
    FROM correct_periods cp
    WHERE payrolls.company_id = company_id_var
    AND payrolls.periodo = cp.periodo
    AND (payrolls.period_id IS NULL OR payrolls.period_id IN (SELECT unnest(periods_to_delete)));
    
    GET DIAGNOSTICS payrolls_updated = ROW_COUNT;

    -- Eliminar los períodos duplicados
    DELETE FROM public.payroll_periods_real 
    WHERE id IN (SELECT unnest(periods_to_delete));
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RAISE NOTICE 'Períodos duplicados eliminados: %, Payrolls actualizados: %', deleted_count, payrolls_updated;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'periods_deleted', deleted_count,
    'payrolls_updated', payrolls_updated,
    'company_id', company_id_var
  );
END;
$function$;