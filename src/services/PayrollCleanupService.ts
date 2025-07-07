
import { supabase } from '@/integrations/supabase/client';

export class PayrollCleanupService {
  
  static async cleanupAbandonedPeriods(): Promise<void> {
    try {
      console.log('🧹 Iniciando limpieza de períodos abandonados...');
      
      const companyId = await this.getCurrentUserCompanyId();
      if (!companyId) return;

      // Períodos abandonados: borrador/en_proceso sin actividad reciente y sin empleados
      const cutoffDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 horas atrás
      
      const { data: abandonedPeriods } = await supabase
        .from('payroll_periods_real')
        .select('id, periodo, last_activity_at, empleados_count')
        .eq('company_id', companyId)
        .in('estado', ['borrador', 'en_proceso'])
        .or(`empleados_count.eq.0,last_activity_at.lt.${cutoffDate.toISOString()}`);

      if (abandonedPeriods && abandonedPeriods.length > 0) {
        console.log('📋 Períodos abandonados encontrados:', abandonedPeriods.length);
        
        // Marcar como cancelados en lugar de eliminar
        const { error } = await supabase
          .from('payroll_periods_real')
          .update({ 
            estado: 'cancelado',
            updated_at: new Date().toISOString()
          })
          .in('id', abandonedPeriods.map(p => p.id));

        if (!error) {
          console.log('✅ Períodos abandonados limpiados exitosamente');
        } else {
          console.error('❌ Error limpiando períodos:', error);
        }
      } else {
        console.log('✅ No hay períodos abandonados para limpiar');
      }
    } catch (error) {
      console.error('💥 Error en limpieza de períodos:', error);
    }
  }

  private static async getCurrentUserCompanyId(): Promise<string | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      return profile?.company_id || null;
    } catch (error) {
      console.error('Error getting company ID:', error);
      return null;
    }
  }
}
