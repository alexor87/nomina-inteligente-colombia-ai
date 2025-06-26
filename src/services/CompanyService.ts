
import { supabase } from '@/integrations/supabase/client';
import { forceAssignAdminRole, performCompleteRoleCheck } from '@/utils/roleUtils';

export interface Company {
  id: string;
  nit: string;
  razon_social: string;
  email: string;
  telefono?: string;
  direccion?: string;
  ciudad?: string;
  estado: 'activa' | 'suspendida' | 'inactiva';
  plan: 'basico' | 'profesional' | 'empresarial';
  created_at: string;
  updated_at: string;
}

export interface CompanyRegistrationData {
  nit: string;
  razon_social: string;
  email: string;
  telefono?: string;
  ciudad?: string;
  plan: 'basico' | 'profesional' | 'empresarial';
}

export interface CompanyRegistrationWithUser extends CompanyRegistrationData {
  user_email: string;
  user_password: string;
  first_name: string;
  last_name: string;
}

export class CompanyService {
  // Crear nueva empresa con usuario (para registro completo)
  static async createCompanyWithUser(data: CompanyRegistrationWithUser): Promise<string> {
    try {
      console.log('🚀 Starting complete company registration process...');
      
      // Primero registrar el usuario
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: data.user_email,
        password: data.user_password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            first_name: data.first_name,
            last_name: data.last_name
          }
        }
      });

      if (signUpError) {
        console.error('❌ Sign up error:', signUpError);
        throw new Error(`Error al registrar usuario: ${signUpError.message}`);
      }
      
      if (!authData.user) {
        throw new Error('Error al crear usuario - no se recibió información del usuario');
      }

      console.log('✅ User registered successfully:', authData.user.id);

      // Verificar si necesitamos confirmar email
      if (!authData.session) {
        console.log('📧 Email confirmation required, proceeding with user creation...');
        
        // Intentar iniciar sesión para obtener sesión
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: data.user_email,
          password: data.user_password
        });

        if (signInError && !signInError.message.includes('Email not confirmed')) {
          console.error('❌ Sign in error:', signInError);
          throw new Error(`Error al iniciar sesión: ${signInError.message}`);
        }

        if (signInData.session) {
          console.log('✅ Session obtained after sign in');
        }
      }

      // Crear la empresa usando la función RPC
      console.log('🏢 Creating company...');
      const { data: companyId, error: companyError } = await supabase.rpc('create_company_with_setup', {
        p_nit: data.nit,
        p_razon_social: data.razon_social,
        p_email: data.email,
        p_telefono: data.telefono,
        p_ciudad: data.ciudad || 'Bogotá',
        p_plan: data.plan,
        p_first_name: data.first_name,
        p_last_name: data.last_name
      });

      if (companyError) {
        console.error('❌ Company creation error:', companyError);
        throw new Error(`Error al crear la empresa: ${companyError.message}`);
      }

      console.log('✅ Company created successfully:', companyId);
      
      // Esperar un momento para que se procesen los triggers
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Verificar y crear perfil manualmente si es necesario
      console.log('👤 Ensuring user profile exists...');
      const { data: existingProfile, error: profileCheckError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', authData.user.id)
        .single();

      if (profileCheckError && profileCheckError.code === 'PGRST116') {
        // Perfil no existe, crearlo
        console.log('🔧 Creating user profile manually...');
        const { error: createProfileError } = await supabase
          .from('profiles')
          .insert({
            user_id: authData.user.id,
            first_name: data.first_name,
            last_name: data.last_name,
            company_id: companyId
          });
        
        if (createProfileError) {
          console.error('❌ Profile creation error:', createProfileError);
          // No fallar aquí, intentar continuar
        } else {
          console.log('✅ Profile created successfully');
        }
      } else if (existingProfile && !existingProfile.company_id) {
        // Perfil existe pero sin empresa, actualizarlo
        console.log('🔧 Updating existing profile with company...');
        const { error: updateProfileError } = await supabase
          .from('profiles')
          .update({ company_id: companyId })
          .eq('user_id', authData.user.id);
        
        if (updateProfileError) {
          console.error('❌ Profile update error:', updateProfileError);
        } else {
          console.log('✅ Profile updated successfully');
        }
      }

      // Verificar y crear rol de administrador manualmente
      console.log('👥 Ensuring admin role exists...');
      const { data: existingRole, error: roleCheckError } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', authData.user.id)
        .eq('company_id', companyId)
        .eq('role', 'administrador')
        .single();

      if (roleCheckError && roleCheckError.code === 'PGRST116') {
        // Rol no existe, crearlo
        console.log('🔧 Creating admin role manually...');
        const { error: createRoleError } = await supabase
          .from('user_roles')
          .insert({
            user_id: authData.user.id,
            role: 'administrador',
            company_id: companyId,
            assigned_by: authData.user.id
          });
        
        if (createRoleError) {
          console.error('❌ Role creation error:', createRoleError);
          // Intentar una vez más con función de utilidad
          await forceAssignAdminRole(authData.user.id, companyId);
        } else {
          console.log('✅ Admin role created successfully');
        }
      }

      // Verificación final
      console.log('🔍 Performing final verification...');
      const { data: finalProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', authData.user.id)
        .single();

      const { data: finalRole } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', authData.user.id)
        .eq('company_id', companyId)
        .single();

      console.log('📊 Final verification results:', {
        profile: finalProfile,
        role: finalRole,
        companyId
      });

      return companyId;
    } catch (error) {
      console.error('❌ Complete error in company creation process:', error);
      throw new Error(error instanceof Error ? error.message : 'Error al crear la empresa');
    }
  }

  // Crear nueva empresa (para registro)
  static async createCompany(data: CompanyRegistrationData): Promise<string> {
    try {
      const { data: result, error } = await supabase.rpc('create_company_with_setup', {
        p_nit: data.nit,
        p_razon_social: data.razon_social,
        p_email: data.email,
        p_telefono: data.telefono,
        p_ciudad: data.ciudad || 'Bogotá',
        p_plan: data.plan
      });

      if (error) throw error;

      return result;
    } catch (error) {
      console.error('Error creating company:', error);
      throw new Error('Error al crear la empresa');
    }
  }

  // Verificar si el usuario es súper admin
  static async isSaasAdmin(): Promise<boolean> {
    // En el nuevo sistema simplificado, no hay superadmin
    // Se puede verificar si el usuario tiene rol de soporte en alguna empresa
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { data, error } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', user.id)
        .eq('role', 'soporte')
        .limit(1);

      if (error) {
        console.error('Error checking support role:', error);
        return false;
      }

      return data && data.length > 0;
    } catch (error) {
      console.error('Error checking admin status:', error);
      return false;
    }
  }

  // Listar todas las empresas (solo para usuarios con rol de soporte)
  static async getAllCompanies(): Promise<Company[]> {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Cast the data to our Company interface
      return (data || []).map(company => ({
        id: company.id,
        nit: company.nit,
        razon_social: company.razon_social,
        email: company.email,
        telefono: company.telefono,
        direccion: company.direccion,
        ciudad: company.ciudad,
        estado: company.estado as 'activa' | 'suspendida' | 'inactiva',
        plan: company.plan as 'basico' | 'profesional' | 'empresarial',
        created_at: company.created_at,
        updated_at: company.updated_at
      }));
    } catch (error) {
      console.error('Error loading companies:', error);
      return [];
    }
  }

  // Obtener empresa actual del usuario
  static async getCurrentCompany(): Promise<Company | null> {
    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (profileError || !profile?.company_id) return null;

      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('id', profile.company_id)
        .single();

      if (error) throw error;

      // Cast the data to our Company interface
      return {
        id: data.id,
        nit: data.nit,
        razon_social: data.razon_social,
        email: data.email,
        telefono: data.telefono,
        direccion: data.direccion,
        ciudad: data.ciudad,
        estado: data.estado as 'activa' | 'suspendida' | 'inactiva',
        plan: data.plan as 'basico' | 'profesional' | 'empresarial',
        created_at: data.created_at,
        updated_at: data.updated_at
      };
    } catch (error) {
      console.error('Error loading current company:', error);
      return null;
    }
  }

  // Actualizar empresa
  static async updateCompany(companyId: string, updates: Partial<Company>): Promise<void> {
    try {
      const { error } = await supabase
        .from('companies')
        .update(updates)
        .eq('id', companyId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating company:', error);
      throw new Error('Error al actualizar la empresa');
    }
  }

  // Suspender empresa (solo usuarios con rol de soporte)
  static async suspendCompany(companyId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('companies')
        .update({ estado: 'suspendida' })
        .eq('id', companyId);

      if (error) throw error;
    } catch (error) {
      console.error('Error suspending company:', error);
      throw new Error('Error al suspender la empresa');
    }
  }

  // Activar empresa (solo usuarios con rol de soporte)
  static async activateCompany(companyId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('companies')
        .update({ estado: 'activa' })
        .eq('id', companyId);

      if (error) throw error;
    } catch (error) {
      console.error('Error activating company:', error);
      throw new Error('Error al activar la empresa');
    }
  }
}
