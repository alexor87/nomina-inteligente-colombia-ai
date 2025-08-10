-- Migration 4/5: Add SET search_path to generation/sync and audit triggers

CREATE OR REPLACE FUNCTION public.generate_payroll_records_for_period(p_period_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  period_record RECORD;
  employee_record RECORD;
  company_id_var UUID;
  records_created INTEGER := 0;
BEGIN
  -- Get period information
  SELECT * INTO period_record
  FROM public.payroll_periods_real 
  WHERE id = p_period_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Período no encontrado');
  END IF;

  company_id_var := period_record.company_id;

  -- Check if payroll records already exist
  IF EXISTS (
    SELECT 1 FROM public.payrolls 
    WHERE period_id = p_period_id
  ) THEN
    RETURN jsonb_build_object('success', true, 'message', 'Los registros de nómina ya existen');
  END IF;

  -- Create payroll records for active employees
  FOR employee_record IN
    SELECT * FROM public.employees 
    WHERE company_id = company_id_var AND estado = 'activo'
  LOOP
    INSERT INTO public.payrolls (
      company_id,
      employee_id,
      periodo,
      period_id,
      salario_base,
      dias_trabajados,
      total_devengado,
      total_deducciones,
      neto_pagado,
      estado,
      created_at
    ) VALUES (
      company_id_var,
      employee_record.id,
      period_record.periodo,
      p_period_id,
      employee_record.salario_base,
      COALESCE(employee_record.dias_trabajo, 30),
      employee_record.salario_base,
      employee_record.salario_base * 0.08,
      employee_record.salario_base * 0.92,
      'borrador',
      now()
    );
    
    records_created := records_created + 1;
  END LOOP;

  -- Update period totals
  UPDATE public.payroll_periods_real 
  SET 
    empleados_count = records_created,
    total_devengado = (
      SELECT COALESCE(SUM(total_devengado), 0) 
      FROM public.payrolls 
      WHERE period_id = p_period_id
    ),
    total_deducciones = (
      SELECT COALESCE(SUM(total_deducciones), 0) 
      FROM public.payrolls 
      WHERE period_id = p_period_id
    ),
    total_neto = (
      SELECT COALESCE(SUM(neto_pagado), 0) 
      FROM public.payrolls 
      WHERE period_id = p_period_id
    ),
    updated_at = now()
  WHERE id = p_period_id;

  RETURN jsonb_build_object(
    'success', true, 
    'message', format('Se crearon %s registros de nómina', records_created),
    'records_created', records_created
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false, 
    'message', format('Error creando registros: %s', SQLERRM)
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.force_sync_existing_novedades()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    novedad_record RECORD;
    vacation_types novedad_type[] := ARRAY['vacaciones', 'licencia_remunerada', 'licencia_no_remunerada', 'incapacidad', 'ausencia'];
    mapped_subtipo TEXT;
    period_status TEXT;
    calculated_status TEXT;
    sync_count INTEGER := 0;
BEGIN
    -- Procesar todos los registros de novedades de vacaciones que no estén sincronizados
    FOR novedad_record IN
        SELECT pn.* FROM payroll_novedades pn
        WHERE pn.tipo_novedad = ANY(vacation_types)
        AND NOT EXISTS (
            SELECT 1 FROM employee_vacation_periods evp 
            WHERE evp.id = pn.id
        )
    LOOP
        -- Determinar estado basado en el período
        calculated_status := 'pendiente';
        
        IF novedad_record.periodo_id IS NOT NULL THEN
            SELECT estado INTO period_status
            FROM payroll_periods_real 
            WHERE id = novedad_record.periodo_id;
            
            IF period_status = 'cerrado' THEN
                calculated_status := 'liquidada';
            END IF;
        END IF;
        
        -- Mapear subtipo
        mapped_subtipo := COALESCE(novedad_record.subtipo, novedad_record.subtipo);
        
        -- Insertar registro sincronizado
        INSERT INTO employee_vacation_periods (
            id,
            employee_id,
            company_id,
            type,
            subtipo,
            start_date,
            end_date,
            days_count,
            observations,
            status,
            created_by,
            processed_in_period_id,
            created_at,
            updated_at
        ) VALUES (
            novedad_record.id,
            novedad_record.empleado_id,
            novedad_record.company_id,
            novedad_record.tipo_novedad,
            mapped_subtipo,
            novedad_record.fecha_inicio,
            novedad_record.fecha_fin,
            COALESCE(novedad_record.dias, 0),
            COALESCE(novedad_record.observacion, ''),
            calculated_status,
            novedad_record.creado_por,
            novedad_record.periodo_id,
            novedad_record.created_at,
            novedad_record.updated_at
        );
        
        sync_count := sync_count + 1;
        RAISE NOTICE 'Sincronizado registro ID: %, Tipo: %, Estado: %', 
            novedad_record.id, novedad_record.tipo_novedad, calculated_status;
    END LOOP;
    
    RETURN format('Sincronización completada: %s registros procesados', sync_count);
END;
$function$;

CREATE OR REPLACE FUNCTION public.sync_vacation_to_novedad()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
    company_id_var UUID;
    salary_base NUMERIC;
    calculated_value NUMERIC;
    daily_salary NUMERIC;
    period_info RECORD;
    intersection_days INTEGER;
    total_days INTEGER;
    vacation_types novedad_type[] := ARRAY['vacaciones', 'licencia_remunerada', 'licencia_no_remunerada', 'incapacidad', 'ausencia'];
    _recursion_guard BOOLEAN;
BEGIN
    -- PROTECCIÓN CONTRA RECURSIÓN
    SELECT current_setting('app.sync_in_progress', true) INTO _recursion_guard;
    IF _recursion_guard = 'true' THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    PERFORM set_config('app.sync_in_progress', 'true', true);

    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        IF NEW.type = ANY(vacation_types) THEN
            -- VALIDACIÓN CLAVE: Solo sincronizar si tiene período asignado
            IF NEW.processed_in_period_id IS NULL THEN
                RAISE NOTICE 'Ausencia % sin período asignado - no se sincroniza a novedades', NEW.id;
                PERFORM set_config('app.sync_in_progress', 'false', true);
                RETURN NEW;
            END IF;
            
            -- Obtener datos del empleado
            SELECT e.company_id, e.salario_base 
            INTO company_id_var, salary_base
            FROM employees e 
            WHERE e.id = NEW.employee_id;
            
            daily_salary := COALESCE(salary_base / 30.0, 0);
            
            -- Obtener datos del período
            SELECT fecha_inicio, fecha_fin 
            INTO period_info
            FROM payroll_periods_real 
            WHERE id = NEW.processed_in_period_id;
            
            -- Calcular días de intersección entre ausencia y período
            intersection_days := calculate_period_intersection_days(
                NEW.start_date, 
                NEW.end_date, 
                period_info.fecha_inicio, 
                period_info.fecha_fin
            );
            
            -- Usar días de intersección en lugar de días totales
            total_days := intersection_days;
            
            -- Calcular valor proporcional basado en días fragmentados
            CASE NEW.type
                WHEN 'vacaciones', 'licencia_remunerada' THEN
                    calculated_value := daily_salary * total_days;
                WHEN 'incapacidad' THEN
                    calculated_value := CASE 
                        WHEN total_days <= 2 THEN 0
                        ELSE daily_salary * (total_days - 2) * 0.6667
                    END;
                WHEN 'ausencia' THEN
                    calculated_value := -(daily_salary * total_days);
                WHEN 'licencia_no_remunerada' THEN
                    calculated_value := 0;
                ELSE
                    calculated_value := 0;
            END CASE;
            
            -- Insertar/actualizar con días y valor fragmentados
            INSERT INTO payroll_novedades (
                id, company_id, empleado_id, periodo_id, tipo_novedad, subtipo,
                fecha_inicio, fecha_fin, dias, valor, observacion, constitutivo_salario,
                created_at, updated_at, creado_por
            ) VALUES (
                NEW.id, company_id_var, NEW.employee_id, NEW.processed_in_period_id,
                NEW.type::novedad_type, NEW.subtipo, NEW.start_date, NEW.end_date,
                total_days, -- Usar días fragmentados
                calculated_value, -- Usar valor proporcional
                COALESCE(NEW.observations, ''), false,
                NEW.created_at, NEW.updated_at, NEW.created_by
            ) ON CONFLICT (id) DO UPDATE SET
                empleado_id = EXCLUDED.empleado_id,
                periodo_id = EXCLUDED.periodo_id,
                tipo_novedad = EXCLUDED.tipo_novedad,
                subtipo = EXCLUDED.subtipo,
                fecha_inicio = EXCLUDED.fecha_inicio,
                fecha_fin = EXCLUDED.fecha_fin,
                dias = EXCLUDED.dias, -- Actualizar días fragmentados
                valor = EXCLUDED.valor, -- Actualizar valor proporcional
                observacion = EXCLUDED.observacion,
                constitutivo_salario = EXCLUDED.constitutivo_salario,
                updated_at = EXCLUDED.updated_at,
                creado_por = EXCLUDED.creado_por;
                
            RAISE NOTICE 'Ausencia sincronizada: % días fragmentados, Valor: %', total_days, calculated_value;
        END IF;
        
        PERFORM set_config('app.sync_in_progress', 'false', true);
        RETURN NEW;
    END IF;
    
    IF TG_OP = 'DELETE' THEN
        IF OLD.type = ANY(vacation_types) THEN
            DELETE FROM payroll_novedades WHERE id = OLD.id;
            RAISE NOTICE 'Eliminada novedad fragmentada ID: %', OLD.id;
        END IF;
        
        PERFORM set_config('app.sync_in_progress', 'false', true);
        RETURN OLD;
    END IF;
    
    PERFORM set_config('app.sync_in_progress', 'false', true);
    RETURN NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION public.audit_payroll_novedades_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO payroll_novedades_audit (
      novedad_id,
      company_id,
      action,
      old_values,
      new_values,
      user_id
    ) VALUES (
      NEW.id,
      NEW.company_id,
      'created',
      NULL,
      to_jsonb(NEW),
      auth.uid()
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO payroll_novedades_audit (
      novedad_id,
      company_id,
      action,
      old_values,
      new_values,
      user_id
    ) VALUES (
      NEW.id,
      NEW.company_id,
      'updated',
      to_jsonb(OLD),
      to_jsonb(NEW),
      auth.uid()
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO payroll_novedades_audit (
      novedad_id,
      company_id,
      action,
      old_values,
      new_values,
      user_id
    ) VALUES (
      OLD.id,
      OLD.company_id,
      'deleted',
      to_jsonb(OLD),
      NULL,
      auth.uid()
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$function$;