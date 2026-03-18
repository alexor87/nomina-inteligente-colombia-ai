-- Fix: Grant missing table-level permissions on team_invitations
-- INSERT was failing silently with 42501 "permission denied for table team_invitations"
-- causing the invitation row to never be created and the email to never be sent.
-- anon needs SELECT to allow reading invitations by token (accept link works without auth).

GRANT SELECT, INSERT, UPDATE ON public.team_invitations TO authenticated;
GRANT SELECT ON public.team_invitations TO anon;
