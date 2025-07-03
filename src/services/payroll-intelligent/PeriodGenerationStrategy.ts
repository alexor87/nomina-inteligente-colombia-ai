
/**
 * NUEVA ARQUITECTURA PROFESIONAL - ESTRATEGIAS DE GENERACIÓN DE PERÍODOS
 * Patrón Strategy para eliminar duplicación y asegurar consistencia
 */

export interface PeriodDates {
  startDate: string;
  endDate: string;
}

export interface PeriodGenerationStrategy {
  generateCurrentPeriod(): PeriodDates;
  generateNextConsecutivePeriod(lastPeriodEndDate: string): PeriodDates;
  generateFirstPeriod(): PeriodDates;
  validateAndCorrectPeriod(startDate: string, endDate: string): {
    isValid: boolean;
    correctedPeriod?: PeriodDates;
    message: string;
  };
}

/**
 * ESTRATEGIA QUINCENAL CORREGIDA - DETECCIÓN PRECISA DE PERÍODO ACTUAL
 */
export class BiWeeklyPeriodStrategy implements PeriodGenerationStrategy {
  generateCurrentPeriod(): PeriodDates {
    console.log('📅 GENERANDO PERÍODO QUINCENAL ACTUAL CORREGIDO');
    
    const today = new Date();
    const day = today.getDate();
    const month = today.getMonth();
    const year = today.getFullYear();
    
    console.log('🔍 FECHA ACTUAL:', { day, month: month + 1, year });
    
    if (day <= 15) {
      // Primera quincena (1-15)
      const period = {
        startDate: new Date(year, month, 1).toISOString().split('T')[0],
        endDate: new Date(year, month, 15).toISOString().split('T')[0]
      };
      console.log('✅ PRIMERA QUINCENA DETECTADA:', period);
      return period;
    } else {
      // Segunda quincena (16-fin de mes)
      const period = {
        startDate: new Date(year, month, 16).toISOString().split('T')[0],
        endDate: new Date(year, month + 1, 0).toISOString().split('T')[0]
      };
      console.log('✅ SEGUNDA QUINCENA DETECTADA:', period);
      return period;
    }
  }

  generateNextConsecutivePeriod(lastPeriodEndDate: string): PeriodDates {
    console.log('📅 GENERANDO PERÍODO QUINCENAL CONSECUTIVO desde:', lastPeriodEndDate);
    
    const lastEnd = new Date(lastPeriodEndDate);
    const nextStart = new Date(lastEnd);
    nextStart.setDate(lastEnd.getDate() + 1);
    
    const startDay = nextStart.getDate();
    const month = nextStart.getMonth();
    const year = nextStart.getFullYear();
    
    console.log('🔍 ANÁLISIS CONSECUTIVO: Día de inicio calculado:', startDay);
    
    if (startDay === 1) {
      // Primera quincena (1-15)
      console.log('✅ SIGUIENTE: PRIMERA QUINCENA (1-15)');
      return {
        startDate: new Date(year, month, 1).toISOString().split('T')[0],
        endDate: new Date(year, month, 15).toISOString().split('T')[0]
      };
    } else if (startDay === 16) {
      // Segunda quincena (16-fin del mes)
      console.log('✅ SIGUIENTE: SEGUNDA QUINCENA (16-fin de mes)');
      return {
        startDate: new Date(year, month, 16).toISOString().split('T')[0],
        endDate: new Date(year, month + 1, 0).toISOString().split('T')[0]
      };
    } else {
      // Ajustar automáticamente a la quincena más cercana
      console.log('⚠️ FECHA IRREGULAR - AJUSTANDO A QUINCENA MÁS CERCANA');
      
      if (startDay <= 15) {
        console.log('🔧 AJUSTADO A PRIMERA QUINCENA (1-15)');
        return {
          startDate: new Date(year, month, 1).toISOString().split('T')[0],
          endDate: new Date(year, month, 15).toISOString().split('T')[0]
        };
      } else {
        console.log('🔧 AJUSTADO A SEGUNDA QUINCENA (16-fin de mes)');
        return {
          startDate: new Date(year, month, 16).toISOString().split('T')[0],
          endDate: new Date(year, month + 1, 0).toISOString().split('T')[0]
        };
      }
    }
  }

  generateFirstPeriod(): PeriodDates {
    console.log('🆕 GENERANDO PRIMER PERÍODO QUINCENAL: Usar período actual');
    return this.generateCurrentPeriod();
  }

