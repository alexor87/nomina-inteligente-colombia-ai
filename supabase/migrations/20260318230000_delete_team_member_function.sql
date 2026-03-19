-- RPC: delete a team member (removes invitation + user_roles entry)
-- Only company admins can call this function

CREATE OR REPLACE FUNCTION delete_team_member(p_invitation_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invitation team_invitations%ROWTYPE;
  v_caller_id uuid := auth.uid();
  v_member_id uuid;
BEGIN
  SELECT * INTO v_invitation FROM team_invitations WHERE id = p_invitation_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Invitación no encontrada');
  END IF;

  -- Verify caller is admin of the same company
  IF NOT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = v_caller_id
      AND company_id = v_invitation.company_id
      AND role = 'administrador'
  ) AND NOT public.is_superadmin(v_caller_id) THEN
    RETURN json_build_object('success', false, 'message', 'No tienes permisos para realizar esta acción');
  END IF;

  -- If invitation was accepted, also remove user_roles entry
  IF v_invitation.status = 'accepted' THEN
    SELECT id INTO v_member_id FROM auth.users WHERE email = v_invitation.invited_email;
    IF v_member_id IS NOT NULL THEN
      DELETE FROM user_roles
      WHERE user_id = v_member_id AND company_id = v_invitation.company_id;
    END IF;
  END IF;

  DELETE FROM team_invitations WHERE id = p_invitation_id;

  RETURN json_build_object('success', true, 'message', 'Usuario eliminado correctamente');

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'message', 'Error interno: ' || SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION delete_team_member(uuid) TO authenticated;
