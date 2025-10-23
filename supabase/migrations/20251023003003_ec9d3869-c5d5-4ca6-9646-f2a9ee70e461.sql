-- ============================================================================
-- FIX: Eliminar todas las versiones de search_legal_knowledge y crear una única
-- ============================================================================

-- Drop all possible variants of the function
DROP FUNCTION IF EXISTS public.search_legal_knowledge(text, int, float);
DROP FUNCTION IF EXISTS public.search_legal_knowledge(text, float, int);
DROP FUNCTION IF EXISTS public.search_legal_knowledge(vector, int, float);
DROP FUNCTION IF EXISTS public.search_legal_knowledge(vector, float, int);
DROP FUNCTION IF EXISTS public.search_legal_knowledge(text, integer, double precision);
DROP FUNCTION IF EXISTS public.search_legal_knowledge(text, double precision, integer);

-- Create a single, consistent version with ALL fields
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
  category text,
  keywords text[],
  sources text[],
  examples text[],
  metadata jsonb,
  temporal_validity jsonb,
  similarity double precision
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
    lkb.summary,
    lkb.category,
    lkb.keywords,
    lkb.sources,
    lkb.examples,
    lkb.metadata,
    lkb.temporal_validity,
    1 - (lkb.embedding <=> query_embedding) AS similarity
  FROM public.legal_knowledge_base lkb
  WHERE lkb.embedding IS NOT NULL
    AND (1 - (lkb.embedding <=> query_embedding)) > match_threshold
  ORDER BY lkb.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;