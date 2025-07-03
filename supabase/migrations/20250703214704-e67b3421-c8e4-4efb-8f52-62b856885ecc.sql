
-- FASE 1: LIMPIEZA COMPLETA DE LA BASE DE DATOS
-- Eliminar todos los registros relacionados con nómina para el usuario actual

DO $$
DECLARE
    current_company_id UUID;
    deleted_vouchers INTEGER := 0;
    deleted_novedades INTEGER := 0;
    deleted_payrolls INTEGER := 0;
    deleted_periods_real INTEGER := 0;
    deleted_periods INTEGER := 0;
    deleted_sync_logs INTEGER := 0;
    deleted_audit_logs INTEGER := 0;
BEGIN
    -- Obtener company_id del usuario actual
    SELECT company_id INTO current_company_id 
    FROM public.profiles 
    WHERE user_id = auth.uid();
    
    IF current_company_id IS NOT NULL THEN
        RAISE NOTICE 'Iniciando limpieza completa para company_id: %', current_company_id;
        
        -- 1. Eliminar vouchers de nómina
        DELETE FROM public.payroll_vouchers WHERE company_id = current_company_id;
        GET DIAGNOSTICS deleted_vouchers = ROW_COUNT;
        
        -- 2. Eliminar novedades de nómina y sus auditorías
        DELETE FROM public.payroll_novedades_audit WHERE company_id = current_company_id;
        DELETE FROM public.payroll_novedades WHERE company_id = current_company_id;
        GET DIAGNOSTICS deleted_novedades = ROW_COUNT;
        
        -- 3. Eliminar registros de auditoría de reapertura
        DELETE FROM public.payroll_reopen_audit WHERE company_id = current_company_id;
        GET DIAGNOSTICS deleted_audit_logs = ROW_COUNT;
        
        -- 4. Eliminar todos los registros de nómina (payrolls)
        DELETE FROM public.payrolls WHERE company_id = current_company_id;
        GET DIAGNOSTICS deleted_payrolls = ROW_COUNT;
        
        -- 5. Eliminar logs de sincronización
        DELETE FROM public.payroll_sync_log WHERE company_id = current_company_id;
        GET DIAGNOSTICS deleted_sync_logs = ROW_COUNT;
        
        -- 6. Eliminar todos los períodos de nómina (tabla real)
        DELETE FROM public.payroll_periods_real WHERE company_id = current_company_id;
        GET DIAGNOSTICS deleted_periods_real = ROW_COUNT;
        
        -- 7. Eliminar períodos de la tabla legacy (si existen)
        DELETE FROM public.payroll_periods WHERE company_id = current_company_id;
        GET DIAGNOSTICS deleted_periods = ROW_COUNT;
        
        -- Mostrar resumen de limpieza
        RAISE NOTICE 'LIMPIEZA COMPLETADA:';
        RAISE NOTICE '- Vouchers eliminados: %', deleted_vouchers;
        RAISE NOTICE '- Novedades eliminadas: %', deleted_novedades;
        RAISE NOTICE '- Registros de nómina eliminados: %', deleted_payrolls;
        RAISE NOTICE '- Períodos reales eliminados: %', deleted_periods_real;
        RAISE NOTICE '- Períodos legacy eliminados: %', deleted_periods;
        RAISE NOTICE '- Logs de sincronización eliminados: %', deleted_sync_logs;
        RAISE NOTICE '- Logs de auditoría eliminados: %', deleted_audit_logs;
        
    ELSE
        RAISE NOTICE 'No se encontró company_id para el usuario actual';
    END IF;
END $$;

-- FASE 2: VERIFICAR QUE LA CONFIGURACIÓN DE LA EMPRESA EXISTE
-- Asegurar que existe configuración de periodicidad (quincenal por defecto)

DO $$
DECLARE
    current_company_id UUID;
    existing_config RECORD;
BEGIN
    -- Obtener company_id del usuario actual
    SELECT company_id INTO current_company_id 
    FROM public.profiles 
    WHERE user_id = auth.uid();
    
    IF current_company_id IS NOT NULL THEN
        -- Verificar si existe configuración
        SELECT * INTO existing_config
        FROM public.company_settings 
        WHERE company_id = current_company_id;
        
        IF existing_config IS NULL THEN
            -- Crear configuración por defecto
            INSERT INTO public.company_settings (
                company_id,
                periodicity,
                custom_period_days
            ) VALUES (
                current_company_id,
                'quincenal',
                15
            );
            RAISE NOTICE 'Configuración de empresa creada: periodicidad quincenal';
        ELSE
            -- Actualizar a quincenal si no lo está
            UPDATE public.company_settings 
            SET periodicity = 'quincenal',
                custom_period_days = 15,
                updated_at = now()
            WHERE company_id = current_company_id;
            RAISE NOTICE 'Configuración actualizada: periodicidad quincenal';
        END IF;
    END IF;
