-- Fase 1: Actualizar función RPC search_legal_knowledge para retornar todos los campos relevantes

-- Drop existing function
DROP FUNCTION IF EXISTS search_legal_knowledge(vector(1536), integer, double precision);

-- Create improved function with all fields
CREATE OR REPLACE FUNCTION search_legal_knowledge(
  query_embedding vector(1536),
  match_count integer DEFAULT 5,
  match_threshold double precision DEFAULT 0.55
)
RETURNS TABLE (
  id uuid,
  title text,
  content text,
  summary text,
  sources jsonb,
  examples jsonb,
  keywords text[],
  metadata jsonb,
  temporal_validity jsonb,
  category text,
  subcategory text,
  priority integer,
  similarity double precision
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    lkb.id,
    lkb.title,
    lkb.content,
    lkb.summary,
    lkb.sources,
    lkb.examples,
    lkb.keywords,
    lkb.metadata,
    lkb.temporal_validity,
    lkb.category,
    lkb.subcategory,
    lkb.priority,
    (1 - (lkb.embedding <=> query_embedding)) AS similarity
  FROM legal_knowledge_base lkb
  WHERE lkb.embedding IS NOT NULL
    AND (1 - (lkb.embedding <=> query_embedding)) >= match_threshold
  ORDER BY lkb.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION search_legal_knowledge(vector(1536), integer, double precision) TO authenticated;
GRANT EXECUTE ON FUNCTION search_legal_knowledge(vector(1536), integer, double precision) TO service_role;