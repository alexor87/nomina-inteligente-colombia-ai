
import { supabase } from '@/integrations/supabase/client';

export interface GeneratedPeriod {
  id?: string;
  fecha_inicio: string;
  fecha_fin: string;
  tipo_periodo: 'semanal' | 'quincenal' | 'mensual';
  numero_periodo_anual: number;
  etiqueta_visible: string;
  periodo: string;
  estado: 'borrador' | 'en_proceso' | 'cerrado';
  company_id: string;
}

export interface AvailablePeriod extends GeneratedPeriod {
  can_select: boolean;
  reason?: string;
}

export class PeriodGenerationService {
  
  /**
   * Obtener períodos disponibles para liquidación - VERSIÓN CORREGIDA
   */
  static async getAvailablePeriods(companyId: string, year: number = new Date().getFullYear()): Promise<AvailablePeriod[]> {
    try {
      console.log(`🔍 Buscando períodos para empresa: ${companyId}, año: ${year}`);
      
      // Obtener todos los períodos del año desde la base de datos
      const { data: existingPeriods, error } = await supabase
        .from('payroll_periods_real')
        .select('*')
        .eq('company_id', companyId)
        .gte('fecha_inicio', `${year}-01-01`)
        .lte('fecha_fin', `${year}-12-31`)
        .order('numero_periodo_anual');
      
      if (error) {
        console.error('❌ Error obteniendo períodos:', error);
        throw error;
      }

      if (!existingPeriods || existingPeriods.length === 0) {
        console.warn('⚠️ No se encontraron períodos para la empresa');
        return [];
      }

      console.log(`✅ Encontrados ${existingPeriods.length} períodos en BD`);
      
      // Mapear períodos a AvailablePeriod con validación de selección
      const availablePeriods: AvailablePeriod[] = existingPeriods.map(period => {
        const canSelect = period.estado === 'borrador' || period.estado === 'en_proceso';
        const reason = period.estado === 'cerrado' ? 'Período ya liquidado' : undefined;
        
        return {
          id: period.id,
          fecha_inicio: period.fecha_inicio,
          fecha_fin: period.fecha_fin,
          tipo_periodo: period.tipo_periodo as 'semanal' | 'quincenal' | 'mensual',
          numero_periodo_anual: period.numero_periodo_anual || 0,
          etiqueta_visible: period.periodo, // Usar el campo periodo como etiqueta
          periodo: period.periodo,
          estado: period.estado as 'borrador' | 'en_proceso' | 'cerrado',
          company_id: period.company_id,
          can_select: canSelect,
          reason: reason
        };
      });
      
      const selectableCount = availablePeriods.filter(p => p.can_select).length;
      const closedCount = availablePeriods.filter(p => !p.can_select).length;
      
      console.log(`📊 Períodos procesados: ${availablePeriods.length} total, ${selectableCount} disponibles, ${closedCount} cerrados`);
      
      return availablePeriods;
      
    } catch (error) {
      console.error('❌ Error en getAvailablePeriods:', error);
      return [];
    }
  }
  
  /**
   * Obtener siguiente período disponible
   */
  static async getNextAvailablePeriod(companyId: string): Promise<AvailablePeriod | null> {
    try {
      const periods = await this.getAvailablePeriods(companyId);
      const availablePeriods = periods.filter(p => p.can_select);
      
      if (availablePeriods.length === 0) {
        console.warn('⚠️ No hay períodos disponibles');
        return null;
      }
      
      // Retorna el primer período disponible por número
      const nextPeriod = availablePeriods.sort((a, b) => (a.numero_periodo_anual || 0) - (b.numero_periodo_anual || 0))[0];
      console.log(`🎯 Siguiente período disponible: ${nextPeriod.etiqueta_visible}`);
      
      return nextPeriod;
    } catch (error) {
      console.error('❌ Error obteniendo siguiente período:', error);
      return null;
    }
  }
  
  /**
   * Marcar período como liquidado
   */
  static async markPeriodAsLiquidated(periodId: string): Promise<boolean> {
    try {
      console.log(`🔒 Marcando período como liquidado: ${periodId}`);
      
      const { error } = await supabase
        .from('payroll_periods_real')
        .update({ 
          estado: 'cerrado',
          updated_at: new Date().toISOString()
        })
        .eq('id', periodId);
      
      if (error) {
        console.error('❌ Error marcando período como liquidado:', error);
        return false;
      }
      
      console.log('✅ Período marcado como liquidado exitosamente');
      return true;
    } catch (error) {
      console.error('❌ Error en markPeriodAsLiquidated:', error);
      return false;
    }
  }

  // Métodos legacy mantenidos por compatibilidad pero simplificados
  static async generateYearPeriods(
    companyId: string, 
    year: number = new Date().getFullYear(),
    periodicity: 'semanal' | 'quincenal' | 'mensual' = 'quincenal'
  ): Promise<GeneratedPeriod[]> {
    console.warn('⚠️ generateYearPeriods es legacy, los períodos ya están en BD');
    const periods = await this.getAvailablePeriods(companyId, year);
    return periods.map(p => ({ ...p, can_select: undefined, reason: undefined }));
  }
}
