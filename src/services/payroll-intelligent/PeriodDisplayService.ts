
/**
 * SERVICIO CENTRALIZADO PARA MANEJO DE PERÍODOS DE NÓMINA
 * Solución definitiva y profesional que centraliza toda la lógica de nombres y tipos de período
 */

export interface PeriodInfo {
  name: string;
  type: 'semanal' | 'quincenal' | 'mensual';
  number?: number;
  semanticName?: string;
  startDate: string;
  endDate: string;
  isValid: boolean;
}

export class PeriodDisplayService {
  
  /**
   * MÉTODO PRINCIPAL - Genera toda la información del período de manera consistente
   */
  static generatePeriodInfo(startDate: string, endDate: string, companyId?: string): PeriodInfo {
    // Validar fechas
    if (!this.isValidDateRange(startDate, endDate)) {
      return {
        name: `${startDate} - ${endDate}`,
        type: 'mensual',
        startDate,
        endDate,
        isValid: false
      };
    }

    // Calcular días reales
    const days = this.calculateDaysBetween(startDate, endDate);
    
    // Determinar tipo de período basado en días
    const type = this.determinePeriodType(days);
    
    // Generar nombre base
    const baseName = this.generateBaseName(startDate, endDate, type);
    
    // Si es posible, calcular número ordinal y generar nombre semántico
    let number: number | undefined;
    let semanticName: string | undefined;
    
    if (companyId) {
      number = this.calculatePeriodNumber(startDate, type);
      if (number) {
        const year = parseInt(startDate.split('-')[0]);
        semanticName = this.generateSemanticName(number, type, year);
      }
    }

    return {
      name: semanticName || baseName,
      type,
      number,
      semanticName,
      startDate,
      endDate,
      isValid: true
    };
  }

  /**
   * Calcular días entre fechas con parsing manual para evitar problemas de timezone
   */
  private static calculateDaysBetween(startDate: string, endDate: string): number {
    const startParts = startDate.split('-');
    const endParts = endDate.split('-');
    
    const start = new Date(
      parseInt(startParts[0]),     // year
      parseInt(startParts[1]) - 1, // month (0-indexed)
      parseInt(startParts[2])      // day
    );
    
    const end = new Date(
      parseInt(endParts[0]),       // year
      parseInt(endParts[1]) - 1,   // month (0-indexed)
      parseInt(endParts[2])        // day
    );
    
    const diffTime = end.getTime() - start.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }

  /**
   * Determinar tipo de período basado en número de días
   */
  private static determinePeriodType(days: number): 'semanal' | 'quincenal' | 'mensual' {
    if (days <= 7) return 'semanal';
    if (days <= 16) return 'quincenal';
    return 'mensual';
  }

  /**
   * Generar nombre base del período
   */
  private static generateBaseName(startDate: string, endDate: string, type: 'semanal' | 'quincenal' | 'mensual'): string {
    const startParts = startDate.split('-');
    const endParts = endDate.split('-');
    
    const startYear = parseInt(startParts[0]);
    const startMonth = parseInt(startParts[1]) - 1; // 0-indexed
    const startDay = parseInt(startParts[2]);
    
    const endYear = parseInt(endParts[0]);
    const endMonth = parseInt(endParts[1]) - 1; // 0-indexed
    const endDay = parseInt(endParts[2]);

    const monthNames = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    // Si es el mismo mes y año
    if (startMonth === endMonth && startYear === endYear) {
      const monthName = monthNames[startMonth];
      
      // Verificar si es primera quincena (1-15)
      if (startDay === 1 && endDay === 15) {
        return `1 - 15 ${monthName} ${startYear}`;
      }
      
      // Verificar si es segunda quincena (16-fin de mes)
      if (startDay === 16) {
        return `16 - ${endDay} ${monthName} ${startYear}`;
      }
      
      // Verificar si es mes completo
      const lastDayOfMonth = new Date(startYear, startMonth + 1, 0).getDate();
      if (startDay === 1 && endDay === lastDayOfMonth) {
        return `${monthName} ${startYear}`;
      }
      
      // Período personalizado dentro del mismo mes
      return `${startDay} - ${endDay} ${monthName} ${startYear}`;
    }

    // Rango entre diferentes meses
    const startMonthName = monthNames[startMonth];
    const endMonthName = monthNames[endMonth];
    
    if (startYear === endYear) {
      return `${startDay} ${startMonthName} - ${endDay} ${endMonthName} ${startYear}`;
    } else {
      return `${startDay} ${startMonthName} ${startYear} - ${endDay} ${endMonthName} ${endYear}`;
    }
  }

  /**
   * Calcular número ordinal del período en el año
   */
  private static calculatePeriodNumber(startDate: string, type: 'semanal' | 'quincenal' | 'mensual'): number | undefined {
    const startParts = startDate.split('-');
    const month = parseInt(startParts[1]); // 1-12
    const day = parseInt(startParts[2]);

    switch (type) {
      case 'mensual':
        return month;
        
      case 'quincenal':
        // Contar quincenas hasta este punto
        const previousMonthsQuincenas = (month - 1) * 2;
        const currentQuincena = day <= 15 ? 1 : 2;
        return previousMonthsQuincenas + currentQuincena;
        
      case 'semanal':
        // Para semanal, usar aproximación basada en semanas del año
        const date = new Date(
          parseInt(startParts[0]),
          parseInt(startParts[1]) - 1,
          parseInt(startParts[2])
        );
        return Math.ceil((date.getTime() - new Date(date.getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000));
        
      default:
        return undefined;
    }
  }

  /**
   * Generar nombre semántico basado en número ordinal
   */
  private static generateSemanticName(number: number, type: 'semanal' | 'quincenal' | 'mensual', year: number): string {
    switch (type) {
      case 'mensual':
        const monthNames = [
          'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
          'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
        ];
        return `${monthNames[number - 1]} ${year}`;
        
      case 'quincenal':
        return `Quincena ${number} del ${year}`;
        
      case 'semanal':
        return `Semana ${number} del ${year}`;
        
      default:
        return `Período ${number} del ${year}`;
    }
  }

  /**
   * Validar que el rango de fechas sea válido
   */
  private static isValidDateRange(startDate: string, endDate: string): boolean {
    if (!startDate || !endDate) return false;
    
    const startParts = startDate.split('-');
    const endParts = endDate.split('-');
    
    if (startParts.length !== 3 || endParts.length !== 3) return false;
    
    const start = new Date(
      parseInt(startParts[0]),
      parseInt(startParts[1]) - 1,
      parseInt(startParts[2])
    );
    
    const end = new Date(
      parseInt(endParts[0]),
      parseInt(endParts[1]) - 1,
      parseInt(endParts[2])
    );
    
    return start <= end && !isNaN(start.getTime()) && !isNaN(end.getTime());
  }

  /**
   * Obtener etiqueta del tipo de período en español
   */
  static getPeriodTypeLabel(type: 'semanal' | 'quincenal' | 'mensual'): string {
    const labels = {
      'semanal': 'Semanal',
      'quincenal': 'Quincenal',
      'mensual': 'Mensual'
    };
    return labels[type];
  }

  /**
   * Método de conveniencia para generar solo el nombre del período
   */
  static generatePeriodName(startDate: string, endDate: string): string {
    const info = this.generatePeriodInfo(startDate, endDate);
    return info.name;
  }

  /**
   * Método de conveniencia para determinar solo el tipo de período
   */
  static detectPeriodType(startDate: string, endDate: string): 'semanal' | 'quincenal' | 'mensual' {
    const days = this.calculateDaysBetween(startDate, endDate);
    return this.determinePeriodType(days);
  }
}
