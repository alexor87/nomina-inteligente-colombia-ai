
-- FASE 1: LIMPIEZA COMPLETA DE DATOS DE PRUEBA
-- Eliminar todos los registros de nómina y períodos para empezar desde cero

-- Obtener el company_id del usuario actual para limpieza
DO $$
DECLARE
    current_company_id UUID;
BEGIN
    -- Obtener company_id del usuario actual
    SELECT company_id INTO current_company_id 
    FROM public.profiles 
    WHERE user_id = auth.uid();
    
    IF current_company_id IS NOT NULL THEN
        -- Eliminar todos los vouchers
        DELETE FROM public.payroll_vouchers WHERE company_id = current_company_id;
        
        -- Eliminar todas las novedades
        DELETE FROM public.payroll_novedades WHERE company_id = current_company_id;
        
        -- Eliminar todos los registros de nómina
        DELETE FROM public.payrolls WHERE company_id = current_company_id;
        
        -- Eliminar todos los períodos
        DELETE FROM public.payroll_periods_real WHERE company_id = current_company_id;
        DELETE FROM public.payroll_periods WHERE company_id = current_company_id;
        
        -- Eliminar logs de sincronización
        DELETE FROM public.payroll_sync_log WHERE company_id = current_company_id;
        
        RAISE NOTICE 'Limpieza completa realizada para company_id: %', current_company_id;
    ELSE
        RAISE NOTICE 'No se encontró company_id para el usuario actual';
    END IF;
END $$;

-- FASE 2: RECREAR FUNCIONES DE DIAGNÓSTICO Y LIMPIEZA MEJORADAS
-- Función para detectar el período correcto basado en fecha actual y configuración

