
import { supabase } from '@/integrations/supabase/client';
import { forceAssignAdminRole, performCompleteRoleCheck } from '@/utils/roleUtils';
import { CompanyConfigurationService } from './CompanyConfigurationService';

export interface CompanyRegistrationData {
  nit: string;
  razon_social: string;
  email: string;
  telefono?: string;
  ciudad?: string;
  plan: 'basico' | 'profesional' | 'empresarial';
  periodicity?: string; // Nueva propiedad para periodicidad
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

      // Intentar iniciar sesión para obtener sesión válida
      console.log('🔑 Attempting user signin...');
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

      if (!currentUser) {
        throw new Error('Usuario no autenticado después del signin');
      }

      // Esperar un momento para que se estabilice la sesión
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Preparar parámetros para la función RPC con tipos explícitos
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

      console.log('📤 Calling RPC with explicit params:', rpcParams);

      // Llamar a la función RPC con mejor manejo de errores
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

        // Proporcionar mensajes de error más específicos
        if (error.code === '42883') {
          throw new Error('Error de función en base de datos. La función create_company_with_setup tiene problemas de tipo de argumentos.');
        } else if (error.message?.includes('404')) {
          throw new Error('Función create_company_with_setup no encontrada. Verifique la configuración de la base de datos.');
        } else {
          throw error;
        }
      }

      if (!result) {
        console.error('❌ No result returned from RPC function');
        throw new Error('No se recibió respuesta de la función de creación de empresa');
      }

      console.log('✅ Company created successfully with id:', result);
      
      // Esperar para que se procesen los triggers de la base de datos
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Ejecutar verificación completa de roles como respaldo
      console.log('🚀 Starting complete role verification process...');
      const roleCheckSuccess = await performCompleteRoleCheck(signInData.user.id);
      
      if (!roleCheckSuccess) {
        console.warn('⚠️ Role check failed, trying force assignment...');
        await forceAssignAdminRole(signInData.user.id, result);
      }

      console.log('🎉 Company registration completed successfully!');
      return result;
      
    } catch (error) {
      console.error('💥 Error creating company with user:', error);
      
      // Log más detalles del error para debugging
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

      // NUEVO: Guardar configuración de periodicidad después de crear la empresa
      if (data.periodicity) {
        try {
          console.log('💾 Saving periodicity configuration:', data.periodicity);
          await CompanyConfigurationService.saveCompanyConfiguration(result, data.periodicity);
          console.log('✅ Periodicity configuration saved successfully');
        } catch (configError) {
          console.error('⚠️ Error saving periodicity configuration:', configError);
          // No lanzar error aquí para no fallar todo el proceso
          // La empresa ya fue creada exitosamente
        }
      }

      return result;
      
    } catch (error) {
      console.error('💥 Error creating company:', error);
      throw new Error(error instanceof Error ? error.message : 'Error al crear la empresa');
    }
  }
}