END $$;

-- FASE 3: CREAR FUNCIÓN DE DETECCIÓN INTELIGENTE MEJORADA
-- Esta función detectará correctamente el período basado en la fecha actual

CREATE OR REPLACE FUNCTION public.detect_current_smart_period(p_company_id uuid DEFAULT NULL::uuid)
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
  active_period RECORD;
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
  
  -- Si no existe configuración, usar quincenal por defecto para julio 2025
  IF company_periodicity IS NULL THEN
    company_periodicity := 'quincenal';
  END IF;
  
  current_date_var := CURRENT_DATE;
  RAISE NOTICE 'Fecha actual: %, Periodicidad: %', current_date_var, company_periodicity;
  
  -- LÓGICA CORREGIDA: Calcular período actual basado en la fecha actual (3 julio 2025)
  CASE company_periodicity
    WHEN 'quincenal' THEN
      -- Para quincenal: 1-15 y 16-último día del mes
      IF EXTRACT(DAY FROM current_date_var) <= 15 THEN
        -- Primera quincena (1-15)
        period_start := DATE_TRUNC('month', current_date_var)::DATE;
        period_end := (DATE_TRUNC('month', current_date_var) + INTERVAL '14 days')::DATE;
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
        -- Segunda quincena (16-fin de mes)
        period_start := (DATE_TRUNC('month', current_date_var) + INTERVAL '15 days')::DATE;
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
      period_start := (current_date_var - (EXTRACT(DOW FROM current_date_var) - 1) * INTERVAL '1 day')::DATE;
      period_end := (period_start + INTERVAL '6 days')::DATE;
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
  
  RAISE NOTICE 'Período calculado: % (% - %)', period_name, period_start, period_end;
  
  -- Verificar si ya existe un período activo
  SELECT * INTO active_period
  FROM public.payroll_periods_real 
  WHERE company_id = company_id_var
    AND estado IN ('borrador', 'en_proceso')
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- Verificar si existe período para las fechas exactas calculadas
  SELECT * INTO existing_period
  FROM public.payroll_periods_real 
  WHERE company_id = company_id_var
    AND fecha_inicio = period_start
    AND fecha_fin = period_end
  ORDER BY created_at DESC
  LIMIT 1;
  
  RETURN jsonb_build_object(
    'success', true,
    'current_date', current_date_var,
    'periodicity', company_periodicity,
    'calculated_period', jsonb_build_object(
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
    'active_period', CASE 
      WHEN active_period.id IS NOT NULL THEN 
        jsonb_build_object(
          'id', active_period.id,
          'periodo', active_period.periodo,
          'estado', active_period.estado,
          'fecha_inicio', active_period.fecha_inicio,
          'fecha_fin', active_period.fecha_fin
        )
      ELSE NULL 
    END,
    'action', CASE 
      WHEN active_period.id IS NOT NULL THEN 'resume'
      WHEN existing_period.id IS NOT NULL THEN 'resume'
      ELSE 'create'
    END,
    'message', CASE 
      WHEN active_period.id IS NOT NULL THEN 
        format('Continuar con período activo: %s', active_period.periodo)
      WHEN existing_period.id IS NOT NULL THEN 
        format('Continuar con período existente: %s', existing_period.periodo)
      ELSE 
        format('Crear período: %s', period_name)
    END
  );
END;
$function$;

-- FASE 4: VERIFICACIÓN FINAL
-- Verificar que la limpieza fue exitosa

DO $$
DECLARE
    current_company_id UUID;
    remaining_records INTEGER;
BEGIN
    SELECT company_id INTO current_company_id 
    FROM public.profiles 
    WHERE user_id = auth.uid();
    
    IF current_company_id IS NOT NULL THEN
        SELECT 
            (SELECT COUNT(*) FROM public.payrolls WHERE company_id = current_company_id) +
            (SELECT COUNT(*) FROM public.payroll_periods_real WHERE company_id = current_company_id) +
            (SELECT COUNT(*) FROM public.payroll_vouchers WHERE company_id = current_company_id) +
            (SELECT COUNT(*) FROM public.payroll_novedades WHERE company_id = current_company_id)
        INTO remaining_records;
        
        IF remaining_records = 0 THEN
            RAISE NOTICE '✅ LIMPIEZA EXITOSA: Base de datos completamente limpia';
            RAISE NOTICE '✅ CONFIGURACIÓN: Periodicidad quincenal configurada';
            RAISE NOTICE '✅ DETECCIÓN: Función de detección inteligente actualizada';
            RAISE NOTICE '🎯 RESULTADO ESPERADO: Sistema sugerirá "1 - 15 Julio 2025"';
        ELSE
            RAISE NOTICE '⚠️ ADVERTENCIA: Aún quedan % registros', remaining_records;
        END IF;
    END IF;
END $$;
