-- Fix: ON CONFLICT clause must match exact unique constraint
-- user_roles has UNIQUE(user_id, role, company_id), not UNIQUE(user_id, company_id)
-- The previous version caused a PostgreSQL error for all invited users on INSERT.

CREATE OR REPLACE FUNCTION accept_team_invitation(p_token uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invitation team_invitations%ROWTYPE;
  v_user_id uuid := auth.uid();
  v_user_email text;
BEGIN
  SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;
  SELECT * INTO v_invitation FROM team_invitations WHERE token = p_token;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Invitación no encontrada');
  END IF;
  IF v_invitation.status != 'pending' THEN
    RETURN json_build_object('success', false, 'message', 'Esta invitación ya fue usada o expiró');
  END IF;
  IF v_invitation.expires_at < NOW() THEN
    RETURN json_build_object('success', false, 'message', 'Esta invitación ha expirado');
  END IF;
  IF v_invitation.invited_email != lower(v_user_email) THEN
    RETURN json_build_object('success', false, 'message', 'Esta invitación no corresponde a tu email');
  END IF;

  UPDATE team_invitations SET status = 'accepted' WHERE token = p_token;

  INSERT INTO user_roles (user_id, company_id, role, assigned_by)
  VALUES (v_user_id, v_invitation.company_id, v_invitation.role, COALESCE(v_invitation.invited_by, v_user_id))
  ON CONFLICT (user_id, role, company_id) DO NOTHING;

  UPDATE profiles SET company_id = v_invitation.company_id WHERE user_id = v_user_id;

  RETURN json_build_object('success', true, 'message', '¡Bienvenido al equipo!');
END;
$$;

GRANT EXECUTE ON FUNCTION accept_team_invitation(uuid) TO authenticated;
