
import { PayrollPeriodService, PayrollPeriod } from '../PayrollPeriodService';

export class PayrollPeriodCalculationService {
  // Calcular siguiente periodo basado en el último cerrado
  static calculateNextPeriod(
    periodicity: string, 
    lastPeriod?: PayrollPeriod | null
  ): { startDate: string; endDate: string } {
    console.log('📊 Calculando periodo con periodicidad:', periodicity);
    
    if (!lastPeriod) {
      // Si no hay periodo anterior, usar la periodicidad configurada correctamente
      console.log('📅 No hay periodo anterior, generando periodo inicial con periodicidad:', periodicity);
      const result = PayrollPeriodService.generatePeriodDates(periodicity);
      console.log('📅 Periodo inicial generado:', result);
      return result;
    }

    const lastEndDate = new Date(lastPeriod.fecha_fin);
    const nextStartDate = new Date(lastEndDate);
    nextStartDate.setDate(lastEndDate.getDate() + 1); // Día siguiente al último periodo

    // Calcular el fin del siguiente periodo basado en la periodicidad configurada
    let nextEndDate: Date;
    
    switch (periodicity) {
      case 'semanal':
        console.log('📅 Calculando periodo semanal');
        nextEndDate = new Date(nextStartDate);
        nextEndDate.setDate(nextStartDate.getDate() + 6); // 7 días total
        break;
        
      case 'quincenal':
        console.log('📅 Calculando periodo quincenal');
        nextEndDate = new Date(nextStartDate);
        nextEndDate.setDate(nextStartDate.getDate() + 14); // 15 días total
        break;
        
      case 'mensual':
        console.log('📅 Calculando periodo mensual');
        nextEndDate = new Date(nextStartDate);
        nextEndDate.setMonth(nextStartDate.getMonth() + 1);
        nextEndDate.setDate(0); // Último día del mes
        break;
        
      default:
        // Fallback a mensual
        console.log('📅 Periodicidad no reconocida, usando mensual como fallback');
        nextEndDate = new Date(nextStartDate);
        nextEndDate.setMonth(nextStartDate.getMonth() + 1);
        nextEndDate.setDate(0);
    }

    const result = {
      startDate: nextStartDate.toISOString().split('T')[0],
      endDate: nextEndDate.toISOString().split('T')[0]
    };

    console.log('📅 Periodo calculado:', result);
    return result;
  }
}
