-- Ajustar umbral de búsqueda RAG para mejorar recall
-- Reduce el match_threshold default de 0.55 a 0.30 para encontrar más documentos relevantes

-- Drop the existing function first
DROP FUNCTION IF EXISTS search_legal_knowledge(vector, double precision, integer);

-- Recreate the function with the new defaults
CREATE OR REPLACE FUNCTION search_legal_knowledge(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.30,
  match_count int DEFAULT 8
)
RETURNS TABLE (
  id uuid,
  title text,
  reference text,
  topic text,
  document_type text,
  temporal_validity jsonb,
  content text,
  summary text,
  keywords text[],
  sources jsonb,
  examples jsonb,
  note text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    lkb.id,
    lkb.title,
    lkb.reference,
    lkb.topic,
    lkb.document_type,
    lkb.temporal_validity,
    lkb.content,
    lkb.summary,
    lkb.keywords,
    lkb.sources,
    lkb.examples,
    lkb.note,
    1 - (lkb.embedding <=> query_embedding) AS similarity
  FROM legal_knowledge_base lkb
  WHERE 1 - (lkb.embedding <=> query_embedding) > match_threshold
  ORDER BY lkb.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;