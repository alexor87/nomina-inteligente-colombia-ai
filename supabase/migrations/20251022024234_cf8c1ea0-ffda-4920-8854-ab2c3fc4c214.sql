-- Tabla de cola para procesar embeddings
CREATE TABLE IF NOT EXISTS public.embedding_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES legal_knowledge_base(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  priority integer DEFAULT 0,
  retry_count integer DEFAULT 0,
  max_retries integer DEFAULT 3,
  error_message text,
  created_at timestamptz DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_embedding_queue_status ON embedding_queue(status);
CREATE INDEX idx_embedding_queue_priority ON embedding_queue(priority DESC, created_at ASC);
CREATE INDEX idx_embedding_queue_document_id ON embedding_queue(document_id);

-- RLS
ALTER TABLE public.embedding_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "System can manage embedding queue"
ON public.embedding_queue
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Trigger: Encolar automáticamente documentos sin embedding
CREATE OR REPLACE FUNCTION public.enqueue_document_for_embedding()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Si el documento no tiene embedding, agregarlo a la cola
  IF NEW.embedding IS NULL THEN
    INSERT INTO embedding_queue (document_id, priority, status)
    VALUES (NEW.id, 10, 'pending')
    ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_enqueue_new_documents
AFTER INSERT ON legal_knowledge_base
FOR EACH ROW
EXECUTE FUNCTION enqueue_document_for_embedding();

-- Trigger: Re-encolar si se borra el embedding
CREATE OR REPLACE FUNCTION public.reenqueue_on_embedding_deletion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.embedding IS NOT NULL AND NEW.embedding IS NULL THEN
    INSERT INTO embedding_queue (document_id, priority, status)
    VALUES (NEW.id, 5, 'pending')
    ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_reenqueue_deleted_embeddings
AFTER UPDATE ON legal_knowledge_base
FOR EACH ROW
WHEN (OLD.embedding IS DISTINCT FROM NEW.embedding)
EXECUTE FUNCTION reenqueue_on_embedding_deletion();

-- Encolar documentos existentes sin embeddings
INSERT INTO embedding_queue (document_id, priority, status)
SELECT id, 10, 'pending'
FROM legal_knowledge_base
WHERE embedding IS NULL
ON CONFLICT DO NOTHING;