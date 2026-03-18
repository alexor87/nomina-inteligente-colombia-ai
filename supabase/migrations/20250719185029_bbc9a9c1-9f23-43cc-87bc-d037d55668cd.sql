-- Actualizar la vacación existente de Alex Ortiz para darle un periodo_id temporal
-- y luego sincronizar con novedades
UPDATE employee_vacation_periods 
SET processed_in_period_id = (
    SELECT id FROM payroll_periods_real 
    WHERE company_id = '969badef-d724-47f7-931a-e6924795c86e' 
    LIMIT 1
)
WHERE id = 'cc0b3bdd-4f67-4c38-8ac6-073cecd21f5a';