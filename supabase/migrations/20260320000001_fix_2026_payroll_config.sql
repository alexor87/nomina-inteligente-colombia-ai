-- Corregir configuración de nómina 2026 que fue creada con valores 2025 por defecto
-- Los registros year='2026' con salary_min=1423500 o transport_allowance=200000
-- fueron generados automáticamente antes de que se actualizaran las constantes 2026.
UPDATE public.company_payroll_configurations
SET
  salary_min = 1750905,
  transport_allowance = 249095,
  updated_at = NOW()
WHERE year = '2026'
  AND (salary_min = 1423500 OR transport_allowance = 200000);
