
import { supabase } from '@/integrations/supabase/client';
import type { IncompleteRegistration } from '@/types/registration-recovery';

export class IncompleteRegistrationDetector {
  static async findIncompleteRegistrations(): Promise<IncompleteRegistration[]> {
    try {
      console.log('🔍 Searching for incomplete registrations...');
      
      // Obtener todos los usuarios autenticados
      const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();
      
      if (usersError) {
        console.error('❌ Error fetching users:', usersError);
        return [];
      }

      const incompleteRegistrations: IncompleteRegistration[] = [];

      for (const user of users) {
        // Verificar perfil
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();

        // Verificar roles
        const { data: roles } = await supabase
          .from('user_roles')
          .select('*')
          .eq('user_id', user.id);

        const hasProfile = !!profile;
        const hasCompany = !!(profile?.company_id);
        const hasRoles = !!(roles && roles.length > 0);

        // Si falta algún componente, es un registro incompleto
        if (!hasProfile || !hasCompany || !hasRoles) {
          incompleteRegistrations.push({
            user_id: user.id,
            email: user.email || 'No email',
            has_profile: hasProfile,
            has_company: hasCompany,
            has_roles: hasRoles,
            company_id: profile?.company_id
          });
        }
      }

      console.log('📊 Found incomplete registrations:', incompleteRegistrations);
      return incompleteRegistrations;
    } catch (error) {
      console.error('❌ Error finding incomplete registrations:', error);
      return [];
    }
  }
}
