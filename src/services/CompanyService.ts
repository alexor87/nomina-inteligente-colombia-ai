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

  // Función para probar la conexión RPC directamente
  static async testRpcConnection(): Promise<boolean> {
    try {
      console.log('🧪 Testing RPC connection...');
      
      // Verificar que el usuario esté autenticado
      const { data: { user } } = await supabase.auth.getUser();
      console.log('🔍 Current user for RPC test:', user?.id);
      
      if (!user) {
        console.error('❌ No authenticated user found');
        return false;
      }

      // Intentar llamar a una función RPC simple para verificar conectividad
      console.log('🔄 Attempting to call get_current_user_company_id...');
      const { data, error } = await supabase.rpc('get_current_user_company_id');
      
      console.log('🧪 RPC test result:', { data, error });
      
      if (error) {
        console.error('❌ RPC test failed:', error);
        console.error('❌ Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        return false;
      }
      
      console.log('✅ RPC connection test successful');
      
      // Ahora probar específicamente la función de creación de empresa
      console.log('🔄 Testing create_company_with_setup function existence...');
      
      // Intentar una llamada con parámetros de prueba (esto debería fallar por parámetros inválidos, pero no por 404)
      const testCall = await supabase.rpc('create_company_with_setup', {
        p_nit: 'TEST',
        p_razon_social: 'TEST',
        p_email: 'test@test.com',
        p_telefono: null,
        p_ciudad: 'Bogotá',
        p_plan: 'basico',
        p_user_email: null,
        p_user_password: null,
        p_first_name: null,
        p_last_name: null
      });
      
      console.log('🧪 create_company_with_setup test result:', testCall);
      
      // Si llegamos aquí sin un error 404, la función existe
      return true;
      
    } catch (error) {
      console.error('💥 RPC test error:', error);
      
      // Verificar si es un error 404 específicamente
      if (error && typeof error === 'object' && 'message' in error) {
        const errorMessage = (error as any).message;
        if (errorMessage.includes('404') || errorMessage.includes('not found')) {
          console.error('🚨 Function not found - 404 error detected');
          return false;
        }
      }
      
      // Si no es un 404, podría ser otro tipo de error (permisos, parámetros, etc.)
      console.log('ℹ️ Non-404 error detected, function likely exists but has other issues');
      return true;
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
