
/**
 * 🔧 UTILIDADES DE REPARACIÓN DE BASE DE DATOS
 * Funciones para limpiar y normalizar datos inconsistentes
 */

import { supabase } from '@/integrations/supabase/client';

export class DatabaseRepairUtils {
  /**
   * 🧹 LIMPIAR PERÍODOS DUPLICADOS
   */
  static async cleanDuplicatePeriods(): Promise<{
    success: boolean;
    duplicatesRemoved: number;
    message: string;
  }> {
    try {
      console.log('🧹 Iniciando limpieza de períodos duplicados...');
      
      const { data, error } = await supabase.rpc('clean_specific_duplicate_periods');
      
      if (error) throw error;
      
      console.log('✅ Limpieza completada:', data);
      
      return {
        success: true,
        duplicatesRemoved: data.periods_deleted || 0,
        message: `Se eliminaron ${data.periods_deleted || 0} períodos duplicados`
      };
      
    } catch (error) {
      console.error('❌ Error limpiando duplicados:', error);
      return {
        success: false,
        duplicatesRemoved: 0,
        message: 'Error en limpieza de duplicados'
      };
    }
  }

  /**
   * 🔄 SINCRONIZAR DATOS HISTÓRICOS
   */
  static async syncHistoricalData(periodId: string): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      console.log('🔄 Sincronizando datos históricos para período:', periodId);
      
      const { data, error } = await supabase.rpc('sync_historical_payroll_data', {
        p_period_id: periodId
      });
      
      if (error) throw error;
      
      console.log('✅ Sincronización completada:', data);
      
      return {
        success: data.success || false,
        message: data.message || 'Sincronización completada'
      };
      
    } catch (error) {
      console.error('❌ Error sincronizando datos:', error);
      return {
        success: false,
        message: 'Error en sincronización de datos'
      };
    }
  }

  /**
   * 🔍 DETECTAR PERÍODO INTELIGENTE
   */
  static async detectSmartPeriod(): Promise<{
    success: boolean;
    suggestion: any;
    message: string;
  }> {
    try {
      console.log('🔍 Detectando período inteligente...');
      
      const { data, error } = await supabase.rpc('detect_current_smart_period');
      
      if (error) throw error;
      
      console.log('✅ Detección completada:', data);
      
      return {
        success: data.success || false,
        suggestion: data.calculated_period || null,
        message: data.message || 'Detección completada'
      };
      
    } catch (error) {
      console.error('❌ Error detectando período:', error);
      return {
        success: false,
        suggestion: null,
        message: 'Error en detección de período'
      };
    }
  }
}
