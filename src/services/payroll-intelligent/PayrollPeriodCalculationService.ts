import { PayrollPeriod } from '@/types/payroll';
import { BiWeeklyPeriodService } from './BiWeeklyPeriodService';

export class PayrollPeriodCalculationService {
  // Calcular siguiente período basado en el período cerrado real - CORREGIDO PROFESIONALMENTE
  static calculateNextPeriod(periodicity: string, closedPeriod: PayrollPeriod): {
    startDate: string;
    endDate: string;
  } {
    console.log('📅 Calculando siguiente período PROFESIONAL:', {
      periodicity,
      closedPeriodEnd: closedPeriod.fecha_fin,
      closedPeriodType: closedPeriod.tipo_periodo
    });

    switch (periodicity) {
      case 'quincenal':
        // Usar servicio profesional para períodos quincenales
        console.log('📅 Calculando siguiente período quincenal PROFESIONAL');
        return BiWeeklyPeriodService.generateNextConsecutivePeriod(closedPeriod.fecha_fin);
        
      case 'mensual':
        // Usar lógica mensual
        const baseDate = new Date(closedPeriod.fecha_fin);
        const startDate = new Date(baseDate);
        startDate.setDate(startDate.getDate() + 1);
        
        const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);
        
        return {
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0]
        };
        
      case 'semanal':
        // Usar lógica semanal
        const weekBaseDate = new Date(closedPeriod.fecha_fin);
        const weekStartDate = new Date(weekBaseDate);
        weekStartDate.setDate(weekStartDate.getDate() + 1);
        
        const weekEndDate = new Date(weekStartDate);
        weekEndDate.setDate(weekStartDate.getDate() + 6);
        
        return {
          startDate: weekStartDate.toISOString().split('T')[0],
          endDate: weekEndDate.toISOString().split('T')[0]
        };
        
      default:
        // Por defecto mensual
        const defaultBaseDate = new Date(closedPeriod.fecha_fin);
        const defaultStartDate = new Date(defaultBaseDate);
        defaultStartDate.setDate(defaultStartDate.getDate() + 1);
        
        const defaultEndDate = new Date(defaultStartDate.getFullYear(), defaultStartDate.getMonth() + 1, 0);
        
        return {
          startDate: defaultStartDate.toISOString().split('T')[0],
          endDate: defaultEndDate.toISOString().split('T')[0]
        };
    }
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