CREATE OR REPLACE FUNCTION public.detect_smart_current_period(p_company_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  company_id_var UUID;
  company_periodicity TEXT;
  current_date_var DATE;
  period_start DATE;
  period_end DATE;
  period_name TEXT;
  existing_period RECORD;
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

  -- Obtener configuración de periodicidad
  SELECT periodicity INTO company_periodicity
  FROM public.company_settings 
  WHERE company_id = company_id_var;
  
  -- Si no existe configuración, usar mensual por defecto
  IF company_periodicity IS NULL THEN
    company_periodicity := 'mensual';
  END IF;
  
  current_date_var := CURRENT_DATE;
  
  -- Calcular período actual basado en la fecha y periodicidad
  CASE company_periodicity
    WHEN 'quincenal' THEN
      -- Para quincenal: 1-15 y 16-último día del mes
      IF EXTRACT(DAY FROM current_date_var) <= 15 THEN
        period_start := DATE_TRUNC('month', current_date_var)::DATE;
        period_end := DATE_TRUNC('month', current_date_var)::DATE + INTERVAL '14 days';
        period_name := format('1 - 15 %s %s', 
          CASE EXTRACT(MONTH FROM current_date_var)
            WHEN 1 THEN 'Enero' WHEN 2 THEN 'Febrero' WHEN 3 THEN 'Marzo'
            WHEN 4 THEN 'Abril' WHEN 5 THEN 'Mayo' WHEN 6 THEN 'Junio'
            WHEN 7 THEN 'Julio' WHEN 8 THEN 'Agosto' WHEN 9 THEN 'Septiembre'
            WHEN 10 THEN 'Octubre' WHEN 11 THEN 'Noviembre' WHEN 12 THEN 'Diciembre'
          END,
          EXTRACT(YEAR FROM current_date_var)
        );
      ELSE
        period_start := DATE_TRUNC('month', current_date_var)::DATE + INTERVAL '15 days';
        period_end := (DATE_TRUNC('month', current_date_var) + INTERVAL '1 month - 1 day')::DATE;
        period_name := format('16 - %s %s %s', 
          EXTRACT(DAY FROM period_end),
          CASE EXTRACT(MONTH FROM current_date_var)
            WHEN 1 THEN 'Enero' WHEN 2 THEN 'Febrero' WHEN 3 THEN 'Marzo'
            WHEN 4 THEN 'Abril' WHEN 5 THEN 'Mayo' WHEN 6 THEN 'Junio'
            WHEN 7 THEN 'Julio' WHEN 8 THEN 'Agosto' WHEN 9 THEN 'Septiembre'
            WHEN 10 THEN 'Octubre' WHEN 11 THEN 'Noviembre' WHEN 12 THEN 'Diciembre'
          END,
          EXTRACT(YEAR FROM current_date_var)
        );
      END IF;
      
    WHEN 'semanal' THEN
      -- Para semanal: lunes a domingo
      period_start := current_date_var - (EXTRACT(DOW FROM current_date_var) - 1) * INTERVAL '1 day';
      period_end := period_start + INTERVAL '6 days';
      period_name := format('Semana %s-%s %s %s', 
        EXTRACT(DAY FROM period_start),
        EXTRACT(DAY FROM period_end),
        CASE EXTRACT(MONTH FROM current_date_var)
          WHEN 1 THEN 'Enero' WHEN 2 THEN 'Febrero' WHEN 3 THEN 'Marzo'
          WHEN 4 THEN 'Abril' WHEN 5 THEN 'Mayo' WHEN 6 THEN 'Junio'
          WHEN 7 THEN 'Julio' WHEN 8 THEN 'Agosto' WHEN 9 THEN 'Septiembre'
          WHEN 10 THEN 'Octubre' WHEN 11 THEN 'Noviembre' WHEN 12 THEN 'Diciembre'
        END,
        EXTRACT(YEAR FROM current_date_var)
      );
      
    ELSE -- mensual por defecto
      period_start := DATE_TRUNC('month', current_date_var)::DATE;
      period_end := (DATE_TRUNC('month', current_date_var) + INTERVAL '1 month - 1 day')::DATE;
      period_name := format('%s %s', 
        CASE EXTRACT(MONTH FROM current_date_var)
          WHEN 1 THEN 'Enero' WHEN 2 THEN 'Febrero' WHEN 3 THEN 'Marzo'
          WHEN 4 THEN 'Abril' WHEN 5 THEN 'Mayo' WHEN 6 THEN 'Junio'
          WHEN 7 THEN 'Julio' WHEN 8 THEN 'Agosto' WHEN 9 THEN 'Septiembre'
          WHEN 10 THEN 'Octubre' WHEN 11 THEN 'Noviembre' WHEN 12 THEN 'Diciembre'
        END,
        EXTRACT(YEAR FROM current_date_var)
      );
  END CASE;
  
  -- Verificar si ya existe un período activo que coincida con las fechas
  SELECT * INTO existing_period
  FROM public.payroll_periods_real 
  WHERE company_id = company_id_var
    AND fecha_inicio = period_start
    AND fecha_fin = period_end
    AND estado IN ('borrador', 'en_proceso')
  ORDER BY created_at DESC
  LIMIT 1;
  
  RETURN jsonb_build_object(
    'success', true,
    'current_date', current_date_var,
    'periodicity', company_periodicity,
    'suggested_period', jsonb_build_object(
      'start_date', period_start,
      'end_date', period_end,
      'period_name', period_name,
      'type', company_periodicity
    ),
    'existing_period', CASE 
      WHEN existing_period.id IS NOT NULL THEN 
        jsonb_build_object(
          'id', existing_period.id,
          'periodo', existing_period.periodo,
          'estado', existing_period.estado,
          'fecha_inicio', existing_period.fecha_inicio,
          'fecha_fin', existing_period.fecha_fin
        )
      ELSE NULL 
    END,
    'action', CASE 
      WHEN existing_period.id IS NOT NULL THEN 'resume'
      ELSE 'create'
    END
  );
END;
$function$;

-- Función mejorada para diagnóstico que funciona con los tipos existentes
CREATE OR REPLACE FUNCTION public.diagnose_duplicate_periods(p_company_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  company_id_var UUID;
  duplicate_periods RECORD;
  duplicates_found INTEGER := 0;
  result JSONB := '[]'::jsonb;
  period_info JSONB;
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

  -- Buscar períodos duplicados por nombre
  FOR duplicate_periods IN
    SELECT 
      periodo,
      COUNT(*) as count,
      array_agg(id ORDER BY created_at DESC) as period_ids,
      array_agg(estado ORDER BY created_at DESC) as estados,
      array_agg(created_at ORDER BY created_at DESC) as fechas_creacion
    FROM public.payroll_periods_real 
    WHERE company_id = company_id_var
    GROUP BY periodo 
    HAVING COUNT(*) > 1
  LOOP
    duplicates_found := duplicates_found + 1;
    
    -- Construir información del período duplicado
    period_info := jsonb_build_object(
      'periodo', duplicate_periods.periodo,
      'count', duplicate_periods.count,
      'period_ids', duplicate_periods.period_ids,
      'estados', duplicate_periods.estados,
      'fechas_creacion', duplicate_periods.fechas_creacion
    );
    
    result := result || period_info;
    
    RAISE NOTICE 'Período duplicado encontrado: % (% instancias)', duplicate_periods.periodo, duplicate_periods.count;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'duplicates_found', duplicates_found,
    'company_id', company_id_var,
    'duplicate_periods', result
  );
END;
$function$;

-- Función mejorada para limpieza específica de duplicados
CREATE OR REPLACE FUNCTION public.clean_specific_duplicate_periods(p_company_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
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
