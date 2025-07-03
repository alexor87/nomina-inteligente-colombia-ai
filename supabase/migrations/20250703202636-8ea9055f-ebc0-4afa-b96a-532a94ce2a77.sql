
-- FASE 1: Función para diagnosticar períodos duplicados
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

-- FASE 2: Función para limpiar períodos duplicados específicos
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

-- FASE 3: Función mejorada para prevenir duplicados futuros
CREATE OR REPLACE FUNCTION public.validate_period_creation()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Verificar que no exista un período con el mismo nombre para la misma empresa
  IF EXISTS (
    SELECT 1 FROM public.payroll_periods_real 
    WHERE company_id = NEW.company_id 
    AND periodo = NEW.periodo 
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
  ) THEN
    RAISE EXCEPTION 'Ya existe un período con el nombre "%" para esta empresa', NEW.periodo;
  END IF;

  -- Verificar que no haya solapamiento de fechas
  IF EXISTS (
    SELECT 1 FROM public.payroll_periods_real 
    WHERE company_id = NEW.company_id
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    AND (
      (NEW.fecha_inicio BETWEEN fecha_inicio AND fecha_fin) OR
      (NEW.fecha_fin BETWEEN fecha_inicio AND fecha_fin) OR
      (fecha_inicio BETWEEN NEW.fecha_inicio AND NEW.fecha_fin) OR
      (fecha_fin BETWEEN NEW.fecha_inicio AND NEW.fecha_fin)
    )
  ) THEN
    RAISE EXCEPTION 'Las fechas del período se solapan con un período existente';
  END IF;

  RETURN NEW;
END;
$function$;

-- Crear el trigger para validar creación de períodos
DROP TRIGGER IF EXISTS validate_period_creation_trigger ON public.payroll_periods_real;
CREATE TRIGGER validate_period_creation_trigger
  BEFORE INSERT OR UPDATE ON public.payroll_periods_real
  FOR EACH ROW EXECUTE FUNCTION validate_period_creation();

-- FASE 4: Ejecutar limpieza automática de duplicados existentes
SELECT public.clean_specific_duplicate_periods();
