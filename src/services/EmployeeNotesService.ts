import { supabase } from '@/integrations/supabase/client';
import { EmployeeNote, EmployeeNoteMention, UserNotification, CompanyUser, CreateEmployeeNoteRequest } from '@/types/employee-notes';

export class EmployeeNotesService {
  static async getEmployeeNotes(employeeId: string, periodId: string): Promise<EmployeeNote[]> {
    // First get the basic notes data
    const { data: notesData, error: notesError } = await supabase
      .from('employee_notes')
      .select('*')
      .eq('employee_id', employeeId)
      .eq('period_id', periodId)
      .order('created_at', { ascending: false });

    if (notesError) throw notesError;
    if (!notesData) return [];

    // Get employee data
    const { data: employeeData } = await supabase
      .from('employees')
      .select('nombre, apellido, cargo')
      .eq('id', employeeId)
      .single();

    // Get creator profiles for all notes
    const creatorIds = [...new Set(notesData.map(note => note.created_by).filter(Boolean))];
    const { data: creatorsData } = await supabase
      .from('profiles')
      .select('user_id, first_name, last_name')
      .in('user_id', creatorIds);

    // Get mentions for all notes
    const noteIds = notesData.map(note => note.id);
    const { data: mentionsData } = await supabase
      .from('employee_note_mentions')
      .select('*')
      .in('note_id', noteIds);

    // Get mentioned user profiles
    const mentionedUserIds = [...new Set((mentionsData || []).map(mention => mention.mentioned_user_id))];
    const { data: mentionedUsersData } = await supabase
      .from('profiles')
      .select('user_id, first_name, last_name')
      .in('user_id', mentionedUserIds);

    // Combine all data
    const result: EmployeeNote[] = notesData.map(note => ({
      ...note,
      employee: employeeData ? {
        nombre: employeeData.nombre,
        apellido: employeeData.apellido,
        cargo: employeeData.cargo
      } : undefined,
      creator: creatorsData?.find(creator => creator.user_id === note.created_by) || undefined,
      mentions: (mentionsData || [])
        .filter(mention => mention.note_id === note.id)
        .map(mention => ({
          ...mention,
          mentioned_user: mentionedUsersData?.find(user => user.user_id === mention.mentioned_user_id) || undefined
        }))
    }));

    return result;
  }

  static async createEmployeeNote(request: CreateEmployeeNoteRequest): Promise<EmployeeNote> {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;

    if (!userId) {
      throw new Error('Usuario no autenticado');
    }

    const { data: profileData } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('user_id', userId)
      .single();

    if (!profileData?.company_id) {
      throw new Error('No se pudo obtener la empresa del usuario');
    }

    // Create the note
    const { data: noteData, error: noteError } = await supabase
      .from('employee_notes')
      .insert({
        employee_id: request.employee_id,
        period_id: request.period_id,
        company_id: profileData.company_id,
        note_text: request.note_text,
        created_by: userId
      })
      .select('*')
      .single();

    if (noteError) throw noteError;

    // Get employee data
    const { data: employeeData } = await supabase
      .from('employees')
      .select('nombre, apellido, cargo')
      .eq('id', request.employee_id)
      .single();

    // Get creator profile
    const { data: creatorData } = await supabase
      .from('profiles')
      .select('first_name, last_name')
      .eq('user_id', userId)
      .single();

    // Create mentions if they exist
    if (request.mentioned_users.length > 0) {
      const mentionInserts = request.mentioned_users.map(userId => ({
        note_id: noteData.id,
        mentioned_user_id: userId
      }));

      const { error: mentionError } = await supabase
        .from('employee_note_mentions')
        .insert(mentionInserts);

      if (mentionError) throw mentionError;

      // Create notifications for mentioned users
      await this.createNotificationsForMentions(
        noteData.id,
        request.mentioned_users,
        profileData.company_id,
        employeeData?.nombre || '',
        employeeData?.apellido || ''
      );
    }

    // Return the complete note with related data
    return {
      ...noteData,
      employee: employeeData ? {
        nombre: employeeData.nombre,
        apellido: employeeData.apellido,
        cargo: employeeData.cargo
      } : undefined,
      creator: creatorData || undefined,
      mentions: []
    };
  }

  static async updateEmployeeNote(noteId: string, noteText: string): Promise<void> {
    const { error } = await supabase
      .from('employee_notes')
      .update({ note_text: noteText })
      .eq('id', noteId);

    if (error) throw error;
  }

  static async deleteEmployeeNote(noteId: string): Promise<void> {
    const { error } = await supabase
      .from('employee_notes')
      .delete()
      .eq('id', noteId);

    if (error) throw error;
  }

  static async markMentionAsSeen(mentionId: string): Promise<void> {
    const { error } = await supabase
      .from('employee_note_mentions')
      .update({ 
        seen: true,
        seen_at: new Date().toISOString()
      })
      .eq('id', mentionId);

    if (error) throw error;
  }

  static async getCompanyUsers(): Promise<CompanyUser[]> {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;

    if (!userId) return [];

    const { data: profileData } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('user_id', userId)
      .single();

    if (!profileData?.company_id) return [];

    const { data, error } = await supabase
      .from('profiles')
      .select('user_id, first_name, last_name')
      .eq('company_id', profileData.company_id);

    if (error) throw error;

    return (data || []).map(user => ({
      ...user,
      display_name: `${user.first_name} ${user.last_name}`.trim() || 'Usuario sin nombre'
    }));
  }

  static async getUserNotifications(): Promise<UserNotification[]> {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;

    if (!userId) return [];

    const { data, error } = await supabase
      .from('user_notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    return data || [];
  }

  static async markNotificationAsRead(notificationId: string): Promise<void> {
    const { error } = await supabase
      .from('user_notifications')
      .update({ read: true })
      .eq('id', notificationId);

    if (error) throw error;
  }

  static async getUnreadNotificationCount(): Promise<number> {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;

    if (!userId) return 0;

    const { count, error } = await supabase
      .from('user_notifications')
      .select('id', { count: 'exact' })
      .eq('user_id', userId)
      .eq('read', false);

    if (error) throw error;
    return count || 0;
  }

  private static async createNotificationsForMentions(
    noteId: string,
    mentionedUserIds: string[],
    companyId: string,
    employeeName: string,
    employeeLastName: string
  ): Promise<void> {
    const notifications = mentionedUserIds.map(userId => ({
      user_id: userId,
      company_id: companyId,
      type: 'note_mention',
      title: 'Te mencionaron en una nota',
      message: `Te mencionaron en una nota del empleado ${employeeName} ${employeeLastName}`,
      reference_id: noteId
    }));

    const { error } = await supabase
      .from('user_notifications')
      .insert(notifications);

    if (error) throw error;
  }
}
