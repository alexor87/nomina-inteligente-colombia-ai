import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

export interface TeamInvitation {
  id: string;
  company_id: string;
  invited_email: string;
  invited_name: string;
  role: string;
  invited_by: string | null;
  token: string;
  status: 'pending' | 'accepted' | 'expired';
  expires_at: string;
  created_at: string;
}

export interface CreateInvitationParams {
  email: string;
  name: string;
  role: string;
}

export class TeamInvitationService {

  static async createInvitation(
    companyId: string,
    companyName: string,
    invitedBy: string,
    params: CreateInvitationParams
  ): Promise<{ token: string }> {
    const { data: invitation, error } = await supabase
      .from('team_invitations' as any)
      .insert({
        company_id: companyId,
        invited_email: params.email.toLowerCase().trim(),
        invited_name: params.name.trim(),
        role: params.role,
        invited_by: invitedBy,
      })
      .select('token')
      .single();

    if (error) {
      logger.error('Error creating invitation:', error);
      throw error;
    }

    const token = (invitation as any).token as string;
    const appUrl = import.meta.env.VITE_APP_URL || window.location.origin;
    const inviteUrl = `${appUrl}/join?token=${token}`;

    await supabase.auth.refreshSession();
    const { data: fnData, error: fnError } = await supabase.functions.invoke(
      'send-team-invitation-email',
      { body: { to: params.email, name: params.name, role: params.role, companyName, inviteUrl } }
    );
    if (fnError) throw new Error(`Error al enviar email: ${fnError.message}`);
    if (fnData && !fnData.success) throw new Error(fnData.error || 'Error enviando email de invitación');

    return { token };
  }

  static async getInvitationByToken(token: string): Promise<TeamInvitation | null> {
    const { data, error } = await supabase
      .from('team_invitations' as any)
      .select('*')
      .eq('token', token)
      .single();

    if (error) {
      logger.error('Error fetching invitation:', error);
      return null;
    }

    return data as TeamInvitation;
  }

  static async acceptInvitation(token: string): Promise<{ success: boolean; message: string }> {
    const { data, error } = await supabase.rpc('accept_team_invitation', { p_token: token });
    if (error) {
      logger.error('Error accepting invitation:', error);
      return { success: false, message: 'Error al aceptar la invitación' };
    }
    return data as { success: boolean; message: string };
  }

  static async getCompanyInvitations(companyId: string): Promise<TeamInvitation[]> {
    // Expire old pending invitations
    await supabase
      .from('team_invitations' as any)
      .update({ status: 'expired' })
      .eq('company_id', companyId)
      .eq('status', 'pending')
      .lt('expires_at', new Date().toISOString());

    const { data, error } = await supabase
      .from('team_invitations' as any)
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Error fetching company invitations:', error);
      return [];
    }

    return (data as TeamInvitation[]) || [];
  }

  static async deleteTeamMember(invitationId: string): Promise<{ success: boolean; message: string }> {
    const { data, error } = await supabase.rpc('delete_team_member', { p_invitation_id: invitationId });
    if (error) {
      logger.error('Error deleting team member:', error);
      return { success: false, message: 'Error al eliminar el usuario' };
    }
    return data as { success: boolean; message: string };
  }

  static async resendInvitation(invitationId: string, companyName: string): Promise<void> {
    const { data, error } = await supabase
      .from('team_invitations' as any)
      .select('*')
      .eq('id', invitationId)
      .single();

    if (error || !data) throw new Error('Invitación no encontrada');

    const invitation = data as TeamInvitation;
    const appUrl = import.meta.env.VITE_APP_URL || window.location.origin;
    const inviteUrl = `${appUrl}/join?token=${invitation.token}`;

    await supabase.auth.refreshSession();
    const { data: fnData, error: fnError } = await supabase.functions.invoke(
      'send-team-invitation-email',
      { body: { to: invitation.invited_email, name: invitation.invited_name, role: invitation.role, companyName, inviteUrl } }
    );
    if (fnError) throw new Error(`Error al enviar email: ${fnError.message}`);
    if (fnData && !fnData.success) throw new Error(fnData.error || 'Error reenviando email de invitación');
  }
}
