
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
   * Generar nombre de período unificado - MÉTODO PRINCIPAL
   */
  static generateUnifiedPeriodName(params: {
    startDate: string;
    endDate: string;
    periodicity: 'mensual' | 'quincenal' | 'semanal';
  }): string {
    return this.generateNormalizedPeriodName(
      params.startDate,
      params.endDate,
      params.periodicity
    );
  }

  /**
   * Normalizar períodos existentes para asegurar consistencia en nombres
   */
  static async normalizeExistingPeriods(companyId: string): Promise<void> {
    try {
      console.log('🔄 Normalizando períodos existentes para empresa:', companyId);

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

      console.log(`📊 Procesando ${periods.length} períodos para normalización`);

      for (const period of periods) {
        // Generar nombre normalizado basado en fechas reales
        const normalizedName = this.generateNormalizedPeriodName(
          period.fecha_inicio,
          period.fecha_fin,
          period.tipo_periodo
        );

        // Solo actualizar si el nombre cambió
        if (normalizedName !== period.periodo) {
          console.log(`📝 Actualizando período: "${period.periodo}" → "${normalizedName}"`);
          
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

      console.log('✅ Normalización de períodos completada');
    } catch (error) {
      console.error('💥 Error crítico en normalización de períodos:', error);
    }
  }

  /**
   * Generar nombre de período normalizado basado en fechas y tipo - PROFESIONAL
   */
  private static generateNormalizedPeriodName(
    startDate: string,
    endDate: string,
    tipoPeriodo: string
  ): string {
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Para períodos quincenales, usar formato específico PROFESIONAL
    if (tipoPeriodo === 'quincenal') {
      const startDay = start.getDate();
      const endDay = end.getDate();
      const monthNames = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
      ];
      
      const monthName = monthNames[start.getMonth()];
      const year = start.getFullYear();
      
      // Aplicar reglas PROFESIONALES para períodos quincenales
      if (startDay === 1 && endDay === 15) {
        return `${startDay} - ${endDay} ${monthName} ${year}`;
      } else if (startDay === 16) {
        // Para segunda quincena, usar el último día real del mes
        const lastDay = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
        return `${startDay} - ${lastDay} ${monthName} ${year}`;
      } else {
        // Formato genérico para fechas que serán corregidas
        return `${startDay} - ${endDay} ${monthName} ${year}`;
      }
    }

    // Para períodos mensuales
    if (tipoPeriodo === 'mensual') {
      return getPeriodNameFromDates(startDate, endDate);
    }

    // Para otros tipos, usar lógica general
    return getPeriodNameFromDates(startDate, endDate);
  }

  /**
   * Generar nombre de período para nuevos períodos
   */
  static generatePeriodName(
    startDate: string,
    endDate: string,
    tipoPeriodo: string = 'mensual'
  ): string {
    return this.generateNormalizedPeriodName(startDate, endDate, tipoPeriodo);
  }

  /**
   * Validar y corregir nombre de período si es necesario
   */
  static async validateAndCorrectPeriodName(
    periodId: string,
    companyId: string
  ): Promise<boolean> {
    try {
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
        console.log(`📝 Corrigiendo nombre de período: "${period.periodo}" → "${correctName}"`);
        
        const { error: updateError } = await supabase
          .from('payroll_periods_real')
          .update({ periodo: correctName })
          .eq('id', periodId);

        if (updateError) {
          console.error('❌ Error actualizando nombre de período:', updateError);
          return false;
        }

        console.log('✅ Nombre de período corregido exitosamente');
        return true;
      }

      return true;
    } catch (error) {
      console.error('💥 Error validando nombre de período:', error);
      return false;
    }
  }
}
