
import { supabase } from '@/integrations/supabase/client';

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

      const result = {
        success: data.cleanup_completed,
        remainingDemoEmployees: data.remaining_demo_employees,
        companiesCleaned: data.companies_cleaned,
        status: data.status,
        message: data.cleanup_completed 
          ? '✨ Limpieza completada exitosamente - No quedan datos demo'
          : `⚠️ Limpieza incompleta - Quedan ${data.remaining_demo_employees} empleados demo`
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

      // Obtener estadísticas generales de empleados
      const { data: employees, error: employeesError } = await supabase
        .from('employees')
        .select('id, estado, company_id');

      if (employeesError) {
        throw employeesError;
      }

      const totalEmployees = employees?.length || 0;
      const activeEmployees = employees?.filter(emp => emp.estado === 'activo').length || 0;
      const companiesWithEmployees = new Set(employees?.map(emp => emp.company_id)).size;

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

      // Obtener company_id del usuario
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (!profile?.company_id) {
        throw new Error('Usuario sin empresa asignada');
      }

      // Buscar empleados con emails demo
      const { data: demoEmails, error: emailError } = await supabase
        .from('employees')
        .select('id, email, nombre, apellido')
        .eq('company_id', profile.company_id)
        .like('email', '%@test.com');

      if (emailError) throw emailError;

      // Buscar empleados con nombres demo
      const { data: demoNames, error: nameError } = await supabase
        .from('employees')
        .select('id, email, nombre, apellido')
        .eq('company_id', profile.company_id)
        .in('nombre', ['Juan Demo', 'María Demo', 'Carlos Demo', 'Ana Demo', 'Luis Demo']);

      if (nameError) throw nameError;

      return {
        hasDemoEmails: (demoEmails?.length || 0) > 0,
        hasDemoNames: (demoNames?.length || 0) > 0,
        demoEmailCount: demoEmails?.length || 0,
        demoNameCount: demoNames?.length || 0
      };
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
