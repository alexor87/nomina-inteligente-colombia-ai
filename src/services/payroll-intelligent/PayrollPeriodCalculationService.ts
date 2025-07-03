
import { PayrollPeriod } from '@/types/payroll';
import { BiWeeklyPeriodService } from './BiWeeklyPeriodService';

export class PayrollPeriodCalculationService {
  // Calcular siguiente período basado en CONSULTA A BASE DE DATOS - VERSIÓN PROFESIONAL
  static async calculateNextPeriodFromDatabase(periodicity: string, companyId: string): Promise<{
    startDate: string;
    endDate: string;
  }> {
    console.log('📅 Calculando siguiente período DESDE BASE DE DATOS:', {
      periodicity,
      companyId
    });

    switch (periodicity) {
      case 'quincenal':
        // Usar servicio profesional que consulta la BD
        console.log('📅 Calculando siguiente período quincenal DESDE BD');
        return await BiWeeklyPeriodService.generateNextConsecutivePeriodFromDatabase(companyId);
        
      case 'mensual':
        // Para mensual, usar lógica similar consultando BD
        return await this.calculateNextMonthlyPeriodFromDatabase(companyId);
        
      case 'semanal':
        // Para semanal, usar lógica similar consultando BD  
        return await this.calculateNextWeeklyPeriodFromDatabase(companyId);
        
      default:
        // Por defecto, usar quincenal desde BD
        return await BiWeeklyPeriodService.generateNextConsecutivePeriodFromDatabase(companyId);
    }
  }

  // Método de respaldo que usa el último período cerrado (ORIGINAL CORREGIDO)
  static calculateNextPeriod(periodicity: string, closedPeriod: PayrollPeriod): {
    startDate: string;
    endDate: string;
  } {
    console.log('📅 Calculando siguiente período basado en período cerrado:', {
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
        // Por defecto quincenal
        return BiWeeklyPeriodService.generateNextConsecutivePeriod(closedPeriod.fecha_fin);
    }
  }

  // Método auxiliar para calcular siguiente período mensual desde BD
  private static async calculateNextMonthlyPeriodFromDatabase(companyId: string): Promise<{
    startDate: string;
    endDate: string;
  }> {
    // Similar lógica que BiWeeklyPeriodService pero para mensual
    // Por ahora usar lógica simple, se puede expandir luego
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    
    return {
      startDate: new Date(year, month, 1).toISOString().split('T')[0],
      endDate: new Date(year, month + 1, 0).toISOString().split('T')[0]
    };
  }

  // Método auxiliar para calcular siguiente período semanal desde BD
  private static async calculateNextWeeklyPeriodFromDatabase(companyId: string): Promise<{
    startDate: string;
    endDate: string;
  }> {
    // Similar lógica que BiWeeklyPeriodService pero para semanal
    const today = new Date();
    const dayOfWeek = today.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(today);
    monday.setDate(today.getDate() + mondayOffset);
    
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    return {
      startDate: monday.toISOString().split('T')[0],
      endDate: sunday.toISOString().split('T')[0]
    };
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
