
import { PayrollPeriodService } from './PayrollPeriodService';
import { PayrollPeriod } from '@/types/payroll';
import { PayrollConfigurationService } from './payroll-intelligent/PayrollConfigurationService';
import { PayrollPeriodDetectionService, PeriodStatus } from './payroll-intelligent/PayrollPeriodDetectionService';
import { PayrollPeriodValidationService } from './payroll-intelligent/PayrollPeriodValidationService';
import { PayrollAuditService } from './payroll-intelligent/PayrollAuditService';

export type { PeriodStatus } from './payroll-intelligent/PayrollPeriodDetectionService';

export class PayrollPeriodIntelligentService {
  // Detectar estado inteligente del módulo de nómina
  static async detectPeriodStatus(): Promise<PeriodStatus> {
    return PayrollPeriodDetectionService.detectPeriodStatus();
  }

  // Método para invalidar cache manualmente
  static invalidateConfigurationCache(companyId?: string) {
    PayrollConfigurationService.invalidateConfigurationCache(companyId);
  }

  // Crear nuevo periodo inteligentemente
  static async createNextPeriod(nextPeriod: { startDate: string; endDate: string; type: string }): Promise<PayrollPeriod | null> {
    try {
      console.log('🚀 Creando nuevo periodo:', nextPeriod);
      
      const newPeriod = await PayrollPeriodService.createPayrollPeriod(
        nextPeriod.startDate,
        nextPeriod.endDate,
        nextPeriod.type
      );

      if (newPeriod) {
        // Registrar en logs de auditoría
        await PayrollAuditService.logPeriodAction('create_period', newPeriod.id, {
          startDate: nextPeriod.startDate,
          endDate: nextPeriod.endDate,
          type: nextPeriod.type
        });
      }

      return newPeriod;
    } catch (error) {
      console.error('❌ Error creando nuevo periodo:', error);
      return null;
    }
  }

  // Validar que no haya periodos superpuestos
  static async validateNonOverlappingPeriod(
    startDate: string, 
    endDate: string, 
    excludePeriodId?: string
  ): Promise<{ isValid: boolean; conflictPeriod?: PayrollPeriod }> {
    return PayrollPeriodValidationService.validateNonOverlappingPeriod(
      startDate, 
      endDate, 
      excludePeriodId
    );
  }

  // Forzar refresh de configuración
  static async forceRefreshConfiguration(companyId: string) {
    return PayrollConfigurationService.forceRefreshConfiguration(companyId);
  }
}
