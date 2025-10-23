-- ============================================================================
-- CORRECCIÓN DEFINITIVA: Función search_legal_knowledge con columnas correctas
-- ============================================================================

-- Eliminar versión anterior con columnas incorrectas
DROP FUNCTION IF EXISTS public.search_legal_knowledge(vector, double precision, integer);

-- Crear función con columnas que EXISTEN en la tabla legal_knowledge_base
CREATE OR REPLACE FUNCTION public.search_legal_knowledge(
  query_embedding vector(1536),
  match_threshold double precision DEFAULT 0.55,
  match_count integer DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  title text,
  content text,
  summary text,
  document_type text,
  reference text,
  topic text,
  keywords text[],
  sources text[],
  examples text[],
  metadata jsonb,
  temporal_validity date,
  note text,
  similarity double precision
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
    lkb.content,
    lkb.summary,
    lkb.document_type,
    lkb.reference,
    lkb.topic,
    lkb.keywords,
    lkb.sources,
    lkb.examples,
    lkb.metadata,
    lkb.temporal_validity,
    lkb.note,
    1 - (lkb.embedding <=> query_embedding) as similarity
  FROM public.legal_knowledge_base lkb
  WHERE lkb.embedding IS NOT NULL
    AND 1 - (lkb.embedding <=> query_embedding) > match_threshold
  ORDER BY lkb.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Agregar comentario descriptivo
COMMENT ON FUNCTION public.search_legal_knowledge IS 'Búsqueda semántica de documentos legales usando embeddings. Retorna documentos con todas las columnas disponibles (document_type, reference, topic, etc.)';
