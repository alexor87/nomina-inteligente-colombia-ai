-- Eliminar políticas RLS primero (antes de las funciones)
DROP POLICY IF EXISTS "Users can view messages from their conversations" ON public.maya_messages;
DROP POLICY IF EXISTS "Users can create messages in their conversations" ON public.maya_messages;
DROP POLICY IF EXISTS "Users can view their own conversations" ON public.maya_conversations;
DROP POLICY IF EXISTS "Users can create their own conversations" ON public.maya_conversations;
DROP POLICY IF EXISTS "Users can update their own conversations" ON public.maya_conversations;
DROP POLICY IF EXISTS "Users can delete their own conversations" ON public.maya_conversations;

-- Ahora eliminar triggers y funciones
DROP TRIGGER IF EXISTS update_conversation_on_new_message ON public.maya_messages;
DROP TRIGGER IF EXISTS update_maya_conversations_timestamp ON public.maya_conversations;
DROP FUNCTION IF EXISTS public.update_maya_conversation_timestamp();
DROP FUNCTION IF EXISTS public.update_updated_at_timestamp();
DROP FUNCTION IF EXISTS public.user_owns_maya_conversation(UUID);

-- Eliminar índices existentes
DROP INDEX IF EXISTS public.idx_maya_conversations_user_updated;
DROP INDEX IF EXISTS public.idx_maya_conversations_archived;
DROP INDEX IF EXISTS public.idx_maya_messages_conversation_created;

-- Crear tabla maya_conversations si no existe
CREATE TABLE IF NOT EXISTS public.maya_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT 'Nueva conversación',
    is_archived BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Crear tabla maya_messages si no existe
CREATE TABLE IF NOT EXISTS public.maya_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.maya_conversations(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_maya_conversations_user_updated ON public.maya_conversations(user_id, updated_at DESC);
CREATE INDEX idx_maya_conversations_archived ON public.maya_conversations(is_archived) WHERE is_archived = false;
CREATE INDEX idx_maya_messages_conversation_created ON public.maya_messages(conversation_id, created_at);

-- Habilitar RLS
ALTER TABLE public.maya_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maya_messages ENABLE ROW LEVEL SECURITY;

-- Función SECURITY DEFINER para verificar ownership sin recursión
CREATE FUNCTION public.user_owns_maya_conversation(p_conversation_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.maya_conversations 
    WHERE id = p_conversation_id 
    AND user_id = auth.uid()
  )
$$;

-- Políticas RLS para maya_conversations
CREATE POLICY "Users can view their own conversations"
ON public.maya_conversations FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own conversations"
ON public.maya_conversations FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own conversations"
ON public.maya_conversations FOR UPDATE TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own conversations"
ON public.maya_conversations FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- Políticas RLS para maya_messages
CREATE POLICY "Users can view messages from their conversations"
ON public.maya_messages FOR SELECT TO authenticated
USING (public.user_owns_maya_conversation(conversation_id));

CREATE POLICY "Users can create messages in their conversations"
ON public.maya_messages FOR INSERT TO authenticated
WITH CHECK (public.user_owns_maya_conversation(conversation_id));

-- Función y trigger para actualizar updated_at en conversaciones cuando se inserta mensaje
CREATE FUNCTION public.update_maya_conversation_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.maya_conversations
  SET updated_at = now()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_conversation_on_new_message
AFTER INSERT ON public.maya_messages
FOR EACH ROW
EXECUTE FUNCTION public.update_maya_conversation_timestamp();

-- Función y trigger para updated_at en maya_conversations
CREATE FUNCTION public.update_updated_at_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_maya_conversations_timestamp
BEFORE UPDATE ON public.maya_conversations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_timestamp();