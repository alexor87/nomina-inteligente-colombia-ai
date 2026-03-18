-- Crear función temporal para generar nombres correctos de períodos
CREATE OR REPLACE FUNCTION temp_generate_correct_period_name(start_date DATE, end_date DATE)
RETURNS TEXT AS $$
DECLARE
    start_day INTEGER;
    end_day INTEGER;
    start_month INTEGER;
    start_year INTEGER;
    month_names TEXT[] := ARRAY[
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    month_name TEXT;
BEGIN
    start_day := EXTRACT(DAY FROM start_date);
    end_day := EXTRACT(DAY FROM end_date);
    start_month := EXTRACT(MONTH FROM start_date);
    start_year := EXTRACT(YEAR FROM start_date);
    
    -- Obtener nombre del mes basado en la fecha de INICIO
    month_name := month_names[start_month];
    
    -- Para períodos quincenales, usar siempre el mes de la fecha de inicio
    IF start_day = 1 AND end_day = 15 THEN
        RETURN format('1 - 15 %s %s', month_name, start_year);
    ELSIF start_day = 16 THEN
        RETURN format('16 - %s %s %s', end_day, month_name, start_year);
    ELSE
        -- Para otros casos, usar formato estándar
        RETURN format('%s - %s %s %s', start_day, end_day, month_name, start_year);
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Corregir los nombres de períodos incorrectos
UPDATE payroll_periods_real 
SET 
    periodo = temp_generate_correct_period_name(fecha_inicio, fecha_fin),
    updated_at = now()
WHERE tipo_periodo = 'quincenal'
  AND EXTRACT(DAY FROM fecha_inicio) = 1
  AND EXTRACT(DAY FROM fecha_fin) = 15
  AND (
    (fecha_inicio = '2025-10-01' AND periodo = '1 - 15 Septiembre 2025') OR
    (fecha_inicio = '2025-11-01' AND periodo = '1 - 15 Octubre 2025') OR
    (fecha_inicio = '2025-12-01' AND periodo = '1 - 15 Noviembre 2025')
  );

-- Eliminar función temporal
DROP FUNCTION temp_generate_correct_period_name(DATE, DATE);