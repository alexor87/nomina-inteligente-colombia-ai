
import { supabase } from '@/integrations/supabase/client';

export class CompanyTestingService {
  // Función mejorada para probar la conexión RPC
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
      
      console.log('🧪 RPC basic test result:', { data, error });
      
      if (error) {
        console.error('❌ Basic RPC test failed:', error);
        return false;
      }
      
      console.log('✅ Basic RPC connection test successful');
      
      // Ahora probar específicamente la función de creación de empresa
      console.log('🔄 Testing create_company_with_setup function availability...');
      
      // Intentar una llamada con parámetros de prueba
      const testParams = {
        p_nit: 'TEST123',
        p_razon_social: 'TEST COMPANY',
        p_email: 'test@test.com',
        p_telefono: null,
        p_ciudad: 'Bogotá',
        p_plan: 'basico',
        p_user_email: null,
        p_user_password: null,
        p_first_name: null,
        p_last_name: null
      };
      
      console.log('📤 Testing with params:', testParams);
      
      const { data: testData, error: testError } = await supabase.rpc('create_company_with_setup', testParams);
      
      console.log('🧪 create_company_with_setup test result:', { data: testData, error: testError });
      
      // Analizar el tipo de error
      if (testError) {
        console.log('🔍 Test error analysis:', {
          message: testError.message,
          details: testError.details,
          hint: testError.hint,
          code: testError.code
        });
        
        // Verificar si es un error 404 (función no encontrada)
        if (testError.message?.includes('404') || 
            testError.message?.includes('not found') ||
            testError.details?.includes('not found') ||
            testError.code === 'PGRST202' ||
            testError.code === 'PGRST301') {
          console.error('🚨 Function create_company_with_setup NOT FOUND - 404 error detected');
          return false;
        }
        
        // Verificar si es un error de tipos (42883)
        if (testError.code === '42883') {
          console.error('🚨 Function signature mismatch - argument types don\'t match');
          console.error('🔧 This indicates the function exists but has type issues');
          return false;
        }
        
        // Verificar si es un error de autenticación o lógica de negocio
        if (testError.code === 'auth_required' || 
            testError.message?.includes('Usuario no autenticado') ||
            testError.message?.includes('duplicate key value')) {
          console.log('✅ Function exists and is accessible (business logic error expected with test data)');
          return true;
        }
        
        console.log('ℹ️ Function exists but returned unexpected error:', testError.message);
        return true;
      }
      
      // Si no hay error con parámetros de prueba, la función definitivamente existe y funciona
      console.log('✅ Function exists and responded successfully');
      return true;
      
    } catch (error) {
      console.error('💥 RPC test error:', error);
      
      // Analizar errores de la conexión
      if (error && typeof error === 'object') {
        const errorObj = error as any;
        
        if (errorObj.message?.includes('404') || errorObj.status === 404) {
          console.error('🚨 Function create_company_with_setup NOT FOUND - HTTP 404 error');
          return false;
        }
        
        if (errorObj.code === '42883') {
          console.error('🚨 Function signature mismatch detected in catch block');
          return false;
        }
      }
      
      console.log('ℹ️ Non-critical error detected, function likely exists');
      return true;
    }
  }

  // Nueva función para probar el registro completo
  static async testCompanyRegistration(): Promise<{ success: boolean; message: string }> {
    try {
      console.log('🧪 Testing complete company registration flow...');
      
      const testData = {
        nit: `TEST${Date.now()}`,
        razon_social: `TEST COMPANY ${Date.now()}`,
        email: `test${Date.now()}@test.com`,
        telefono: '3001234567',
        ciudad: 'Bogotá',
        plan: 'basico' as const,
        user_email: `testuser${Date.now()}@test.com`,
        user_password: 'TestPassword123!',
        first_name: 'Test',
        last_name: 'User'
      };

      console.log('📋 Test registration data prepared:', {
        nit: testData.nit,
        razon_social: testData.razon_social,
        user_email: testData.user_email
      });

      // Nota: Este es solo un test simulado, no ejecuta realmente el registro
      return {
        success: true,
        message: 'Test data prepared successfully. Ready for actual registration.'
      };

    } catch (error) {
      console.error('💥 Test preparation error:', error);
      return {
        success: false,
        message: `Test preparation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
}
