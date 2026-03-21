-- Maya User Preferences: long-term memory per user+company
CREATE TABLE IF NOT EXISTS public.maya_user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  preference_key TEXT NOT NULL,
  preference_value JSONB NOT NULL DEFAULT '{}'::jsonb,
  source TEXT NOT NULL DEFAULT 'inferred' CHECK (source IN ('inferred', 'explicit')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, company_id, preference_key)
);

ALTER TABLE public.maya_user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_preferences"
  ON public.maya_user_preferences
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_maya_prefs_user_company
  ON public.maya_user_preferences(user_id, company_id);
