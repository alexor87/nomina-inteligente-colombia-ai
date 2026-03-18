-- Create team_invitations table
CREATE TABLE IF NOT EXISTS public.team_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  invited_email TEXT NOT NULL,
  invited_name TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL,
  invited_by UUID REFERENCES public.profiles(user_id),
  token UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for token lookups (acceptance flow)
CREATE INDEX IF NOT EXISTS team_invitations_token_idx ON public.team_invitations(token);

-- Index for company queries
CREATE INDEX IF NOT EXISTS team_invitations_company_id_idx ON public.team_invitations(company_id);

-- Enable RLS
ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;

-- Admins of the company can view invitations for their company
CREATE POLICY "Company admins can view their invitations"
  ON public.team_invitations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND company_id = team_invitations.company_id
        AND role = 'administrador'
    )
  );

-- Admins of the company can create invitations
CREATE POLICY "Company admins can create invitations"
  ON public.team_invitations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND company_id = team_invitations.company_id
        AND role = 'administrador'
    )
  );

-- Allow reading invitation by token (for acceptance flow) — no auth required
CREATE POLICY "Anyone can read invitation by token"
  ON public.team_invitations FOR SELECT
  USING (true);

-- Allow updating status (for acceptance) — done via service role in Edge Function
-- or by the invited user themselves
CREATE POLICY "Invited user can accept invitation"
  ON public.team_invitations FOR UPDATE
  USING (invited_email = (SELECT email FROM auth.users WHERE id = auth.uid()))
  WITH CHECK (status = 'accepted');
