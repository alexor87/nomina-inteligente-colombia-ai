-- Fix: robust accept_team_invitation
-- 1. Creates profile if missing (trigger may be absent in some envs)
-- 2. Explicit cast role::app_role to avoid type ambiguity
-- 3. EXCEPTION block converts any unhandled error to { success: false } instead of HTTP 400
-- 4. Null guard for unauthenticated calls

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
  v_first_name text;
  v_last_name text;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'No autenticado');
  END IF;

  SELECT email,
         raw_user_meta_data->>'first_name',
         raw_user_meta_data->>'last_name'
  INTO v_user_email, v_first_name, v_last_name
  FROM auth.users WHERE id = v_user_id;

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

  -- Create profile if trigger didn't run (e.g. trigger missing in some environments)
  INSERT INTO profiles (user_id, first_name, last_name)
  VALUES (v_user_id, v_first_name, v_last_name)
  ON CONFLICT (user_id) DO NOTHING;

  UPDATE team_invitations SET status = 'accepted' WHERE token = p_token;

  INSERT INTO user_roles (user_id, company_id, role, assigned_by)
  VALUES (v_user_id, v_invitation.company_id, v_invitation.role::app_role, COALESCE(v_invitation.invited_by, v_user_id))
  ON CONFLICT (user_id, role, company_id) DO NOTHING;

  UPDATE profiles SET company_id = v_invitation.company_id WHERE user_id = v_user_id;

  RETURN json_build_object('success', true, 'message', '¡Bienvenido al equipo!');

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'message', 'Error interno: ' || SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION accept_team_invitation(uuid) TO authenticated;
