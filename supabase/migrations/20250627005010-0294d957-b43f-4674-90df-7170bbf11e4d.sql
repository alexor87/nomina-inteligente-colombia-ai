
-- Agregar campos faltantes a la tabla employees para soportar todos los campos del formulario
ALTER TABLE public.employees 
ADD COLUMN IF NOT EXISTS nivel_riesgo_arl TEXT CHECK (nivel_riesgo_arl IN ('I', 'II', 'III', 'IV', 'V')),
ADD COLUMN IF NOT EXISTS sexo TEXT CHECK (sexo IN ('M', 'F', 'O')),
ADD COLUMN IF NOT EXISTS fecha_nacimiento DATE,
ADD COLUMN IF NOT EXISTS direccion TEXT,
ADD COLUMN IF NOT EXISTS ciudad TEXT,
ADD COLUMN IF NOT EXISTS departamento TEXT,
ADD COLUMN IF NOT EXISTS periodicidad_pago TEXT DEFAULT 'mensual',
ADD COLUMN IF NOT EXISTS codigo_ciiu TEXT,
ADD COLUMN IF NOT EXISTS centro_costos TEXT,
ADD COLUMN IF NOT EXISTS fecha_firma_contrato DATE,
ADD COLUMN IF NOT EXISTS fecha_finalizacion_contrato DATE,
ADD COLUMN IF NOT EXISTS tipo_jornada TEXT DEFAULT 'completa',
ADD COLUMN IF NOT EXISTS dias_trabajo INTEGER DEFAULT 30,
ADD COLUMN IF NOT EXISTS horas_trabajo INTEGER DEFAULT 8,
ADD COLUMN IF NOT EXISTS beneficios_extralegales BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS clausulas_especiales TEXT,
ADD COLUMN IF NOT EXISTS forma_pago TEXT DEFAULT 'dispersion',
ADD COLUMN IF NOT EXISTS regimen_salud TEXT DEFAULT 'contributivo';

-- Crear índices para búsquedas más eficientes
CREATE INDEX IF NOT EXISTS idx_employees_nivel_riesgo_arl ON public.employees(nivel_riesgo_arl);
CREATE INDEX IF NOT EXISTS idx_employees_centro_costos ON public.employees(centro_costos);
CREATE INDEX IF NOT EXISTS idx_employees_ciudad ON public.employees(ciudad);
