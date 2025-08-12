
import { supabase } from '@/integrations/supabase/client';

/**
 * ✅ SERVICIO DE REPARACIÓN CRÍTICA - SIN CREACIÓN DE DATOS DEMO
 * Convertido a servicio de diagnóstico únicamente
 */
export class CriticalRepairService {
  
  /**
   * Diagnóstico básico del sistema sin crear datos
   */
  static async diagnoseSystem(): Promise<any> {
    console.log('🔍 Diagnosticando sistema...');
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return {
          status: 'warning',
          message: 'Usuario no autenticado',
          issues: ['No hay usuario autenticado']
        };
      }

      // Verificar perfil del usuario
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (!profile?.company_id) {
        return {
          status: 'warning',
          message: 'Usuario sin empresa asignada',
          issues: ['Usuario necesita completar registro']
        };
      }

      console.log('✅ Sistema en buen estado');
      return {
        status: 'healthy',
        message: 'Sistema funcionando correctamente',
        issues: []
      };
    } catch (error) {
      console.error('❌ Error en diagnóstico:', error);
      return {
        status: 'error',
        message: 'Error en diagnóstico del sistema',
        issues: ['Error de conexión o configuración']
      };
    }
  }

  /**
   * DESHABILITADO: Ya no crea datos de prueba
   * Convertido a no-op para mantener compatibilidad
   */
  static async createMinimumTestData(): Promise<any> {
    console.log('⚠️ createMinimumTestData - DESHABILITADO por seguridad');
    
    // Log para auditoría
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from('security_audit_log')
        .insert({
          user_id: user.id,
          table_name: 'employees',
          action: 'BLOCKED',
          violation_type: 'demo_data_creation_blocked',
          query_attempted: 'createMinimumTestData called but blocked',
          additional_data: {
            reason: 'Demo data creation disabled for security',
            timestamp: new Date().toISOString()
          }
        });
    }
    
    return {
      success: false,
      message: 'Creación de datos demo deshabilitada por seguridad',
      employeesCreated: 0,
      periodsCreated: 0
    };
  }
}
