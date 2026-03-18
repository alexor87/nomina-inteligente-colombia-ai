
-- Corregir el período existente que tiene el año incorrecto
UPDATE public.payroll_periods_real 
SET periodo = '1 - 15 Enero 2025',
    updated_at = now()
WHERE id = '4f16dc83-b326-4c21-af61-60a39e083137'
AND periodo = 'Quincena 1 del 2024';

-- Corregir cualquier otro período con años inconsistentes
UPDATE public.payroll_periods_real 
SET periodo = CASE 
    WHEN fecha_inicio BETWEEN '2025-01-01' AND '2025-01-15' 
         AND fecha_fin BETWEEN '2025-01-01' AND '2025-01-15' 
    THEN '1 - 15 Enero 2025'
    WHEN fecha_inicio BETWEEN '2025-01-16' AND '2025-01-31' 
         AND fecha_fin BETWEEN '2025-01-16' AND '2025-01-31' 
    THEN '16 - 31 Enero 2025'
    ELSE periodo
END,
updated_at = now()
WHERE (periodo LIKE '%2024%' AND (fecha_inicio >= '2025-01-01' OR fecha_fin >= '2025-01-01'))
   OR (periodo LIKE '%2023%' AND (fecha_inicio >= '2025-01-01' OR fecha_fin >= '2025-01-01'));

-- Verificar que no haya más inconsistencias de años
-- Esta consulta debe devolver 0 filas después de la corrección
SELECT id, periodo, fecha_inicio, fecha_fin,
       EXTRACT(YEAR FROM fecha_inicio) as year_inicio,
       EXTRACT(YEAR FROM fecha_fin) as year_fin
FROM public.payroll_periods_real 
WHERE (
    (periodo LIKE '%2024%' AND (EXTRACT(YEAR FROM fecha_inicio) = 2025 OR EXTRACT(YEAR FROM fecha_fin) = 2025))
    OR 
    (periodo LIKE '%2025%' AND (EXTRACT(YEAR FROM fecha_inicio) = 2024 OR EXTRACT(YEAR FROM fecha_fin) = 2024))
    OR
    (periodo LIKE '%2023%' AND (EXTRACT(YEAR FROM fecha_inicio) >= 2024 OR EXTRACT(YEAR FROM fecha_fin) >= 2024))
);
