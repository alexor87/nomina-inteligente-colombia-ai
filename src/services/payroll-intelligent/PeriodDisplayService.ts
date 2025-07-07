
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
    console.log('🔍 PERIOD DISPLAY SERVICE - Input:', { startDate, endDate, companyId });
    
    // Validar fechas
    if (!this.isValidDateRange(startDate, endDate)) {
      console.log('❌ Invalid date range detected');
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
    console.log('📊 Days calculated:', days);
    
    // Determinar tipo de período basado en días
    const type = this.determinePeriodType(days);
    console.log('📋 Period type determined:', type);
    
    // Generar nombre base
    const baseName = this.generateBaseName(startDate, endDate, type);
    console.log('🏷️ Base name generated:', baseName);
    
    // Si es posible, calcular número ordinal y generar nombre semántico
    let number: number | undefined;
    let semanticName: string | undefined;
    
    if (companyId) {
      number = this.calculatePeriodNumber(startDate, type);
      console.log('🔢 Period number calculated:', number);
      
      if (number) {
        const year = parseInt(startDate.split('-')[0]);
        semanticName = this.generateSemanticName(number, type, year);
        console.log('✨ Semantic name generated:', semanticName);
      }
    }

    const result = {
      name: semanticName || baseName,
      type,
      number,
      semanticName,
      startDate,
      endDate,
      isValid: true
    };

    console.log('✅ PERIOD DISPLAY SERVICE - Final result:', result);
    return result;
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
    const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    
    console.log('🧮 Date calculation details:', {
      startDate,
      endDate,
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
      diffTime,
      days
    });
    
    return days;
  }

  /**
   * Determinar tipo de período basado en número de días
   */
  private static determinePeriodType(days: number): 'semanal' | 'quincenal' | 'mensual' {
    console.log('🎯 Determining period type for days:', days);
    
    let type: 'semanal' | 'quincenal' | 'mensual';
    
    if (days <= 7) {
      type = 'semanal';
    } else if (days <= 16) {
      type = 'quincenal';
    } else {
      type = 'mensual';
    }
    
    console.log('📊 Period type decision:', { days, type });
    return type;
  }

  /**
   * Generar nombre base del período
   */
  private static generateBaseName(startDate: string, endDate: string, type: 'semanal' | 'quincenal' | 'mensual'): string {
    console.log('🏷️ Generating base name for:', { startDate, endDate, type });
    
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
        const name = `1 - 15 ${monthName} ${startYear}`;
        console.log('📅 First fortnight detected:', name);
        return name;
      }
      
      // Verificar si es segunda quincena (16-fin de mes)
      if (startDay === 16) {
        const name = `16 - ${endDay} ${monthName} ${startYear}`;
        console.log('📅 Second fortnight detected:', name);
        return name;
      }
      
      // Verificar si es mes completo
      const lastDayOfMonth = new Date(startYear, startMonth + 1, 0).getDate();
      if (startDay === 1 && endDay === lastDayOfMonth) {
        const name = `${monthName} ${startYear}`;
        console.log('📅 Full month detected:', name);
        return name;
      }
      
      // Período personalizado dentro del mismo mes
      const name = `${startDay} - ${endDay} ${monthName} ${startYear}`;
      console.log('📅 Custom period within same month:', name);
      return name;
    }

    // Rango entre diferentes meses
    const startMonthName = monthNames[startMonth];
    const endMonthName = monthNames[endMonth];
    
    let name: string;
    if (startYear === endYear) {
      name = `${startDay} ${startMonthName} - ${endDay} ${endMonthName} ${startYear}`;
    } else {
      name = `${startDay} ${startMonthName} ${startYear} - ${endDay} ${endMonthName} ${endYear}`;
    }
    
    console.log('📅 Cross-month period:', name);
    return name;
  }

  /**
   * Calcular número ordinal del período en el año
   */
  private static calculatePeriodNumber(startDate: string, type: 'semanal' | 'quincenal' | 'mensual'): number | undefined {
    console.log('🔢 Calculating period number for:', { startDate, type });
    
    const startParts = startDate.split('-');
    const month = parseInt(startParts[1]); // 1-12
    const day = parseInt(startParts[2]);

    let number: number | undefined;

    switch (type) {
      case 'mensual':
        number = month;
        break;
        
      case 'quincenal':
        // Contar quincenas hasta este punto
        const previousMonthsQuincenas = (month - 1) * 2;
        const currentQuincena = day <= 15 ? 1 : 2;
        number = previousMonthsQuincenas + currentQuincena;
        break;
        
      case 'semanal':
        // Para semanal, usar aproximación basada en semanas del año
        const date = new Date(
          parseInt(startParts[0]),
          parseInt(startParts[1]) - 1,
          parseInt(startParts[2])
        );
        number = Math.ceil((date.getTime() - new Date(date.getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000));
        break;
        
      default:
        number = undefined;
    }

    console.log('🔢 Period number result:', { type, month, day, number });
    return number;
  }

  /**
   * Generar nombre semántico basado en número ordinal
   */
  private static generateSemanticName(number: number, type: 'semanal' | 'quincenal' | 'mensual', year: number): string {
    console.log('✨ Generating semantic name:', { number, type, year });
    
    let name: string;
    
    switch (type) {
      case 'mensual':
        const monthNames = [
          'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
          'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
        ];
        name = `${monthNames[number - 1]} ${year}`;
        break;
        
      case 'quincenal':
        name = `Quincena ${number} del ${year}`;
        break;
        
      case 'semanal':
        name = `Semana ${number} del ${year}`;
        break;
        
      default:
        name = `Período ${number} del ${year}`;
    }
    
    console.log('✨ Semantic name result:', name);
    return name;
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
    
    const isValid = start <= end && !isNaN(start.getTime()) && !isNaN(end.getTime());
    console.log('✅ Date range validation:', { startDate, endDate, isValid });
    return isValid;
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
