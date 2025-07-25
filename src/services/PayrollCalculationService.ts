import { differenceInDays, parseISO } from 'date-fns';

export interface PayrollPeriod {
  tipo_periodo: 'quincenal' | 'mensual' | 'semanal';
  fecha_inicio: string;
  fecha_fin: string;
}

/**
 * Servicio centralizado para cálculos de nómina
 * FUENTE ÚNICA DE VERDAD para días trabajados
 */
export class PayrollCalculationService {
  /**
   * Calcula días trabajados basándose en el tipo de período según legislación colombiana
   * @param period - Período de nómina con tipo y fechas
   * @returns Número de días trabajados según el estándar legal
   */
  static calculateWorkedDays(period: PayrollPeriod | null): number {
    if (!period) return 30;

    const { tipo_periodo, fecha_inicio, fecha_fin } = period;

    // LEGISLACIÓN COLOMBIANA: Usar tipo de período como fuente de verdad
    switch (tipo_periodo) {
      case 'quincenal':
        // Los períodos quincenales SIEMPRE son 15 días según legislación
        console.log('📊 PERÍODO QUINCENAL - ASIGNANDO 15 DÍAS (Legislación Colombiana)');
        return 15;
        
      case 'semanal':
        // Los períodos semanales SIEMPRE son 7 días
        console.log('📊 PERÍODO SEMANAL - ASIGNANDO 7 DÍAS');
        return 7;
        
      case 'mensual':
        // Para períodos mensuales, calcular días reales del mes
        if (fecha_inicio && fecha_fin) {
          const startDate = parseISO(fecha_inicio);
          const endDate = parseISO(fecha_fin);
          const realDays = differenceInDays(endDate, startDate) + 1;
          console.log('📊 PERÍODO MENSUAL - CALCULANDO DÍAS REALES:', realDays);
          return realDays;
        }
        return 30; // Fallback para mensual
        
      default:
        console.warn('⚠️ TIPO DE PERÍODO DESCONOCIDO:', tipo_periodo);
        return 30;
    }
  }

  /**
   * Calcula días reales del calendario (para información adicional)
   * @param fecha_inicio - Fecha de inicio del período
   * @param fecha_fin - Fecha de fin del período
   * @returns Número de días calendario entre las fechas
   */
  static calculateRealDays(fecha_inicio: string, fecha_fin: string): number {
    if (!fecha_inicio || !fecha_fin) return 0;
    
    const startDate = parseISO(fecha_inicio);
    const endDate = parseISO(fecha_fin);
    return differenceInDays(endDate, startDate) + 1;
  }

  /**
   * Obtiene información completa de días para un período
   * @param period - Período de nómina
   * @returns Objeto con días legales y días reales
   */
  static getDaysInfo(period: PayrollPeriod | null) {
    if (!period) {
      return {
        legalDays: 30,
        realDays: 30,
        periodType: 'mensual' as const
      };
    }

    const legalDays = this.calculateWorkedDays(period);
    const realDays = this.calculateRealDays(period.fecha_inicio, period.fecha_fin);

    return {
      legalDays,
      realDays,
      periodType: period.tipo_periodo
    };
  }
}