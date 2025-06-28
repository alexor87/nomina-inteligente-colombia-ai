
-- Crear tabla payroll_periods_real para manejar períodos con UUIDs reales
CREATE TABLE IF NOT EXISTS public.payroll_periods_real (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  periodo TEXT NOT NULL, -- e.g., "2025-01", "2025-02"
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE NOT NULL,
  tipo_periodo TEXT NOT NULL DEFAULT 'mensual',
  estado TEXT NOT NULL DEFAULT 'borrador',
  empleados_count INTEGER DEFAULT 0,
  total_devengado NUMERIC DEFAULT 0,
  total_deducciones NUMERIC DEFAULT 0,
  total_neto NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Agregar índices para mejor performance
CREATE INDEX IF NOT EXISTS idx_payroll_periods_real_company_periodo ON public.payroll_periods_real(company_id, periodo);
CREATE INDEX IF NOT EXISTS idx_payroll_periods_real_periodo ON public.payroll_periods_real(periodo);

-- RLS para payroll_periods_real
ALTER TABLE public.payroll_periods_real ENABLE ROW LEVEL SECURITY;

-- Política para que usuarios solo vean períodos de su empresa
CREATE POLICY "Users can view their company payroll periods" 
  ON public.payroll_periods_real 
  FOR SELECT 
  USING (company_id = get_current_user_company_id());

-- Política para insertar períodos
CREATE POLICY "Users can create payroll periods for their company" 
  ON public.payroll_periods_real 
  FOR INSERT 
  WITH CHECK (company_id = get_current_user_company_id());

-- Política para actualizar períodos
CREATE POLICY "Users can update their company payroll periods" 
  ON public.payroll_periods_real 
  FOR UPDATE 
  USING (company_id = get_current_user_company_id());

-- Migrar datos existentes: crear períodos reales basados en los payrolls existentes
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
  p.company_id,
  p.periodo,
  MIN(DATE_TRUNC('month', p.created_at::date)) as fecha_inicio,
  MAX(DATE_TRUNC('month', p.created_at::date) + INTERVAL '1 month - 1 day') as fecha_fin,
  'mensual' as tipo_periodo,
  CASE 
    WHEN p.estado = 'pagada' THEN 'cerrado'
    WHEN p.estado = 'borrador' THEN 'revision'
    ELSE 'borrador'
  END as estado,
  COUNT(DISTINCT p.employee_id) as empleados_count,
  SUM(COALESCE(p.total_devengado, 0)) as total_devengado,
  SUM(COALESCE(p.total_deducciones, 0)) as total_deducciones,
  SUM(COALESCE(p.neto_pagado, 0)) as total_neto
FROM public.payrolls p
GROUP BY p.company_id, p.periodo, p.estado
ON CONFLICT DO NOTHING;

-- Actualizar la constraint de payroll_novedades para usar el período real
-- Primero, agregar la nueva columna si no existe
ALTER TABLE public.payroll_novedades 
ADD COLUMN IF NOT EXISTS periodo_real_id UUID;

-- Populate the new column with the correct period UUID
UPDATE public.payroll_novedades pn
SET periodo_real_id = pr.id
FROM public.payroll_periods_real pr
WHERE pr.company_id = pn.company_id
  AND pr.periodo = (
    SELECT DISTINCT p.periodo 
    FROM public.payrolls p 
    WHERE p.employee_id = pn.empleado_id 
      AND p.company_id = pn.company_id
    LIMIT 1
  );

-- Agregar foreign key constraint para la nueva columna 
ALTER TABLE public.payroll_novedades 
ADD CONSTRAINT fk_payroll_novedades_periodo_real
FOREIGN KEY (periodo_real_id) REFERENCES public.payroll_periods_real(id)
ON DELETE CASCADE;

-- Una vez que todos los datos estén migrados, podemos eliminar la antigua columna periodo_id
-- (comentado por seguridad, ejecutar manualmente después de verificar)
-- ALTER TABLE public.payroll_novedades DROP COLUMN periodo_id;
-- ALTER TABLE public.payroll_novedades RENAME COLUMN periodo_real_id TO periodo_id;
