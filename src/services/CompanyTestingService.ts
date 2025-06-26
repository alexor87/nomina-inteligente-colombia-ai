
import { supabase } from '@/integrations/supabase/client';

export class CompanyTestingService {
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
      const { data: testData, error: testError } = await supabase.rpc('create_company_with_setup', {
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
      
      console.log('🧪 create_company_with_setup test result:', { data: testData, error: testError });
      
      // Verificar específicamente si es un error 404
      if (testError) {
        console.log('🔍 Test error details:', {
          message: testError.message,
          details: testError.details,
          hint: testError.hint,
          code: testError.code
        });
        
        // Verificar si es un error 404 específicamente
        if (testError.message?.includes('404') || 
            testError.message?.includes('not found') ||
            testError.details?.includes('not found') ||
            testError.code === 'PGRST202' ||
            testError.code === 'PGRST301') {
          console.error('🚨 Function create_company_with_setup NOT FOUND - 404 error detected');
          console.error('🔧 Please check if the function exists in your Supabase database');
          return false;
        }
        
        // Si es cualquier otro error (permisos, parámetros inválidos, etc.), la función existe
        console.log('ℹ️ Function exists but returned error (expected with test parameters)');
        return true;
      }
      
      // Si no hay error con parámetros de prueba, la función definitivamente existe
      console.log('✅ Function exists and responded successfully');
      return true;
      
    } catch (error) {
      console.error('💥 RPC test error:', error);
      
      // Verificar si es un error 404 específicamente
      if (error && typeof error === 'object' && 'message' in error) {
        const errorMessage = (error as any).message;
        if (errorMessage.includes('404') || errorMessage.includes('not found')) {
          console.error('🚨 Function create_company_with_setup NOT FOUND - 404 error detected');
          console.error('🔧 Please check if the function exists in your Supabase database');
          return false;
        }
      }
      
      // Verificar si es un error de respuesta HTTP 404
      if (error && typeof error === 'object' && 'status' in error && (error as any).status === 404) {
        console.error('🚨 Function create_company_with_setup NOT FOUND - HTTP 404 error');
        console.error('🔧 Please check if the function exists in your Supabase database');
        return false;
      }
      
      // Si no es un 404, podría ser otro tipo de error (permisos, parámetros, etc.)
      console.log('ℹ️ Non-404 error detected, function likely exists but has other issues');
      return false; // Cambiar a false para ser más conservador
    }
  }
}
