
/**
 * 🔧 UTILIDADES DE REPARACIÓN DE BASE DE DATOS
 * Funciones para limpiar y normalizar datos inconsistentes
 */

import { supabase } from '@/integrations/supabase/client';

// ✅ FIXED: Proper type definitions for database responses
interface CleanDuplicatePeriodsResponse {
  success: boolean;
  periods_deleted: number;
  message: string;
}

interface SyncHistoricalDataResponse {
  success: boolean;
  message: string;
}

interface DetectSmartPeriodResponse {
  success: boolean;
  calculated_period: any;
  message: string;
}

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
      
      // ✅ FIXED: Proper type casting
      const result = data as unknown as CleanDuplicatePeriodsResponse;
      
      return {
        success: true,
        duplicatesRemoved: result.periods_deleted || 0,
        message: `Se eliminaron ${result.periods_deleted || 0} períodos duplicados`
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
      
      // ✅ FIXED: Proper type casting
      const result = data as unknown as SyncHistoricalDataResponse;
      
      return {
        success: result.success || false,
        message: result.message || 'Sincronización completada'
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
      
      // ✅ FIXED: Proper type casting
      const result = data as unknown as DetectSmartPeriodResponse;
      
      return {
        success: result.success || false,
        suggestion: result.calculated_period || null,
        message: result.message || 'Detección completada'
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
