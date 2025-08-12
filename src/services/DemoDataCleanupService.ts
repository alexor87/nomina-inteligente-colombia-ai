

import { supabase } from '@/integrations/supabase/client';

/**
 * Interface for the RPC response from verify_demo_data_cleanup
 */
interface CleanupRPCPayload {
  cleanup_completed: boolean;
  remaining_demo_employees: number;
  companies_cleaned: number;
  verification_timestamp: string;
  status: 'SUCCESS' | 'INCOMPLETE';
}

/**
 * Type guard to check if data matches CleanupRPCPayload structure
 */
function isCleanupRPCPayload(data: any): data is CleanupRPCPayload {
  return (
    data &&
    typeof data === 'object' &&
    typeof data.cleanup_completed === 'boolean' &&
    typeof data.remaining_demo_employees === 'number' &&
    typeof data.companies_cleaned === 'number' &&
    typeof data.verification_timestamp === 'string' &&
    (data.status === 'SUCCESS' || data.status === 'INCOMPLETE')
  );
}

/**
 * 🧹 SERVICIO DE LIMPIEZA DE DATOS DEMO
 * Maneja la verificación y limpieza de datos demo residuales
 */
export class DemoDataCleanupService {
  
  /**
   * Verifica si la limpieza de datos demo fue exitosa
   */
  static async verifyCleanup(): Promise<{
    success: boolean;
    remainingDemoEmployees: number;
    companiesCleaned: number;
    status: 'SUCCESS' | 'INCOMPLETE';
    message: string;
  }> {
    try {
      console.log('🔍 Verificando limpieza de datos demo...');
      
      const { data, error } = await supabase
        .rpc('verify_demo_data_cleanup');

      if (error) {
        console.error('❌ Error verificando limpieza:', error);
        throw error;
      }

      // Safely parse the RPC response with proper type checking
      let cleanupData: CleanupRPCPayload;
      
      if (typeof data === 'string') {
        try {
          const parsedData = JSON.parse(data);
          if (isCleanupRPCPayload(parsedData)) {
            cleanupData = parsedData;
          } else {
            throw new Error('Parsed JSON does not match expected structure');
          }
        } catch (parseError) {
          throw new Error('Invalid JSON response from RPC');
        }
      } else if (isCleanupRPCPayload(data)) {
        cleanupData = data;
      } else {
        console.error('❌ Invalid RPC response structure:', data);
        throw new Error('Invalid RPC response format - expected CleanupRPCPayload structure');
      }

      const result = {
        success: cleanupData.cleanup_completed,
        remainingDemoEmployees: cleanupData.remaining_demo_employees,
        companiesCleaned: cleanupData.companies_cleaned,
        status: cleanupData.status,
        message: cleanupData.cleanup_completed 
          ? '✨ Limpieza completada exitosamente - No quedan datos demo'
          : `⚠️ Limpieza incompleta - Quedan ${cleanupData.remaining_demo_employees} empleados demo`
      };

      console.log('📊 Resultado de verificación:', result);
      return result;
    } catch (error) {
      console.error('❌ Error en verificación de limpieza:', error);
      return {
        success: false,
        remainingDemoEmployees: -1,
        companiesCleaned: 0,
        status: 'INCOMPLETE',
        message: 'Error verificando limpieza de datos demo'
      };
    }
  }

  /**
   * Obtiene estadísticas de empleados por empresa
   */
  static async getEmployeeStats(): Promise<{
    totalEmployees: number;
    activeEmployees: number;
    companiesWithEmployees: number;
  }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Usuario no autenticado');
      }

      // Obtener company_id del usuario usando maybeSingle() para evitar errores
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profileError) {
        console.error('❌ Error obteniendo perfil:', profileError);
        throw profileError;
      }

      if (!profile?.company_id) {
        console.warn('⚠️ Usuario sin empresa asignada');
        return {
          totalEmployees: 0,
          activeEmployees: 0,
          companiesWithEmployees: 0
        };
      }

      // Obtener estadísticas de empleados para la empresa del usuario
      const { data: employees, error: employeesError } = await supabase
        .from('employees')
        .select('id, estado, company_id')
        .eq('company_id', profile.company_id);

      if (employeesError) {
        console.error('❌ Error obteniendo empleados:', employeesError);
        throw employeesError;
      }

      const totalEmployees = employees?.length || 0;
      const activeEmployees = employees?.filter(emp => emp.estado === 'activo').length || 0;
      const companiesWithEmployees = employees && employees.length > 0 ? 1 : 0;

      console.log('📊 Estadísticas obtenidas:', { totalEmployees, activeEmployees, companiesWithEmployees });

      return {
        totalEmployees,
        activeEmployees,
        companiesWithEmployees
      };
    } catch (error) {
      console.error('❌ Error obteniendo estadísticas:', error);
      return {
        totalEmployees: 0,
        activeEmployees: 0,
        companiesWithEmployees: 0
      };
    }
  }

  /**
   * Verifica que no existan empleados con patrones demo
   */
  static async checkForDemoPatterns(): Promise<{
    hasDemoEmails: boolean;
    hasDemoNames: boolean;
    demoEmailCount: number;
    demoNameCount: number;
  }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Usuario no autenticado');
      }

      // Obtener company_id del usuario usando maybeSingle() para evitar errores
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profileError) {
        console.error('❌ Error obteniendo perfil:', profileError);
        throw profileError;
      }

      if (!profile?.company_id) {
        console.warn('⚠️ Usuario sin empresa asignada para verificar patrones demo');
        return {
          hasDemoEmails: false,
          hasDemoNames: false,
          demoEmailCount: 0,
          demoNameCount: 0
        };
      }

      // Buscar empleados con emails demo
      const { data: demoEmails, error: emailError } = await supabase
        .from('employees')
        .select('id, email, nombre, apellido')
        .eq('company_id', profile.company_id)
        .like('email', '%@test.com');

      if (emailError) {
        console.error('❌ Error verificando emails demo:', emailError);
        throw emailError;
      }

      // Buscar empleados con nombres demo
      const { data: demoNames, error: nameError } = await supabase
        .from('employees')
        .select('id, email, nombre, apellido')
        .eq('company_id', profile.company_id)
        .in('nombre', ['Juan Demo', 'María Demo', 'Carlos Demo', 'Ana Demo', 'Luis Demo']);

      if (nameError) {
        console.error('❌ Error verificando nombres demo:', nameError);
        throw nameError;
      }

      const result = {
        hasDemoEmails: (demoEmails?.length || 0) > 0,
        hasDemoNames: (demoNames?.length || 0) > 0,
        demoEmailCount: demoEmails?.length || 0,
        demoNameCount: demoNames?.length || 0
      };

      console.log('🔍 Patrones demo verificados:', result);
      return result;
    } catch (error) {
      console.error('❌ Error verificando patrones demo:', error);
      return {
        hasDemoEmails: false,
        hasDemoNames: false,
        demoEmailCount: 0,
        demoNameCount: 0
      };
    }
  }
}

