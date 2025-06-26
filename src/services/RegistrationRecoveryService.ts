
import { supabase } from '@/integrations/supabase/client';
import { forceAssignAdminRole } from '@/utils/roleUtils';

export interface IncompleteRegistration {
  user_id: string;
  email: string;
  has_profile: boolean;
  has_company: boolean;
  has_roles: boolean;
  company_id?: string;
}

export class RegistrationRecoveryService {
  // Detectar usuarios con registros incompletos
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

  // Completar un registro específico
  static async completeUserRegistration(userId: string, companyData?: {
    nit: string;
    razon_social: string;
    email: string;
    first_name: string;
    last_name: string;
  }): Promise<boolean> {
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

  // Completar registro de Yohanna específicamente
  static async completeYohannaRegistration(): Promise<boolean> {
    try {
      console.log('🔧 Completing Yohanna\'s registration...');
      
      // Buscar usuario de Yohanna
      const { data: { users }, error } = await supabase.auth.admin.listUsers();
      if (error) {
        console.error('❌ Error fetching users:', error);
        return false;
      }

      const yohannaUser = users.find(u => u.email === 'yohanna.munozes@gmail.com');
      if (!yohannaUser) {
        console.error('❌ Yohanna user not found');
        return false;
      }

      // Datos de empresa para Yohanna (usando datos de ejemplo)
      const companyData = {
        nit: '900123456-1',
        razon_social: 'Empresa de Yohanna S.A.S',
        email: 'yohanna.munozes@gmail.com',
        first_name: 'Yohanna',
        last_name: 'Muñoz'
      };

      return await this.completeUserRegistration(yohannaUser.id, companyData);
    } catch (error) {
      console.error('❌ Error completing Yohanna\'s registration:', error);
      return false;
    }
  }

  // Ejecutar recuperación automática para todos los registros incompletos
  static async runAutoRecovery(): Promise<{
    total: number;
    completed: number;
    failed: number;
    results: Array<{
      email: string;
      success: boolean;
      error?: string;
    }>;
  }> {
    try {
      console.log('🚀 Starting auto-recovery process...');
      
      const incompleteRegistrations = await this.findIncompleteRegistrations();
      const results = [];
      let completed = 0;
      let failed = 0;

      for (const registration of incompleteRegistrations) {
        try {
          let success = false;

          // Para Yohanna, usar datos específicos
          if (registration.email === 'yohanna.munozes@gmail.com') {
            success = await this.completeYohannaRegistration();
          } else {
            // Para otros usuarios, solo completar si ya tienen empresa
            if (registration.company_id) {
              success = await this.completeUserRegistration(registration.user_id);
            }
          }

          if (success) {
            completed++;
            results.push({ email: registration.email, success: true });
          } else {
            failed++;
            results.push({ 
              email: registration.email, 
              success: false, 
              error: 'Recovery failed' 
            });
          }
        } catch (error) {
          failed++;
          results.push({ 
            email: registration.email, 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error' 
          });
        }
      }

      console.log('📊 Auto-recovery completed:', { total: incompleteRegistrations.length, completed, failed });
      return {
        total: incompleteRegistrations.length,
        completed,
        failed,
        results
      };
    } catch (error) {
      console.error('❌ Error in auto-recovery:', error);
      return { total: 0, completed: 0, failed: 0, results: [] };
    }
  }
}
