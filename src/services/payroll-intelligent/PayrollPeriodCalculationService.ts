
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
      const result = this.generateInitialPeriod(periodicity);
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

  // Generar periodo inicial basado en periodicidad
  private static generateInitialPeriod(periodicity: string): { startDate: string; endDate: string } {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const day = today.getDate();

    console.log('📅 Generando periodo inicial para periodicidad:', periodicity);
    console.log('📅 Fecha actual:', { year, month, day });

    switch (periodicity) {
      case 'mensual':
        console.log('📅 Generando periodo mensual inicial');
        return {
          startDate: new Date(year, month, 1).toISOString().split('T')[0],
          endDate: new Date(year, month + 1, 0).toISOString().split('T')[0]
        };

      case 'quincenal':
        console.log('📅 Generando periodo quincenal inicial');
        if (day <= 15) {
          // Primera quincena del mes
          return {
            startDate: new Date(year, month, 1).toISOString().split('T')[0],
            endDate: new Date(year, month, 15).toISOString().split('T')[0]
          };
        } else {
          // Segunda quincena del mes
          return {
            startDate: new Date(year, month, 16).toISOString().split('T')[0],
            endDate: new Date(year, month + 1, 0).toISOString().split('T')[0]
          };
        }

      case 'semanal':
        console.log('📅 Generando periodo semanal inicial');
        const dayOfWeek = today.getDay();
        const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Lunes = 1
        const monday = new Date(today);
        monday.setDate(today.getDate() + mondayOffset);
        
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);

        return {
          startDate: monday.toISOString().split('T')[0],
          endDate: sunday.toISOString().split('T')[0]
        };

      case 'personalizado':
      default:
        console.log('📅 Periodicidad personalizada o no reconocida, usando mensual');
        return {
          startDate: new Date(year, month, 1).toISOString().split('T')[0],
          endDate: new Date(year, month + 1, 0).toISOString().split('T')[0]
        };
    }
  }
}
