
-- Step 1: Normalize unrecognized 'revision' state to 'cerrado'
UPDATE public.payroll_periods_real 
SET estado = 'cerrado' 
WHERE estado = 'revision';

-- Step 2: Update any payrolls table records with 'revision' state
UPDATE public.payrolls 
SET estado = 'cerrado' 
WHERE estado = 'revision';

-- Step 3: Create function to synchronize periods between tables
CREATE OR REPLACE FUNCTION sync_payroll_periods()
RETURNS void AS $$
DECLARE
    period_record RECORD;
BEGIN
    -- Insert missing periods from payrolls into payroll_periods_real
    FOR period_record IN 
        SELECT DISTINCT 
            p.company_id,
            p.periodo,
            MIN(p.created_at) as fecha_inicio_approx,
            MAX(p.updated_at) as fecha_fin_approx,
            'mensual' as tipo_periodo,
            p.estado
        FROM public.payrolls p
        WHERE NOT EXISTS (
            SELECT 1 FROM public.payroll_periods_real ppr 
            WHERE ppr.company_id = p.company_id 
            AND ppr.periodo = p.periodo
        )
        AND p.company_id IS NOT NULL
        GROUP BY p.company_id, p.periodo, p.estado
    LOOP
        INSERT INTO public.payroll_periods_real (
            company_id,
            periodo,
            fecha_inicio,
            fecha_fin,
            tipo_periodo,
            estado,
            empleados_count,
            total_devengado,
            total_deducciones,
            total_neto
        )
        SELECT 
            period_record.company_id,
            period_record.periodo,
            COALESCE(period_record.fecha_inicio_approx::date, CURRENT_DATE),
            COALESCE(period_record.fecha_fin_approx::date, CURRENT_DATE),
            period_record.tipo_periodo,
            period_record.estado,
            COUNT(*) as empleados_count,
            COALESCE(SUM(total_devengado), 0) as total_devengado,
            COALESCE(SUM(total_deducciones), 0) as total_deducciones,
            COALESCE(SUM(neto_pagado), 0) as total_neto
        FROM public.payrolls p
        WHERE p.company_id = period_record.company_id 
        AND p.periodo = period_record.periodo;
    END LOOP;

    RAISE NOTICE 'Synchronization completed successfully';
END;
$$ LANGUAGE plpgsql;

-- Step 4: Execute the synchronization
SELECT sync_payroll_periods();

-- Step 5: Add period_id to payrolls where missing (if not already done)
UPDATE public.payrolls 
SET period_id = (
    SELECT ppr.id 
    FROM public.payroll_periods_real ppr
    WHERE ppr.company_id = payrolls.company_id
    AND ppr.periodo = payrolls.periodo
    LIMIT 1
)
WHERE period_id IS NULL;

-- Step 6: Clean up duplicate draft periods - keep only the most recent one per company
WITH ranked_drafts AS (
    SELECT id, 
           ROW_NUMBER() OVER (PARTITION BY company_id ORDER BY created_at DESC) as rn
    FROM public.payroll_periods_real 
    WHERE estado = 'borrador'
)
UPDATE public.payroll_periods_real 
SET estado = 'cancelado'
WHERE id IN (
    SELECT id FROM ranked_drafts WHERE rn > 1
);

-- Step 7: Create validation function to prevent future inconsistencies
CREATE OR REPLACE FUNCTION validate_payroll_period_consistency()
RETURNS TRIGGER AS $$
BEGIN
    -- Ensure period exists in payroll_periods_real when inserting into payrolls
    IF TG_TABLE_NAME = 'payrolls' THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.payroll_periods_real 
            WHERE company_id = NEW.company_id 
            AND periodo = NEW.periodo
        ) THEN
            RAISE EXCEPTION 'Period % does not exist in payroll_periods_real for company %', 
                NEW.periodo, NEW.company_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 8: Create triggers for validation (optional - for future prevention)
-- DROP TRIGGER IF EXISTS validate_payroll_consistency ON public.payrolls;
-- CREATE TRIGGER validate_payroll_consistency
--     BEFORE INSERT OR UPDATE ON public.payrolls
--     FOR EACH ROW EXECUTE FUNCTION validate_payroll_period_consistency();

-- Step 9: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_payrolls_company_periodo ON public.payrolls(company_id, periodo);
CREATE INDEX IF NOT EXISTS idx_payroll_periods_real_company_periodo ON public.payroll_periods_real(company_id, periodo);

-- Step 10: Update statistics for all affected tables
ANALYZE public.payroll_periods_real;
ANALYZE public.payrolls;
