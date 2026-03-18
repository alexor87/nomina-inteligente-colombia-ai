-- Ejecutar sincronización manual de la vacación existente de Alex Ortiz
INSERT INTO payroll_novedades (
    id,
    company_id,
    empleado_id,
    periodo_id,
    tipo_novedad,
    subtipo,
    fecha_inicio,
    fecha_fin,
    dias,
    valor,
    observacion,
    created_at,
    updated_at,
    creado_por
)
SELECT 
    evp.id,
    evp.company_id,
    evp.employee_id,
    evp.processed_in_period_id,
    evp.type::novedad_type,
    evp.subtipo,
    evp.start_date,
    evp.end_date,
    evp.days_count,
    (e.salario_base / 30.0) * evp.days_count as valor, -- Calcular valor para vacaciones
    COALESCE(evp.observations, ''),
    evp.created_at,
    evp.updated_at,
    evp.created_by
FROM employee_vacation_periods evp
JOIN employees e ON evp.employee_id = e.id
WHERE evp.id = 'cc0b3bdd-4f67-4c38-8ac6-073cecd21f5a'
ON CONFLICT (id) DO NOTHING;