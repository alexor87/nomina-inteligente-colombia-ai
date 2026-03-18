-- Crear función para forzar sincronización de registros existentes
CREATE OR REPLACE FUNCTION force_sync_existing_novedades()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;