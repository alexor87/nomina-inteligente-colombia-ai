/**
 * @deprecated Re-export stub - use PayrollCalculationService directly
 */
import { PayrollCalculationService } from './PayrollCalculationService';

export class PayrollCalculationEnhancedService extends PayrollCalculationService {
  static getUserConfiguredPeriodicity(): 'mensual' | 'quincenal' | 'semanal' {
    console.warn('⚠️ PayrollCalculationEnhancedService.getUserConfiguredPeriodicity is deprecated.');
    return 'mensual';
  }
}
