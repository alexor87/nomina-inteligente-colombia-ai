-- FASE 1: Función para consolidar períodos duplicados existentes
CREATE OR REPLACE FUNCTION public.consolidate_duplicate_periods()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  duplicate_record RECORD;
  primary_period_id UUID;
  secondary_period_id UUID;
  consolidated_count INTEGER := 0;
  result_data jsonb := '[]'::jsonb;
BEGIN
  -- Identificar duplicados (mismo company_id + fechas)
  FOR duplicate_record IN
    SELECT 
      company_id,
      fecha_inicio,
      fecha_fin,
      array_agg(id ORDER BY 
        -- Priorizar: 1) cerrado sobre borrador, 2) con employees_loaded, 3) más reciente
        CASE WHEN estado = 'cerrado' THEN 1 ELSE 2 END,
        CASE WHEN employees_loaded = true THEN 1 ELSE 2 END,
        created_at DESC
      ) as period_ids,
      array_agg(estado ORDER BY 
        CASE WHEN estado = 'cerrado' THEN 1 ELSE 2 END,
        CASE WHEN employees_loaded = true THEN 1 ELSE 2 END,
        created_at DESC
      ) as estados,
      array_agg(empleados_count ORDER BY 
        CASE WHEN estado = 'cerrado' THEN 1 ELSE 2 END,
        CASE WHEN employees_loaded = true THEN 1 ELSE 2 END,
        created_at DESC
      ) as counts
    FROM public.payroll_periods_real
    GROUP BY company_id, fecha_inicio, fecha_fin
    HAVING COUNT(*) > 1
  LOOP
    -- El primero en el array es el que conservamos (el prioritario)
    primary_period_id := duplicate_record.period_ids[1];
    
    -- Procesar cada duplicado secundario
    FOR i IN 2..array_length(duplicate_record.period_ids, 1) LOOP
      secondary_period_id := duplicate_record.period_ids[i];
      
      -- Migrar payrolls al período primario
      UPDATE public.payrolls
      SET period_id = primary_period_id,
          updated_at = now()
      WHERE period_id = secondary_period_id;
      
      -- Migrar novedades al período primario
      UPDATE public.payroll_novedades
      SET periodo_id = primary_period_id,
          updated_at = now()
      WHERE periodo_id = secondary_period_id;
      
      -- Migrar vouchers al período primario (actualizar por periodo nombre)
      UPDATE public.payroll_vouchers
      SET updated_at = now()
      WHERE periodo IN (
        SELECT periodo FROM public.payroll_periods_real WHERE id = secondary_period_id
      );
      
      -- Actualizar totales en el período primario con datos consolidados
      UPDATE public.payroll_periods_real
      SET 
        empleados_count = GREATEST(empleados_count, (
          SELECT COUNT(*) FROM public.payrolls WHERE period_id = primary_period_id
        )),
        total_devengado = COALESCE((
          SELECT SUM(total_devengado) FROM public.payrolls WHERE period_id = primary_period_id
        ), total_devengado),
        total_deducciones = COALESCE((
          SELECT SUM(total_deducciones) FROM public.payrolls WHERE period_id = primary_period_id
        ), total_deducciones),
        total_neto = COALESCE((
          SELECT SUM(neto_pagado) FROM public.payrolls WHERE period_id = primary_period_id
        ), total_neto),
        employees_loaded = true,
        calculated_at = COALESCE(calculated_at, now()),
        updated_at = now()
      WHERE id = primary_period_id;
      
      -- Eliminar el período secundario (duplicado)
      DELETE FROM public.payroll_periods_real
      WHERE id = secondary_period_id;
      
      consolidated_count := consolidated_count + 1;
      
      -- Registrar en el resultado
      result_data := result_data || jsonb_build_object(
        'primary_period_id', primary_period_id,
        'deleted_period_id', secondary_period_id,
        'company_id', duplicate_record.company_id,
        'fecha_inicio', duplicate_record.fecha_inicio,
        'fecha_fin', duplicate_record.fecha_fin
      );
    END LOOP;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'consolidated_count', consolidated_count,
    'details', result_data
  );
END;
$$;

-- EJECUTAR consolidación de duplicados existentes
SELECT public.consolidate_duplicate_periods();

-- FASE 2: Ahora agregar constraint único (después de limpiar duplicados)
ALTER TABLE public.payroll_periods_real 
DROP CONSTRAINT IF EXISTS payroll_periods_real_company_dates_unique;

ALTER TABLE public.payroll_periods_real 
ADD CONSTRAINT payroll_periods_real_company_dates_unique 
UNIQUE (company_id, fecha_inicio, fecha_fin);

-- Crear índice para optimizar búsqueda por fechas
CREATE INDEX IF NOT EXISTS idx_payroll_periods_company_dates 
ON public.payroll_periods_real(company_id, fecha_inicio, fecha_fin);