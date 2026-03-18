
-- Habilitar RLS en las tablas de tipos y subtipos de cotizante
ALTER TABLE public.tipos_cotizante ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subtipos_cotizante ENABLE ROW LEVEL SECURITY;

-- Crear políticas de lectura para usuarios autenticados en tipos de cotizante
CREATE POLICY "Allow read access to tipos_cotizante" ON public.tipos_cotizante 
FOR SELECT USING (auth.uid() IS NOT NULL);

-- Crear políticas de lectura para usuarios autenticados en subtipos de cotizante
CREATE POLICY "Allow read access to subtipos_cotizante" ON public.subtipos_cotizante 
FOR SELECT USING (auth.uid() IS NOT NULL);
