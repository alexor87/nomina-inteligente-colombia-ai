-- Migration 1/5: Add SET search_path to foundational utility/validation triggers

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_period_activity()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
    NEW.last_activity_at = now();
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_company_field_definitions_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.validate_payroll_period_consistency()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
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
$function$;