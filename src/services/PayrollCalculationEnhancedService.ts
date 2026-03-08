/**
 * @deprecated Use PayrollCalculationService directly
 */
import { PayrollCalculationService } from './PayrollCalculationService';

export class PayrollCalculationEnhancedService extends PayrollCalculationService {
  static getUserConfiguredPeriodicity(): 'mensual' | 'quincenal' | 'semanal' {
    return 'mensual';
  }
}
