
import { supabase } from '@/integrations/supabase/client';
import { forceAssignAdminRole, performCompleteRoleCheck } from '@/utils/roleUtils';

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

export class CompanyRegistrationService {
  // Exportar supabase para uso externo
  static supabase = supabase;

  // Crear nueva empresa con usuario (para registro completo)
  static async createCompanyWithUser(data: CompanyRegistrationWithUser): Promise<string> {
    try {
      console.log('🚀 Starting user registration process...');
      console.log('📝 Registration data:', {
        nit: data.nit,
        razon_social: data.razon_social,
        email: data.email,
        user_email: data.user_email,
        plan: data.plan,
        ciudad: data.ciudad
      });
      
      // Verificar si el usuario ya existe
      const { data: existingUser } = await supabase.auth.getUser();
      if (existingUser.user?.email === data.user_email) {
        console.log('👤 Usuario ya existe, completando registro...');
        return await this.completeIncompleteRegistration(data.user_email);
      }
      
      // Primero registrar el usuario
      console.log('🔐 Attempting user signup...');
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: data.user_email,
        password: data.user_password,
        options: {
          data: {
            first_name: data.first_name,
            last_name: data.last_name
          }
        }
      });

      if (signUpError) {
        console.error('❌ Sign up error:', signUpError);
        throw signUpError;
      }
      
      if (!authData.user) {
        throw new Error('Error al crear usuario - no se recibió información del usuario');
      }

      console.log('✅ User registered successfully:', authData.user.id);

      // Esperar un momento para que se procese el trigger de perfil
      await this.delay(2000);

      // Intentar iniciar sesión para obtener sesión válida
      console.log('🔑 Attempting user signin...');
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: data.user_email,
        password: data.user_password
      });

      if (signInError) {
        console.error('❌ Sign in error:', signInError);
        // Si falla el signin, intentar completar registro con función de corrección
        return await this.completeIncompleteRegistration(data.user_email);
      }

      console.log('✅ User signed in successfully');

      // Verificar que el usuario esté autenticado
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      console.log('🔍 Current user verification:', currentUser?.id);

      if (!currentUser) {
        throw new Error('Usuario no autenticado después del signin');
      }

      // Esperar para que se estabilice la sesión
      await this.delay(1000);

      // Intentar crear empresa con función RPC mejorada
      try {
        const companyId = await this.createCompanyWithRPC(data, currentUser.id);
        
        // Verificación post-creación
        await this.delay(2000);
        const isComplete = await this.verifyRegistrationComplete(currentUser.id);
        
        if (!isComplete) {
          console.warn('⚠️ Registration not complete, trying correction...');
          return await this.completeIncompleteRegistration(data.user_email);
        }
        
        console.log('🎉 Company registration completed successfully!');
        return companyId;
        
      } catch (rpcError) {
        console.error('❌ RPC function failed, trying alternative approach:', rpcError);
        return await this.completeIncompleteRegistration(data.user_email);
      }
      
    } catch (error) {
      console.error('💥 Error creating company with user:', error);
      
      // Si hay un error, intentar completar con función de corrección
      if (data.user_email) {
        console.log('🔄 Attempting to complete registration with correction function...');
        try {
          return await this.completeIncompleteRegistration(data.user_email);
        } catch (correctionError) {
          console.error('💥 Correction also failed:', correctionError);
        }
      }
      
      throw new Error(error instanceof Error ? error.message : 'Error al crear la empresa');
    }
  }

  // Función para completar registros incompletos
  static async completeIncompleteRegistration(userEmail: string): Promise<string> {
    try {
      console.log('🔄 Completing incomplete registration for:', userEmail);
      
      const { data, error } = await supabase.rpc('complete_incomplete_registration', {
        p_user_email: userEmail,
        p_company_name: 'Mi Empresa',
        p_nit: '900000000-0'
      });

      if (error) {
        console.error('❌ Error completing registration:', error);
        throw error;
      }

      // Type guard for the response data
      if (data && typeof data === 'object' && 'success' in data && data.success) {
        console.log('✅ Registration completed successfully:', (data as any).company_id);
        return (data as any).company_id;
      } else {
        throw new Error((data as any)?.message || 'Error completing registration');
      }
    } catch (error) {
      console.error('💥 Error in completeIncompleteRegistration:', error);
      throw error;
    }
  }

  // Crear empresa usando función RPC
  static async createCompanyWithRPC(data: CompanyRegistrationWithUser, userId: string): Promise<string> {
    const rpcParams = {
      p_nit: String(data.nit),
      p_razon_social: String(data.razon_social),
      p_email: String(data.email),
      p_telefono: data.telefono ? String(data.telefono) : null,
      p_ciudad: data.ciudad ? String(data.ciudad) : 'Bogotá',
      p_plan: String(data.plan),
      p_user_email: String(data.user_email),
      p_user_password: String(data.user_password),
      p_first_name: String(data.first_name),
      p_last_name: String(data.last_name)
    };

    console.log('📤 Calling RPC with params:', rpcParams);

    const { data: result, error } = await supabase.rpc('create_company_with_setup', rpcParams);

    if (error) {
      console.error('❌ RPC Error:', error);
      throw error;
    }

    if (!result) {
      throw new Error('No se recibió respuesta de la función de creación de empresa');
    }

    return result;
  }

  // Verificar que el registro esté completo
  static async verifyRegistrationComplete(userId: string): Promise<boolean> {
    try {
      console.log('🔍 Verifying registration completion for user:', userId);
      
      // Verificar perfil
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', userId)
        .single();

      if (profileError || !profile?.company_id) {
        console.log('❌ Profile check failed:', profileError);
        return false;
      }

      // Verificar roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('company_id', profile.company_id);

      if (rolesError || !roles || roles.length === 0) {
        console.log('❌ Roles check failed:', rolesError);
        return false;
      }

      console.log('✅ Registration verification passed');
      return true;
    } catch (error) {
      console.error('❌ Error verifying registration:', error);
      return false;
    }
  }

  // Función auxiliar para delay
  static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Crear nueva empresa (para registro desde usuario existente)
  static async createCompany(data: CompanyRegistrationData): Promise<string> {
    try {
      console.log('🏢 Creating company for existing user...');
      
      // Verificar que el usuario esté autenticado
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Usuario no autenticado');
      }

      console.log('👤 Current user:', user.id);

      const rpcParams = {
        p_nit: String(data.nit),
        p_razon_social: String(data.razon_social),
        p_email: String(data.email),
        p_telefono: data.telefono ? String(data.telefono) : null,
        p_ciudad: data.ciudad ? String(data.ciudad) : 'Bogotá',
        p_plan: String(data.plan),
        p_user_email: null,
        p_user_password: null,
        p_first_name: null,
        p_last_name: null
      };

      console.log('📤 Calling RPC for existing user:', rpcParams);

      const { data: result, error } = await supabase.rpc('create_company_with_setup', rpcParams);

      if (error) {
        console.error('❌ Error creating company:', error);
        throw error;
      }

      console.log('✅ Company created successfully:', result);
      return result;
      
    } catch (error) {
      console.error('💥 Error creating company:', error);
      throw new Error(error instanceof Error ? error.message : 'Error al crear la empresa');
    }
  }
}
