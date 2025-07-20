-- Corregir la función detect_current_smart_period para generar años correctos
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
  
  -- Si no existe configuración, usar quincenal por defecto
  IF company_periodicity IS NULL THEN
    company_periodicity := 'quincenal';
  END IF;
  
  current_date_var := CURRENT_DATE;
  RAISE NOTICE 'Fecha actual: %, Periodicidad: %', current_date_var, company_periodicity;
  
  -- LÓGICA CORREGIDA: Calcular período actual basado en la fecha actual
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
          EXTRACT(YEAR FROM current_date_var)::text
        );
      ELSE
        -- Segunda quincena (16-fin de mes)
        period_start := (DATE_TRUNC('month', current_date_var) + INTERVAL '15 days')::DATE;
        period_end := (DATE_TRUNC('month', current_date_var) + INTERVAL '1 month - 1 day')::DATE;
        period_name := format('16 - %s %s %s', 
          EXTRACT(DAY FROM period_end)::text,
          CASE EXTRACT(MONTH FROM current_date_var)
            WHEN 1 THEN 'Enero' WHEN 2 THEN 'Febrero' WHEN 3 THEN 'Marzo'
            WHEN 4 THEN 'Abril' WHEN 5 THEN 'Mayo' WHEN 6 THEN 'Junio'
            WHEN 7 THEN 'Julio' WHEN 8 THEN 'Agosto' WHEN 9 THEN 'Septiembre'
            WHEN 10 THEN 'Octubre' WHEN 11 THEN 'Noviembre' WHEN 12 THEN 'Diciembre'
          END,
          EXTRACT(YEAR FROM current_date_var)::text
        );
      END IF;
      
    WHEN 'semanal' THEN
      -- Para semanal: lunes a domingo
      period_start := (current_date_var - (EXTRACT(DOW FROM current_date_var) - 1) * INTERVAL '1 day')::DATE;
      period_end := (period_start + INTERVAL '6 days')::DATE;
      period_name := format('Semana %s-%s %s %s', 
        EXTRACT(DAY FROM period_start)::text,
        EXTRACT(DAY FROM period_end)::text,
        CASE EXTRACT(MONTH FROM current_date_var)
          WHEN 1 THEN 'Enero' WHEN 2 THEN 'Febrero' WHEN 3 THEN 'Marzo'
          WHEN 4 THEN 'Abril' WHEN 5 THEN 'Mayo' WHEN 6 THEN 'Junio'
          WHEN 7 THEN 'Julio' WHEN 8 THEN 'Agosto' WHEN 9 THEN 'Septiembre'
          WHEN 10 THEN 'Octubre' WHEN 11 THEN 'Noviembre' WHEN 12 THEN 'Diciembre'
        END,
        EXTRACT(YEAR FROM current_date_var)::text
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
        EXTRACT(YEAR FROM current_date_var)::text
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