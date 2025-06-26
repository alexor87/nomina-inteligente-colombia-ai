
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
      
      // Primero registrar el usuario
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

      // Ahora necesitamos iniciar sesión para poder crear la empresa
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: data.user_email,
        password: data.user_password
      });

      if (signInError) {
        console.error('❌ Sign in error:', signInError);
        throw signInError;
      }

      console.log('✅ User signed in successfully');

      // Verificar que el usuario esté autenticado
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      console.log('🔍 Current user verification:', currentUser?.id);

      // Preparar parámetros para la función RPC
      const rpcParams = {
        p_nit: data.nit,
        p_razon_social: data.razon_social,
        p_email: data.email,
        p_telefono: data.telefono || null,
        p_ciudad: data.ciudad || 'Bogotá',
        p_plan: data.plan,
        p_user_email: data.user_email,
        p_user_password: data.user_password,
        p_first_name: data.first_name,
        p_last_name: data.last_name
      };

      console.log('📤 Calling RPC with params:', rpcParams);

      // Crear la empresa usando la función RPC con TODOS los parámetros requeridos
      const { data: result, error } = await supabase.rpc('create_company_with_setup', rpcParams);

      console.log('📥 RPC Response:', { result, error });

      if (error) {
        console.error('❌ Company creation error:', error);
        console.error('❌ Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw error;
      }

      if (!result) {
        console.error('❌ No result returned from RPC function');
        throw new Error('No se recibió respuesta de la función de creación de empresa');
      }

      console.log('✅ Company created successfully with id:', result);
      
      // Esperar para que se procesen los triggers
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // EJECUTAR VERIFICACIÓN COMPLETA DE ROLES
      console.log('🚀 Starting complete role verification process...');
      await performCompleteRoleCheck(signInData.user.id);
      
      // Verificación adicional - forzar asignación como respaldo
      console.log('🔒 Force assigning admin role as additional backup...');
      await forceAssignAdminRole(signInData.user.id, result);

      return result;
    } catch (error) {
      console.error('💥 Error creating company with user:', error);
      
      // Log más detalles del error
      if (error instanceof Error) {
        console.error('💥 Error message:', error.message);
        console.error('💥 Error stack:', error.stack);
      }
      
      // Si es un error de Supabase, logar detalles adicionales
      if (error && typeof error === 'object' && 'code' in error) {
        console.error('💥 Supabase error code:', (error as any).code);
        console.error('💥 Supabase error details:', (error as any).details);
        console.error('💥 Supabase error hint:', (error as any).hint);
      }
      
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
        p_plan: data.plan,
        p_user_email: null,
        p_user_password: null,
        p_first_name: null,
        p_last_name: null
      });

      if (error) throw error;

      return result;
    } catch (error) {
      console.error('Error creating company:', error);
      throw new Error('Error al crear la empresa');
    }
  }
}
