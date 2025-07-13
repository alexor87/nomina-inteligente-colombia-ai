
/**
 * ⚠️ SERVICIO MARCADO COMO OBSOLETO - MIGRACIÓN A BACKEND
 * Este servicio será reemplazado por cálculos del backend
 */

import { PayrollDomainService } from './PayrollDomainService';

export class PayrollUnifiedService {
  /**
   * @deprecated Usar PayrollDomainService.detectCurrentPeriodSituation()
   */
  static async detectCurrentPeriodSituation() {
    console.warn('⚠️ PayrollUnifiedService.detectCurrentPeriodSituation está obsoleto. Usar PayrollDomainService');
    return PayrollDomainService.detectCurrentPeriodSituation();
  }

  /**
   * @deprecated Usar PayrollDomainService.createNextPeriod()
   */
  static async createNextPeriod() {
    console.warn('⚠️ PayrollUnifiedService.createNextPeriod está obsoleto. Usar PayrollDomainService');
    return PayrollDomainService.createNextPeriod();
  }

  /**
   * @deprecated Usar PayrollDomainService.closePeriod()
   */
  static async closePeriod(periodId: string) {
    console.warn('⚠️ PayrollUnifiedService.closePeriod está obsoleto. Usar PayrollDomainService');
    return PayrollDomainService.closePeriod(periodId);
  }

  /**
   * @deprecated Usar PayrollDomainService.getPayrollHistory()
   */
  static async getPayrollHistory() {
    console.warn('⚠️ PayrollUnifiedService.getPayrollHistory está obsoleto. Usar PayrollDomainService');
    return PayrollDomainService.getPayrollHistory();
  }

  /**
   * ⚠️ FUNCIÓN MARCADA PARA MIGRACIÓN
   * Los cálculos de novedades ahora se realizan en el backend via Edge Function
   * @deprecated Usar useNovedadBackendCalculation hook en su lugar
   */
  static calculateNovedad(tipoNovedad: string, subtipo: string, salario: number, horas?: number, dias?: number) {
    console.warn('⚠️ PayrollUnifiedService.calculateNovedad está obsoleto. Usar useNovedadBackendCalculation hook');
    console.warn('⚠️ Todos los cálculos de novedades ahora se realizan en el backend para mayor consistencia');
    
    // Retornar valor básico para evitar errores durante la migración
    return {
      valor: 0,
      detalleCalculo: 'Usar backend calculation service',
      factorCalculo: 0
    };
  }
}
