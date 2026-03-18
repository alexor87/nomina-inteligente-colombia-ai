
-- Crear tabla principal de notas de empleados
CREATE TABLE public.employee_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
  period_id uuid REFERENCES public.payroll_periods_real(id) ON DELETE CASCADE NOT NULL,
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  note_text text NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Crear tabla para menciones de usuarios en notas
CREATE TABLE public.employee_note_mentions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id uuid REFERENCES public.employee_notes(id) ON DELETE CASCADE NOT NULL,
  mentioned_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  seen boolean DEFAULT false NOT NULL,
  seen_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  UNIQUE(note_id, mentioned_user_id)
);

-- Crear tabla para notificaciones de usuarios
CREATE TABLE public.user_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  reference_id uuid,
  read boolean DEFAULT false NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Habilitar RLS en las nuevas tablas
ALTER TABLE public.employee_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_note_mentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para employee_notes
CREATE POLICY "Users can view company employee notes" 
  ON public.employee_notes 
  FOR SELECT 
  USING (
    company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can create company employee notes" 
  ON public.employee_notes 
  FOR INSERT 
  WITH CHECK (
    company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    AND created_by = auth.uid()
  );

CREATE POLICY "Users can update their own employee notes" 
  ON public.employee_notes 
  FOR UPDATE 
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can delete their own employee notes" 
  ON public.employee_notes 
  FOR DELETE 
  USING (created_by = auth.uid());

-- Políticas RLS para employee_note_mentions
CREATE POLICY "Users can view company note mentions" 
  ON public.employee_note_mentions 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.employee_notes en 
      WHERE en.id = note_id 
      AND en.company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Users can create note mentions" 
  ON public.employee_note_mentions 
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.employee_notes en 
      WHERE en.id = note_id 
      AND en.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can update their own mentions" 
  ON public.employee_note_mentions 
  FOR UPDATE 
  USING (mentioned_user_id = auth.uid())
  WITH CHECK (mentioned_user_id = auth.uid());

-- Políticas RLS para user_notifications
CREATE POLICY "Users can view their own notifications" 
  ON public.user_notifications 
  FOR SELECT 
  USING (user_id = auth.uid());

CREATE POLICY "Users can create notifications for their company" 
  ON public.user_notifications 
  FOR INSERT 
  WITH CHECK (
    company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update their own notifications" 
  ON public.user_notifications 
  FOR UPDATE 
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Crear índices para mejorar rendimiento
CREATE INDEX idx_employee_notes_employee_id ON public.employee_notes(employee_id);
CREATE INDEX idx_employee_notes_period_id ON public.employee_notes(period_id);
CREATE INDEX idx_employee_notes_company_id ON public.employee_notes(company_id);
CREATE INDEX idx_employee_notes_created_by ON public.employee_notes(created_by);

CREATE INDEX idx_employee_note_mentions_note_id ON public.employee_note_mentions(note_id);
CREATE INDEX idx_employee_note_mentions_mentioned_user_id ON public.employee_note_mentions(mentioned_user_id);
CREATE INDEX idx_employee_note_mentions_seen ON public.employee_note_mentions(seen);

CREATE INDEX idx_user_notifications_user_id ON public.user_notifications(user_id);
CREATE INDEX idx_user_notifications_company_id ON public.user_notifications(company_id);
CREATE INDEX idx_user_notifications_read ON public.user_notifications(read);
CREATE INDEX idx_user_notifications_type ON public.user_notifications(type);

-- Crear trigger para actualizar updated_at en employee_notes
CREATE TRIGGER update_employee_notes_updated_at
  BEFORE UPDATE ON public.employee_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
