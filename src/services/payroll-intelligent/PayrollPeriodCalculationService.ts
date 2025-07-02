import { PayrollPeriod } from '@/types/payroll';

export class PayrollPeriodCalculationService {
  // Calcular siguiente período basado en el período cerrado real
  static calculateNextPeriod(periodicity: string, closedPeriod: PayrollPeriod): {
    startDate: string;
    endDate: string;
  } {
    console.log('📅 Calculando siguiente período:', {
      periodicity,
      closedPeriodEnd: closedPeriod.fecha_fin,
      closedPeriodType: closedPeriod.tipo_periodo
    });

    // Usar la fecha fin del período cerrado como base
    const baseDate = new Date(closedPeriod.fecha_fin);
    
    // El siguiente período inicia el día después del cierre
    const startDate = new Date(baseDate);
    startDate.setDate(startDate.getDate() + 1);
    
    // Calcular fecha fin según periodicidad
    const endDate = new Date(startDate);
    
    switch (periodicity) {
      case 'quincenal':
        endDate.setDate(endDate.getDate() + 14); // 15 días
        break;
      case 'mensual':
        endDate.setMonth(endDate.getMonth() + 1);
        endDate.setDate(endDate.getDate() - 1); // Último día del mes
        break;
      case 'semanal':
        endDate.setDate(endDate.getDate() + 6); // 7 días
        break;
      default:
        // Por defecto mensual
        endDate.setMonth(endDate.getMonth() + 1);
        endDate.setDate(endDate.getDate() - 1);
    }

    const result = {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    };

    console.log('✅ Fechas calculadas para siguiente período:', result);
    return result;
  }

  // Validar que las fechas calculadas no se superpongan con períodos existentes
  static validateNonOverlapping(startDate: string, endDate: string, existingPeriods: PayrollPeriod[]): {
    isValid: boolean;
    conflictPeriod?: PayrollPeriod;
  } {
    const newStart = new Date(startDate).getTime();
    const newEnd = new Date(endDate).getTime();

    for (const period of existingPeriods) {
      // Ignorar períodos cerrados, solo verificar activos y borradores
      
      const periodStart = new Date(period.fecha_inicio).getTime();
      const periodEnd = new Date(period.fecha_fin).getTime();
      
      // Verificar superposición
      const overlaps = newStart <= periodEnd && newEnd >= periodStart;
      
      if (overlaps) {
        console.warn('⚠️ Superposición detectada con período:', period);
        return { isValid: false, conflictPeriod: period };
      }
    }

    return { isValid: true };
  }
}