
-- Add trigger to prevent @test.com emails in employees table
CREATE OR REPLACE FUNCTION prevent_test_emails_in_employees()
RETURNS TRIGGER AS $$
BEGIN
    -- Block @test.com emails (case insensitive)
    IF NEW.email ILIKE '%@test.com' THEN
        -- Log the attempt
        INSERT INTO security_audit_log (
            company_id,
            user_id,
            table_name,
            action,
            violation_type,
            query_attempted,
            additional_data
        ) VALUES (
            NEW.company_id,
            auth.uid(),
            'employees',
            'INSERT',
            'demo_email_blocked',
            'Attempted to insert employee with @test.com email',
            jsonb_build_object(
                'blocked_email', NEW.email,
                'employee_name', NEW.nombre || ' ' || NEW.apellido,
                'company_id', NEW.company_id
            )
        );
        
        -- Raise exception to block the insert
        RAISE EXCEPTION 'Demo emails (@test.com) are not allowed in production. Email: %', NEW.email;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
DROP TRIGGER IF EXISTS prevent_test_emails_trigger ON employees;
CREATE TRIGGER prevent_test_emails_trigger
    BEFORE INSERT OR UPDATE ON employees
    FOR EACH ROW
    EXECUTE FUNCTION prevent_test_emails_in_employees();

-- One-time cleanup: Remove existing @test.com employees
-- First, check if they have associated payrolls
WITH test_employees AS (
    SELECT id, company_id, email, nombre, apellido
    FROM employees 
    WHERE email ILIKE '%@test.com'
),
employees_with_payrolls AS (
    SELECT DISTINCT te.id, te.email
    FROM test_employees te
    JOIN payrolls p ON p.employee_id = te.id
)
-- Delete employees without payrolls
DELETE FROM employees 
WHERE id IN (
    SELECT te.id 
    FROM test_employees te
    LEFT JOIN employees_with_payrolls ewp ON te.id = ewp.id
    WHERE ewp.id IS NULL
);

-- Inactivate employees with payrolls (can't delete due to foreign key constraints)
UPDATE employees 
SET estado = 'inactivo', 
    updated_at = now()
WHERE email ILIKE '%@test.com' 
AND estado = 'activo';
