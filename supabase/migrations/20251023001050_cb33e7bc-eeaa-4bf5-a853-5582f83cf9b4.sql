-- Fase 1: Limpiar documentos duplicados y forzar regeneración de embeddings

-- 1.1. Eliminar documento duplicado de Ley 2466 (más antiguo)
DELETE FROM legal_knowledge_base 
WHERE id = 'f7afb63c-36f2-48cf-bcbd-b919f38c6a2b';

-- 1.2. Eliminar entradas pendientes duplicadas de la cola
DELETE FROM embedding_queue 
WHERE document_id IN (
  'f7afb63c-36f2-48cf-bcbd-b919f38c6a2b',
  '4f71c780-5862-4968-9621-78841184235d'
);

-- 1.3. Forzar regeneración del embedding para el documento correcto de Ley 2466
UPDATE legal_knowledge_base 
SET embedding = NULL 
WHERE id = '4f71c780-5862-4968-9621-78841184235d';

-- El trigger enqueue_document_for_embedding lo agregará automáticamente a la cola

-- 1.4. Auditoría: Buscar y eliminar documentos con información vieja/incorrecta
-- (Artículo 161, 9pm, 240 horas, etc.)
DELETE FROM legal_knowledge_base
WHERE content ILIKE '%artículo 161%'
   OR content ILIKE '%articulo 161%'
   OR content ILIKE '%9:00 p.m.%'
   OR content ILIKE '%9pm%'
   OR content ILIKE '%21:00 horas%'
   OR content ILIKE '%240 horas al mes%';

-- 1.5. Verificación: Log de documentos que quedaron en la base
DO $$
DECLARE
  doc_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO doc_count FROM legal_knowledge_base;
  RAISE NOTICE 'Total documentos en legal_knowledge_base: %', doc_count;
  
  SELECT COUNT(*) INTO doc_count FROM legal_knowledge_base WHERE embedding IS NULL;
  RAISE NOTICE 'Documentos sin embedding: %', doc_count;
END $$;