-- ============================================================================
-- FIX: search_legal_knowledge RPC with consistent return types
-- ============================================================================
-- Problem: Multiple migrations created inconsistent function signatures
-- causing type errors (temporal_validity date vs jsonb, sources text[] vs jsonb)
-- Solution: Drop all variants and create single canonical version

-- Drop all existing variants of search_legal_knowledge
DROP FUNCTION IF EXISTS public.search_legal_knowledge(vector(1536), double precision, integer);
DROP FUNCTION IF EXISTS public.search_legal_knowledge(vector, double precision, integer);

-- Create canonical version matching legal_knowledge_base table schema
CREATE OR REPLACE FUNCTION public.search_legal_knowledge(
  query_embedding vector(1536),
  match_threshold double precision DEFAULT 0.30,
  match_count integer DEFAULT 8
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
    1 - (lkb.embedding <=> query_embedding) AS similarity
  FROM public.legal_knowledge_base lkb
  WHERE lkb.embedding IS NOT NULL
    AND 1 - (lkb.embedding <=> query_embedding) > match_threshold
  ORDER BY lkb.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Add helpful comment
COMMENT ON FUNCTION public.search_legal_knowledge IS 
  'Semantic search on legal_knowledge_base using vector similarity. 
   Returns documents above match_threshold (default 0.30) ordered by relevance.
   Lower threshold = more results but potentially less relevant.';

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.search_legal_knowledge TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_legal_knowledge TO service_role;