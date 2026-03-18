
-- Completar la migración de payroll_novedades
-- Paso 1: Verificar que todos los registros tengan periodo_real_id poblado
UPDATE public.payroll_novedades 
SET periodo_real_id = (
  SELECT pr.id 
  FROM public.payroll_periods_real pr
  WHERE pr.company_id = payroll_novedades.company_id
    AND pr.periodo = (
      SELECT DISTINCT p.periodo 
      FROM public.payrolls p 
      WHERE p.employee_id = payroll_novedades.empleado_id 
        AND p.company_id = payroll_novedades.company_id
      LIMIT 1
    )
)
WHERE periodo_real_id IS NULL;

-- Paso 2: Eliminar la constraint antigua
ALTER TABLE public.payroll_novedades 
DROP CONSTRAINT IF EXISTS payroll_novedades_periodo_id_fkey;

-- Paso 3: Eliminar la columna antigua periodo_id
ALTER TABLE public.payroll_novedades 
DROP COLUMN IF EXISTS periodo_id;

-- Paso 4: Renombrar periodo_real_id a periodo_id
ALTER TABLE public.payroll_novedades 
RENAME COLUMN periodo_real_id TO periodo_id;

-- Paso 5: Hacer la columna NOT NULL (ahora que todos los datos están migrados)
ALTER TABLE public.payroll_novedades 
ALTER COLUMN periodo_id SET NOT NULL;

-- Paso 6: Agregar la constraint con el nombre correcto
ALTER TABLE public.payroll_novedades 
ADD CONSTRAINT payroll_novedades_periodo_id_fkey
FOREIGN KEY (periodo_id) REFERENCES public.payroll_periods_real(id)
ON DELETE CASCADE;

-- Paso 7: Agregar índice para mejor performance
CREATE INDEX IF NOT EXISTS idx_payroll_novedades_periodo_id 
ON public.payroll_novedades(periodo_id);
