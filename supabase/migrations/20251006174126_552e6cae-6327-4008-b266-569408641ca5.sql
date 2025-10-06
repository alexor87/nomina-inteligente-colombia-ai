-- Habilitar extensión pgvector para embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Crear tabla para base de conocimiento legal
CREATE TABLE IF NOT EXISTS public.legal_knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  document_type TEXT NOT NULL,
  reference TEXT,
  year INTEGER,
  topic TEXT,
  keywords TEXT[],
  embedding vector(1536),
  metadata JSONB DEFAULT '{}'::jsonb,
  source_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_legal_kb_type_topic ON public.legal_knowledge_base(document_type, topic);
CREATE INDEX idx_legal_kb_year ON public.legal_knowledge_base(year);
CREATE INDEX idx_legal_kb_keywords ON public.legal_knowledge_base USING GIN(keywords);
CREATE INDEX idx_legal_kb_embedding ON public.legal_knowledge_base USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Función de búsqueda semántica
CREATE OR REPLACE FUNCTION search_legal_knowledge(
  query_embedding vector(1536),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  content TEXT,
  document_type TEXT,
  reference TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    lkb.id,
    lkb.title,
    lkb.content,
    lkb.document_type,
    lkb.reference,
    1 - (lkb.embedding <=> query_embedding) AS similarity
  FROM public.legal_knowledge_base lkb
  WHERE 1 - (lkb.embedding <=> query_embedding) > match_threshold
  ORDER BY lkb.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

ALTER TABLE public.legal_knowledge_base ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read legal knowledge"
ON public.legal_knowledge_base FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage legal knowledge"
ON public.legal_knowledge_base FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'administrador'::app_role))
WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'administrador'::app_role));

-- Insertar conocimiento legal inicial
INSERT INTO public.legal_knowledge_base (title, content, document_type, reference, year, topic, keywords, metadata) VALUES
('Ley 2101 de 2021 - Reducción gradual jornada laboral',
'La Ley 2101 de 2021 establece la reducción gradual de la jornada laboral máxima en Colombia:
- Hasta junio 30 de 2023: 47 horas semanales
- Desde julio 1 de 2023 hasta junio 30 de 2024: 46 horas semanales
- Desde julio 1 de 2024 hasta junio 30 de 2025: 45 horas semanales
- Desde julio 1 de 2025 hasta junio 30 de 2026: 44 horas semanales
- Desde julio 1 de 2026 en adelante: 42 horas semanales

Esta reducción NO afecta el salario de los trabajadores, quienes continúan devengando el mismo salario pactado originalmente.

Aplicación para horas extra: Las horas trabajadas por encima de la jornada máxima legal vigente en cada período se consideran horas extras y deben pagarse con los recargos correspondientes (25% diurnas, 75% nocturnas, 100% dominicales/festivos).',
'ley', 'Ley 2101 de 2021', 2021, 'jornada_laboral',
ARRAY['jornada laboral', 'horas semanales', 'reducción', 'horas extras', 'recargos'],
'{"vigencia": "2021-07-15", "entidad_emisora": "Congreso de la República"}'::jsonb),

('SMLV 2025 y Auxilio de Transporte',
'Para el año 2025, los valores legales vigentes en Colombia son:
- Salario Mínimo Legal Mensual Vigente (SMLV): $1.423.500
- Auxilio de Transporte: $200.000

El auxilio de transporte aplica para trabajadores que devenguen hasta 2 SMLV ($2.847.000) y es un valor adicional al salario base que NO constituye salario para efectos de aportes a seguridad social ni prestaciones sociales.',
'decreto', 'Decreto 2613 de 2024', 2025, 'salarios',
ARRAY['salario mínimo', 'SMLV', 'auxilio de transporte', '2025'],
'{"vigencia": "2025-01-01"}'::jsonb),

('Aportes a Seguridad Social - Tasas 2025',
'Tasas de aportes a seguridad social vigentes para 2025:
SALUD: Empleado 4% + Empleador 8.5% = 12.5% total
PENSIÓN: Empleado 4% + Empleador 12% = 16% total + FSP para salarios > 4 SMLV (1%-2%)
ARL: 100% empleador - Nivel I: 0.348%, II: 0.435%, III: 0.783%, IV: 1.740%, V: 3.219%
PARAFISCALES: Caja 4%, ICBF 3%, SENA 2% (empleador)',
'concepto', 'Ministerio de Salud', 2025, 'seguridad_social',
ARRAY['aportes', 'salud', 'pensión', 'ARL', 'parafiscales'],
'{"vigencia": "2025-01-01"}'::jsonb),

('Prestaciones Sociales - Tasas de Cálculo',
'Tasas para prestaciones sociales en Colombia:
PRIMA: 8.33% mensual (pago semestral: junio 30 y diciembre 20)
CESANTÍAS: 8.33% mensual (consignación antes del 15 de febrero)
INTERESES SOBRE CESANTÍAS: 12% anual (pago antes del 31 de enero)
VACACIONES: 4.17% mensual (15 días hábiles por año)',
'concepto', 'Código Sustantivo del Trabajo', 2024, 'prestaciones_sociales',
ARRAY['prima', 'cesantías', 'vacaciones', 'intereses', 'prestaciones'],
'{"base_legal": "Artículos 249, 306, 186 CST"}'::jsonb);

CREATE OR REPLACE FUNCTION update_legal_kb_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_legal_kb_timestamp
BEFORE UPDATE ON public.legal_knowledge_base
FOR EACH ROW
EXECUTE FUNCTION update_legal_kb_updated_at();