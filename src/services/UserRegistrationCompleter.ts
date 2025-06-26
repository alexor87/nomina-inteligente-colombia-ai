
import { supabase } from '@/integrations/supabase/client';
import { forceAssignAdminRole } from '@/utils/roleUtils';
import type { CompanyCreationData } from '@/types/registration-recovery';

export class UserRegistrationCompleter {
  static async completeUserRegistration(userId: string, companyData?: CompanyCreationData): Promise<boolean> {
    try {
      console.log('🔧 Completing registration for user:', userId);

      // Obtener datos del usuario
      const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(userId);
      if (userError || !user) {
        console.error('❌ User not found:', userError);
        return false;
      }

      let companyId: string | null = null;

      // Verificar si ya tiene perfil
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (existingProfile?.company_id) {
        companyId = existingProfile.company_id;
        console.log('✅ User already has company:', companyId);
      } else if (companyData) {
        // Crear empresa si se proporcionaron datos
        console.log('🏢 Creating company for user...');
        const { data: newCompanyId, error: companyError } = await supabase.rpc('create_company_with_setup', {
          p_nit: companyData.nit,
          p_razon_social: companyData.razon_social,
          p_email: companyData.email,
          p_first_name: companyData.first_name,
          p_last_name: companyData.last_name
        });

        if (companyError) {
          console.error('❌ Error creating company:', companyError);
          return false;
        }

        companyId = newCompanyId;
        console.log('✅ Company created:', companyId);
      }

      // Crear o actualizar perfil
      if (!existingProfile && companyId) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            user_id: userId,
            company_id: companyId,
            first_name: companyData?.first_name || user.user_metadata?.first_name || '',
            last_name: companyData?.last_name || user.user_metadata?.last_name || ''
          });

        if (profileError) {
          console.error('❌ Error creating profile:', profileError);
          return false;
        }
        console.log('✅ Profile created');
      } else if (existingProfile && companyId && !existingProfile.company_id) {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ company_id: companyId })
          .eq('user_id', userId);

        if (updateError) {
          console.error('❌ Error updating profile:', updateError);
          return false;
        }
        console.log('✅ Profile updated with company');
      }

      // Asegurar rol de administrador
      if (companyId) {
        const success = await forceAssignAdminRole(userId, companyId);
        if (!success) {
          console.error('❌ Error assigning admin role');
          return false;
        }
        console.log('✅ Admin role assigned');
      }

      console.log('🎉 Registration completed successfully for user:', userId);
      return true;
    } catch (error) {
      console.error('❌ Error completing registration:', error);
      return false;
    }
  }
}
