
import { supabase } from '@/integrations/supabase/client';
import { parsePeriodToDateRange, getPeriodNameFromDates } from '@/utils/periodDateUtils';

export class PeriodNameUnifiedService {
  private static cache = new Map<string, any>();

  /**
   * Limpiar cache
   */
  static clearCache(): void {
    this.cache.clear();
    console.log('🧹 Cache de PeriodNameUnifiedService limpiado');
  }

  /**
   * Generar nombre de período unificado - MÉTODO PRINCIPAL CORREGIDO
   */
  static generateUnifiedPeriodName(params: {
    startDate: string;
    endDate: string;
    periodicity: 'mensual' | 'quincenal' | 'semanal';
  }): string {
    console.log('🚀 GENERANDO NOMBRE UNIFICADO:', params);
    
    const result = this.generateNormalizedPeriodName(
      params.startDate,
      params.endDate,
      params.periodicity
    );
    
    console.log('✅ NOMBRE GENERADO:', result);
    return result;
  }

  /**
   * Normalizar períodos existentes para asegurar consistencia en nombres
   */
  static async normalizeExistingPeriods(companyId: string): Promise<void> {
    try {
      console.log('🔄 NORMALIZANDO PERÍODOS EXISTENTES para empresa:', companyId);

      const { data: periods, error } = await supabase
        .from('payroll_periods_real')
        .select('*')
        .eq('company_id', companyId);

      if (error) {
        console.error('❌ Error obteniendo períodos para normalización:', error);
        return;
      }

      if (!periods || periods.length === 0) {
        console.log('ℹ️ No hay períodos para normalizar');
        return;
      }

      console.log(`📊 PROCESANDO ${periods.length} períodos para normalización`);

      for (const period of periods) {
        // Generar nombre normalizado basado en fechas reales
        const normalizedName = this.generateNormalizedPeriodName(
          period.fecha_inicio,
          period.fecha_fin,
          period.tipo_periodo
        );

        // Solo actualizar si el nombre cambió
        if (normalizedName !== period.periodo) {
          console.log(`📝 ACTUALIZANDO PERÍODO: "${period.periodo}" → "${normalizedName}"`);
          
          const { error: updateError } = await supabase
            .from('payroll_periods_real')
            .update({ periodo: normalizedName })
            .eq('id', period.id);

          if (updateError) {
            console.error(`❌ Error actualizando período ${period.id}:`, updateError);
          } else {
            console.log(`✅ Período ${period.id} actualizado exitosamente`);
          }
        }
      }

      console.log('✅ NORMALIZACIÓN DE PERÍODOS COMPLETADA');
    } catch (error) {
      console.error('💥 Error crítico en normalización de períodos:', error);
    }
  }

  /**
   * Generar nombre de período normalizado basado en fechas y tipo - CORREGIDO PROFESIONALMENTE
   */
  private static generateNormalizedPeriodName(
    startDate: string,
    endDate: string,
    tipoPeriodo: string
  ): string {
    console.log('🔧 GENERANDO NOMBRE NORMALIZADO:', { startDate, endDate, tipoPeriodo });
    
    // USAR LA FUNCIÓN CORREGIDA DE UTILS
    const result = getPeriodNameFromDates(startDate, endDate);
    
    console.log('✅ NOMBRE NORMALIZADO GENERADO:', result);
    return result;
  }

  /**
   * Generar nombre de período para nuevos períodos
   */
  static generatePeriodName(
    startDate: string,
    endDate: string,
    tipoPeriodo: string = 'mensual'
  ): string {
    console.log('🆕 GENERANDO NOMBRE PARA NUEVO PERÍODO:', { startDate, endDate, tipoPeriodo });
    
    const result = this.generateNormalizedPeriodName(startDate, endDate, tipoPeriodo);
    
    console.log('✅ NOMBRE PARA NUEVO PERÍODO:', result);
    return result;
  }

  /**
   * Validar y corregir nombre de período si es necesario
   */
  static async validateAndCorrectPeriodName(
    periodId: string,
    companyId: string
  ): Promise<boolean> {
    try {
      console.log('🔍 VALIDANDO Y CORRIGIENDO NOMBRE DE PERÍODO:', { periodId, companyId });
      
      const { data: period, error } = await supabase
        .from('payroll_periods_real')
        .select('*')
        .eq('id', periodId)
        .eq('company_id', companyId)
        .single();

      if (error || !period) {
        console.error('❌ Error obteniendo período para validación:', error);
        return false;
      }

      const correctName = this.generateNormalizedPeriodName(
        period.fecha_inicio,
        period.fecha_fin,
        period.tipo_periodo
      );

      if (correctName !== period.periodo) {
        console.log(`📝 CORRIGIENDO NOMBRE: "${period.periodo}" → "${correctName}"`);
        
        const { error: updateError } = await supabase
          .from('payroll_periods_real')
          .update({ periodo: correctName })
          .eq('id', periodId);

        if (updateError) {
          console.error('❌ Error actualizando nombre de período:', updateError);
          return false;
        }

        console.log('✅ NOMBRE DE PERÍODO CORREGIDO EXITOSAMENTE');
        return true;
      }

      console.log('✅ NOMBRE DE PERÍODO YA ES CORRECTO');
      return true;
    } catch (error) {
      console.error('💥 Error validando nombre de período:', error);
      return false;
    }
  }
}
