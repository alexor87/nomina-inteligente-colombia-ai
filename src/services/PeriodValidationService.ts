
/**
 * Servicio de validación de fechas contra períodos de liquidación
 * Para conceptos específicos de nómina que requieren fechas dentro del período activo
 */

export interface PeriodValidationResult {
  isValid: boolean;
  message: string;
  periodInfo?: {
    startDate: string;
    endDate: string;
    periodName: string;
  };
}

export class PeriodValidationService {
  /**
   * Valida si una fecha individual está dentro del período de liquidación
   */
  static validateDateInPeriod(
    date: string,
    periodStart: string,
    periodEnd: string,
    noveltyType: string,
    periodName?: string
  ): PeriodValidationResult {
    if (!date || !periodStart || !periodEnd) {
      return {
        isValid: false,
        message: 'Fechas de período no configuradas correctamente'
      };
    }

    const dateObj = new Date(date + 'T00:00:00');
    const startObj = new Date(periodStart + 'T00:00:00');
    const endObj = new Date(periodEnd + 'T00:00:00');

    const isValid = dateObj >= startObj && dateObj <= endObj;

    return {
      isValid,
      message: isValid 
        ? 'Fecha válida para el período' 
        : this.getValidationErrorMessage(noveltyType, periodName || `${periodStart} - ${periodEnd}`),
      periodInfo: {
        startDate: periodStart,
        endDate: periodEnd,
        periodName: periodName || `${periodStart} - ${periodEnd}`
      }
    };
  }

  /**
   * Valida si un rango de fechas está completamente dentro del período de liquidación
   */
  static validateDateRangeInPeriod(
    startDate: string,
    endDate: string,
    periodStart: string,
    periodEnd: string,
    noveltyType: string,
    periodName?: string
  ): PeriodValidationResult {
    if (!startDate || !endDate || !periodStart || !periodEnd) {
      return {
        isValid: false,
        message: 'Fechas incompletas para validación'
      };
    }

    const rangeStartObj = new Date(startDate + 'T00:00:00');
    const rangeEndObj = new Date(endDate + 'T00:00:00');
    const periodStartObj = new Date(periodStart + 'T00:00:00');
    const periodEndObj = new Date(periodEnd + 'T00:00:00');

    const startValid = rangeStartObj >= periodStartObj && rangeStartObj <= periodEndObj;
    const endValid = rangeEndObj >= periodStartObj && rangeEndObj <= periodEndObj;
    const isValid = startValid && endValid;

    let message: string;
    if (isValid) {
      message = 'Rango de fechas válido para el período';
    } else if (!startValid && !endValid) {
      message = this.getValidationErrorMessage(noveltyType, periodName || `${periodStart} - ${periodEnd}`);
    } else if (!startValid) {
      message = `La fecha de inicio debe estar dentro del período ${periodName || `${periodStart} - ${periodEnd}`}`;
    } else {
      message = `La fecha de fin debe estar dentro del período ${periodName || `${periodStart} - ${periodEnd}`}`;
    }

    return {
      isValid,
      message,
      periodInfo: {
        startDate: periodStart,
        endDate: periodEnd,
        periodName: periodName || `${periodStart} - ${periodEnd}`
      }
    };
  }

  /**
   * Genera mensajes de error específicos por tipo de novedad
   */
  private static getValidationErrorMessage(noveltyType: string, periodName: string): string {
    const messages = {
      'horas_extra': `Las horas extra deben registrarse dentro del período de liquidación ${periodName}`,
      'recargo_nocturno': `Los recargos deben corresponder al período en liquidación ${periodName}`,
      'incapacidad': `La incapacidad debe estar dentro del período de liquidación ${periodName}`,
      'licencia_remunerada': `La licencia debe corresponder al período activo ${periodName}`,
      'default': `La fecha debe estar dentro del período de liquidación ${periodName}`
    };

    return messages[noveltyType] || messages['default'];
  }

  /**
   * Valida múltiples fechas individuales (para horas extra con múltiples entradas)
   */
  static validateMultipleDatesInPeriod(
    dates: string[],
    periodStart: string,
    periodEnd: string,
    noveltyType: string,
    periodName?: string
  ): { allValid: boolean; invalidDates: string[]; message: string } {
    const invalidDates: string[] = [];
    
    for (const date of dates) {
      const validation = this.validateDateInPeriod(date, periodStart, periodEnd, noveltyType, periodName);
      if (!validation.isValid) {
        invalidDates.push(date);
      }
    }

    const allValid = invalidDates.length === 0;
    const message = allValid 
      ? 'Todas las fechas son válidas'
      : `${invalidDates.length} fecha(s) fuera del período: ${invalidDates.join(', ')}`;

    return { allValid, invalidDates, message };
  }
}
