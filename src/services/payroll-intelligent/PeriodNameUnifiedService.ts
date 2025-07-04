
/**
 * ✅ SERVICIO DE NOMBRES DE PERÍODOS UNIFICADOS - FASE 3
 * Genera nombres consistentes para períodos basados en fechas y periodicidad
 */
export class PeriodNameUnifiedService {
  
  /**
   * Generar nombre unificado para un período
   */
  static generateUnifiedPeriodName({
    startDate,
    endDate,
    periodicity
  }: {
    startDate: string;
    endDate: string;
    periodicity: 'semanal' | 'quincenal' | 'mensual';
  }): string {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    switch (periodicity) {
      case 'quincenal':
        return this.generateQuincenalName(start, end);
      case 'semanal':
        return this.generateSemanalName(start, end);
      case 'mensual':
        return this.generateMensualName(start, end);
      default:
        return this.generateMensualName(start, end);
    }
  }

  /**
   * Generar nombre para período quincenal
   */
  private static generateQuincenalName(start: Date, end: Date): string {
    const monthName = this.getMonthName(start.getMonth());
    const year = start.getFullYear();
    const startDay = start.getDate();
    const endDay = end.getDate();
    
    return `${startDay} - ${endDay} ${monthName} ${year}`;
  }

  /**
   * Generar nombre para período semanal
   */
  private static generateSemanalName(start: Date, end: Date): string {
    const monthName = this.getMonthName(start.getMonth());
    const year = start.getFullYear();
    const startDay = start.getDate();
    const endDay = end.getDate();
    
    return `Semana ${startDay}-${endDay} ${monthName} ${year}`;
  }

  /**
   * Generar nombre para período mensual
   */
  private static generateMensualName(start: Date, end: Date): string {
    const monthName = this.getMonthName(start.getMonth());
    const year = start.getFullYear();
    
    return `${monthName} ${year}`;
  }

  /**
   * Obtener nombre del mes en español
   */
  private static getMonthName(monthIndex: number): string {
    const months = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    return months[monthIndex];
  }

  /**
   * Validar formato de fecha
   */
  static validateDateFormat(dateString: string): boolean {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    return dateRegex.test(dateString) && !isNaN(Date.parse(dateString));
  }

  /**
   * Calcular duración en días de un período
   */
  static calculatePeriodDuration(startDate: string, endDate: string): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }
}
