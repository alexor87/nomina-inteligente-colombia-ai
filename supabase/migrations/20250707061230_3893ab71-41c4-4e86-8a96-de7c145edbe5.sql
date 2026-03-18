
-- Agregar columna numero_periodo_anual a la tabla payroll_periods_real
ALTER TABLE public.payroll_periods_real 
ADD COLUMN numero_periodo_anual INTEGER NULL;

-- Crear índice compuesto para optimizar consultas y validaciones
CREATE INDEX idx_payroll_periods_year_type_number 
ON public.payroll_periods_real (
    company_id, 
    EXTRACT(YEAR FROM fecha_inicio), 
    tipo_periodo, 
    numero_periodo_anual
);

-- Comentario explicativo
COMMENT ON COLUMN public.payroll_periods_real.numero_periodo_anual IS 
'Número ordinal del período dentro del año (1, 2, 3...) según la periodicidad configurada por la empresa. NULL para períodos antiguos.';
