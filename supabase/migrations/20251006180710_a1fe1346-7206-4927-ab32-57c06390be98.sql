-- Fase 1: Extender estructura de legal_knowledge_base
-- Añadir campos para RAG completo
-- Fecha: 2025-10-06

-- Añadir nuevos campos (todos nullable para compatibilidad)
ALTER TABLE public.legal_knowledge_base 
  ADD COLUMN IF NOT EXISTS summary TEXT,
  ADD COLUMN IF NOT EXISTS sources TEXT[],
  ADD COLUMN IF NOT EXISTS examples TEXT[],
  ADD COLUMN IF NOT EXISTS embedding_hint TEXT,
  ADD COLUMN IF NOT EXISTS note TEXT,
  ADD COLUMN IF NOT EXISTS temporal_validity DATE;

-- Crear índice para filtrado por vigencia temporal
CREATE INDEX IF NOT EXISTS idx_legal_kb_temporal_validity 
  ON public.legal_knowledge_base(temporal_validity DESC);

-- Añadir índice GIN para búsqueda en sources
CREATE INDEX IF NOT EXISTS idx_legal_kb_sources 
  ON public.legal_knowledge_base USING GIN(sources);

-- Añadir índice GIN para búsqueda en examples
CREATE INDEX IF NOT EXISTS idx_legal_kb_examples 
  ON public.legal_knowledge_base USING GIN(examples);

-- Comentarios en columnas para documentación
COMMENT ON COLUMN public.legal_knowledge_base.summary IS 
  'Resumen ejecutivo breve del documento legal';

COMMENT ON COLUMN public.legal_knowledge_base.sources IS 
  'Array de fuentes legales específicas (artículos, leyes, decretos)';

COMMENT ON COLUMN public.legal_knowledge_base.examples IS 
  'Array de casos de uso y ejemplos prácticos de aplicación';

COMMENT ON COLUMN public.legal_knowledge_base.embedding_hint IS 
  'Palabras clave y frases para optimizar generación de embeddings';

COMMENT ON COLUMN public.legal_knowledge_base.note IS 
  'Notas adicionales, advertencias o contexto especial';

COMMENT ON COLUMN public.legal_knowledge_base.temporal_validity IS 
  'Fecha de vigencia temporal para control de actualidad';

-- Crear o reemplazar función de búsqueda mejorada
CREATE OR REPLACE FUNCTION public.search_legal_knowledge(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5,
  filter_validity date DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  id uuid,
  title text,
  summary text,
  content text,
  document_type text,
  reference text,
  sources text[],
  examples text[],
  embedding_hint text,
  note text,
  year integer,
  topic text,
  keywords text[],
  source_url text,
  temporal_validity date,
  similarity float
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    lkb.id,
    lkb.title,
    lkb.summary,
    lkb.content,
    lkb.document_type,
    lkb.reference,
    lkb.sources,
    lkb.examples,
    lkb.embedding_hint,
    lkb.note,
    lkb.year,
    lkb.topic,
    lkb.keywords,
    lkb.source_url,
    lkb.temporal_validity,
    1 - (lkb.embedding <=> query_embedding) as similarity
  FROM public.legal_knowledge_base lkb
  WHERE 
    lkb.embedding IS NOT NULL
    AND (filter_validity IS NULL OR lkb.temporal_validity IS NULL OR lkb.temporal_validity >= filter_validity)
    AND 1 - (lkb.embedding <=> query_embedding) > match_threshold
  ORDER BY lkb.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;