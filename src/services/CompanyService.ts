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
  // Verificar integridad del registro de empresa
  static async verifyCompanyRegistrationIntegrity(userId: string): Promise<{
    isComplete: boolean;
    missing: string[];
    companyId?: string;
  }> {
    try {
      console.log('🔍 Verifying registration integrity for user:', userId);
      const missing: string[] = [];

      // Verificar perfil
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (profileError || !profile) {
        missing.push('profile');
      }

      // Verificar empresa
      if (!profile?.company_id) {
        missing.push('company');
      }

      // Verificar roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', userId)
        .eq('company_id', profile?.company_id);

      if (rolesError || !roles || roles.length === 0) {
        missing.push('roles');
      }

      const isComplete = missing.length === 0;
      console.log('📊 Registration integrity check:', { isComplete, missing, companyId: profile?.company_id });

      return {
        isComplete,
        missing,
        companyId: profile?.company_id
      };
    } catch (error) {
      console.error('❌ Error verifying registration integrity:', error);
      return { isComplete: false, missing: ['unknown_error'] };
    }
  }

  // Crear nueva empresa con usuario (versión mejorada con verificación de integridad)
  static async createCompanyWithUser(data: CompanyRegistrationWithUser): Promise<string> {
    try {
      console.log('🚀 Starting enhanced company registration process...');
      let userId: string;
      let isNewUser = false;

      // Fase 1: Manejo de autenticación mejorado
      console.log('🔐 Phase 1: Authentication handling...');
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: data.user_email,
        password: data.user_password
      });

      if (signInData.user && !signInError) {
        console.log('✅ Existing user authenticated:', signInData.user.id);
        userId = signInData.user.id;
        
        // Verificar integridad antes de proceder
        const integrity = await this.verifyCompanyRegistrationIntegrity(userId);
        if (integrity.isComplete) {
          throw new Error('Este usuario ya tiene una empresa completamente registrada. Use su cuenta existente.');
        }
        
        if (integrity.companyId) {
          throw new Error('Este usuario ya tiene una empresa registrada. Use su cuenta existente o contacte soporte.');
        }
      } else if (signInError && signInError.message.includes('Invalid login credentials')) {
        console.log('👤 Creating new user...');
        
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
          if (signUpError.message.includes('User already registered')) {
            throw new Error('Ya existe una cuenta con este email. Intente iniciar sesión o use un email diferente.');
          }
          throw new Error(`Error al registrar usuario: ${signUpError.message}`);
        }
        
        if (!authData.user) {
          throw new Error('Error al crear usuario - no se recibió información del usuario');
        }

        userId = authData.user.id;
        isNewUser = true;
        console.log('✅ New user registered successfully:', userId);

        // Intentar iniciar sesión inmediatamente
        if (!authData.session) {
          console.log('🔑 Attempting immediate sign in...');
          const { data: postSignInData, error: postSignInError } = await supabase.auth.signInWithPassword({
            email: data.user_email,
            password: data.user_password
          });

          if (postSignInError && !postSignInError.message.includes('Email not confirmed')) {
            console.error('❌ Post-signup sign in error:', postSignInError);
          }
        }
      } else {
        throw new Error(`Error de autenticación: ${signInError?.message || 'Error desconocido'}`);
      }

      // Fase 2: Creación transaccional de empresa
      console.log('🏢 Phase 2: Transactional company creation...');
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
      
      // Fase 3: Verificación agresiva de integridad con reintentos
      console.log('🔍 Phase 3: Integrity verification with retries...');
      let verificationAttempts = 0;
      const maxVerificationAttempts = 10;
      let registrationComplete = false;

      while (!registrationComplete && verificationAttempts < maxVerificationAttempts) {
        verificationAttempts++;
        console.log(`🔄 Verification attempt ${verificationAttempts}/${maxVerificationAttempts}...`);
        
        // Esperar progresivamente más tiempo
        await new Promise(resolve => setTimeout(resolve, verificationAttempts * 1000));
        
        const integrity = await this.verifyCompanyRegistrationIntegrity(userId);
        
        if (integrity.isComplete) {
          registrationComplete = true;
          console.log('✅ Registration integrity verified successfully');
          break;
        }

        console.log(`⚠️ Registration incomplete, missing: ${integrity.missing.join(', ')}`);

        // Intentar corregir los componentes faltantes
        if (integrity.missing.includes('profile')) {
          console.log('🔧 Creating missing profile...');
          const { error: profileError } = await supabase
            .from('profiles')
            .insert({
              user_id: userId,
              first_name: data.first_name,
              last_name: data.last_name,
              company_id: companyId
            })
            .select()
            .single();
          
          if (profileError && profileError.code !== '23505') {
            console.error('❌ Profile creation error:', profileError);
          }
        }

        if (integrity.missing.includes('roles') || !integrity.companyId) {
          console.log('🔧 Force assigning admin role...');
          await forceAssignAdminRole(userId, companyId);
        }
      }

      // Fase 4: Verificación final y manejo de fallos
      if (!registrationComplete) {
        console.error('❌ Registration could not be completed after all attempts');
        
        // Último intento de recuperación
        console.log('🆘 Attempting final recovery...');
        await performCompleteRoleCheck(userId);
        
        // Verificación final
        const finalIntegrity = await this.verifyCompanyRegistrationIntegrity(userId);
        if (!finalIntegrity.isComplete) {
          throw new Error('Error crítico: No se pudo completar el registro de la empresa. Los datos se guardaron parcialmente. Contacte soporte técnico.');
        }
      }

      console.log('🎉 Enhanced company registration completed successfully');
      return companyId;
    } catch (error) {
      console.error('❌ Complete error in enhanced company creation process:', error);
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

  static async isSaasAdmin(): Promise<boolean> {
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

  static async getAllCompanies(): Promise<Company[]> {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

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
