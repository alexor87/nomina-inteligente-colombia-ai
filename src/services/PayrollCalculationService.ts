
/**
 * Servicio de cálculo de nómina con jornada legal dinámica según Ley 2101 de 2021
 * DEPRECATED: Usar PayrollCalculationEnhancedService en su lugar
 * Se mantiene por compatibilidad pero redirige al servicio mejorado
 */

import { PayrollCalculationEnhancedService, PayrollCalculationInputEnhanced, PayrollCalculationResultEnhanced, ValidationResultEnhanced } from './PayrollCalculationEnhancedService';

export interface PayrollCalculationInput extends PayrollCalculationInputEnhanced {
  // Mantener compatibilidad con la interfaz antigua
}

export interface PayrollCalculationResult extends PayrollCalculationResultEnhanced {
  // Mantener compatibilidad con la interfaz antigua
}

export interface ValidationResult extends ValidationResultEnhanced {
  // Mantener compatibilidad con la interfaz antigua
}

export class PayrollCalculationService {
  /**
   * @deprecated Usar PayrollCalculationEnhancedService.validateEmployee en su lugar
   */
  static validateEmployee(
    input: PayrollCalculationInput,
    eps?: string,
    afp?: string
  ): ValidationResult {
    console.warn('⚠️ PayrollCalculationService.validateEmployee is deprecated. Use PayrollCalculationEnhancedService.validateEmployee instead');
    return PayrollCalculationEnhancedService.validateEmployee(input, eps, afp);
  }

  /**
   * @deprecated Usar PayrollCalculationEnhancedService.calculatePayroll en su lugar
   */
  static calculatePayroll(input: PayrollCalculationInput): PayrollCalculationResult {
    console.warn('⚠️ PayrollCalculationService.calculatePayroll is deprecated. Use PayrollCalculationEnhancedService.calculatePayroll instead');
    
    // Asegurar que se incluya la fecha del período para cálculos precisos
    const enhancedInput: PayrollCalculationInputEnhanced = {
      ...input,
      periodDate: input.periodDate || new Date()
    };
    
    return PayrollCalculationEnhancedService.calculatePayroll(enhancedInput);
  }

  /**
   * @deprecated Usar PayrollCalculationEnhancedService.calculateBatch en su lugar
   */
  static calculateBatch(inputs: PayrollCalculationInput[]): PayrollCalculationResult[] {
    console.warn('⚠️ PayrollCalculationService.calculateBatch is deprecated. Use PayrollCalculationEnhancedService.calculateBatch instead');
    
    const enhancedInputs = inputs.map(input => ({
      ...input,
      periodDate: input.periodDate || new Date()
    }));
    
    return PayrollCalculationEnhancedService.calculateBatch(enhancedInputs);
  }

  /**
   * @deprecated Usar PayrollCalculationEnhancedService.getUserConfiguredPeriodicity en su lugar
   */
  static async getUserConfiguredPeriodicity(): Promise<'quincenal' | 'mensual' | 'semanal'> {
    console.warn('⚠️ PayrollCalculationService.getUserConfiguredPeriodicity is deprecated. Use PayrollCalculationEnhancedService.getUserConfiguredPeriodicity instead');
    return PayrollCalculationEnhancedService.getUserConfiguredPeriodicity();
  }

  /**
   * @deprecated Usar PayrollCalculationEnhancedService.getConfigurationInfo en su lugar
   */
  static getConfigurationInfo(fecha: Date = new Date()) {
    console.warn('⚠️ PayrollCalculationService.getConfigurationInfo is deprecated. Use PayrollCalculationEnhancedService.getConfigurationInfo instead');
    return PayrollCalculationEnhancedService.getConfigurationInfo(fecha);
  }
}

// Re-exportar tipos del servicio mejorado para mantener compatibilidad
export type {
  PayrollCalculationInputEnhanced,
  PayrollCalculationResultEnhanced,
  ValidationResultEnhanced
} from './PayrollCalculationEnhancedService';
