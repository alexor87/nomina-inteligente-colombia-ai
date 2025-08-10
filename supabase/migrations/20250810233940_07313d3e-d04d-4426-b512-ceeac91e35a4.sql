-- Micro-migración 1/3: Asegurar search_path en función SECURITY DEFINER
-- Objetivo: Reducir "Function Search Path Mutable" para diagnose_duplicate_periods

CREATE OR REPLACE FUNCTION public.diagnose_duplicate_periods(p_company_id uuid DEFAULT NULL::uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