  validateAndCorrectPeriod(startDate: string, endDate: string): {
    isValid: boolean;
    correctedPeriod?: PeriodDates;
    message: string;
  } {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    const startDay = start.getDate();
    const endDay = end.getDate();
    const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
    
    // Validar primera quincena (1-15)
    if (startDay === 1 && endDay === 15 && sameMonth) {
      return {
        isValid: true,
        message: '✅ Período válido: Primera quincena (1-15)'
      };
    }
    
    // Validar segunda quincena (16-fin de mes)
    const lastDayOfMonth = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
    if (startDay === 16 && endDay === lastDayOfMonth && sameMonth) {
      return {
        isValid: true,
        message: '✅ Período válido: Segunda quincena (16-fin de mes)'
      };
    }
    
    // Solo corregir si es realmente necesario (diferencias críticas)
    const isDifferenceMinor = Math.abs(startDay - 1) <= 2 || Math.abs(startDay - 16) <= 2;
    
    if (isDifferenceMinor) {
      return {
        isValid: false,
        message: `⚠️ Período con fechas irregulares pero válidas: ${startDate}-${endDate}. No se requiere corrección automática.`
      };
    }
    
    // Solo para casos críticos, sugerir corrección
    let correctedPeriod: PeriodDates;
    
    if (startDay <= 15) {
      correctedPeriod = {
        startDate: new Date(start.getFullYear(), start.getMonth(), 1).toISOString().split('T')[0],
        endDate: new Date(start.getFullYear(), start.getMonth(), 15).toISOString().split('T')[0]
      };
    } else {
      correctedPeriod = {
        startDate: new Date(start.getFullYear(), start.getMonth(), 16).toISOString().split('T')[0],
        endDate: new Date(start.getFullYear(), start.getMonth() + 1, 0).toISOString().split('T')[0]
      };
    }
    
    return {
      isValid: false,
      correctedPeriod,
      message: `🔧 Período crítico detectado, corrección sugerida: ${startDate}-${endDate} → ${correctedPeriod.startDate}-${correctedPeriod.endDate}`
    };
  }
}

/**
 * ESTRATEGIA MENSUAL PROFESIONAL
 */
export class MonthlyPeriodStrategy implements PeriodGenerationStrategy {
  generateCurrentPeriod(): PeriodDates {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    
    return {
      startDate: new Date(year, month, 1).toISOString().split('T')[0],
      endDate: new Date(year, month + 1, 0).toISOString().split('T')[0]
    };
  }

  generateNextConsecutivePeriod(lastPeriodEndDate: string): PeriodDates {
    const lastEnd = new Date(lastPeriodEndDate);
    const nextStart = new Date(lastEnd);
    nextStart.setDate(lastEnd.getDate() + 1);
    
    const month = nextStart.getMonth();
    const year = nextStart.getFullYear();
    
    return {
      startDate: new Date(year, month, 1).toISOString().split('T')[0],
      endDate: new Date(year, month + 1, 0).toISOString().split('T')[0]
    };
  }

  generateFirstPeriod(): PeriodDates {
    return this.generateCurrentPeriod();
  }

  validateAndCorrectPeriod(startDate: string, endDate: string): {
    isValid: boolean;
    correctedPeriod?: PeriodDates;
    message: string;
  } {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    const expectedStart = new Date(start.getFullYear(), start.getMonth(), 1);
    const expectedEnd = new Date(start.getFullYear(), start.getMonth() + 1, 0);
    
    const isValid = start.getTime() === expectedStart.getTime() && 
                   end.getTime() === expectedEnd.getTime();
    
    if (isValid) {
      return {
        isValid: true,
        message: '✅ Período mensual válido'
      };
    }
    
    return {
      isValid: false,
      correctedPeriod: {
        startDate: expectedStart.toISOString().split('T')[0],
        endDate: expectedEnd.toISOString().split('T')[0]
      },
      message: '🔧 Período mensual corregido'
    };
  }
}

/**
 * ESTRATEGIA SEMANAL PROFESIONAL
 */
export class WeeklyPeriodStrategy implements PeriodGenerationStrategy {
  generateCurrentPeriod(): PeriodDates {
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

  generateNextConsecutivePeriod(lastPeriodEndDate: string): PeriodDates {
    const lastEnd = new Date(lastPeriodEndDate);
    const nextMonday = new Date(lastEnd);
    nextMonday.setDate(lastEnd.getDate() + 1);
    
    const nextSunday = new Date(nextMonday);
    nextSunday.setDate(nextMonday.getDate() + 6);

    return {
      startDate: nextMonday.toISOString().split('T')[0],
      endDate: nextSunday.toISOString().split('T')[0]
    };
  }

  generateFirstPeriod(): PeriodDates {
    return this.generateCurrentPeriod();
  }

  validateAndCorrectPeriod(startDate: string, endDate: string): {
    isValid: boolean;
    correctedPeriod?: PeriodDates;
    message: string;
  } {
    return {
      isValid: true,
      message: '✅ Período semanal válido'
    };
  }
}

/**
 * FACTORY PARA ESTRATEGIAS
 */
export class PeriodStrategyFactory {
  static createStrategy(periodicity: string): PeriodGenerationStrategy {
    switch (periodicity) {
      case 'quincenal':
        return new BiWeeklyPeriodStrategy();
      case 'mensual':
        return new MonthlyPeriodStrategy();
      case 'semanal':
        return new WeeklyPeriodStrategy();
      default:
        console.log('📅 PERIODICIDAD NO RECONOCIDA - Usando quincenal por defecto');
        return new BiWeeklyPeriodStrategy();
    }
  }
}
