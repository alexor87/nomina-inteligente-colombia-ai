
/**
 * ⚠️ SERVICIO MARCADO COMO OBSOLETO - REPARACIÓN CRÍTICA
 * Este servicio será reemplazado por PayrollDomainService
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
}
