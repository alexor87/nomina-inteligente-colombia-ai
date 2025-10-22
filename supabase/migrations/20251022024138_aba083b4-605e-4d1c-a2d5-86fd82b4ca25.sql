-- Drop existing function if it exists
DROP FUNCTION IF EXISTS public.search_legal_knowledge(vector, double precision, integer);

-- Función para búsqueda semántica con pgvector
CREATE OR REPLACE FUNCTION public.search_legal_knowledge(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.68,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  title text,
  content text,
  document_type text,
  year integer,
  reference text,
  topic text,
  similarity float
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    lkb.id,
    lkb.title,
    lkb.content,
    lkb.document_type,
    lkb.year,
    lkb.reference,
    lkb.topic,
    1 - (lkb.embedding <=> query_embedding) AS similarity
  FROM legal_knowledge_base lkb
  WHERE 
    lkb.embedding IS NOT NULL
    AND 1 - (lkb.embedding <=> query_embedding) > match_threshold
  ORDER BY lkb.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;