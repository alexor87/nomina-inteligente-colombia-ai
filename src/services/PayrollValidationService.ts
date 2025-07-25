import { PayrollEmployee } from '@/types/payroll';
import { ValidationIssue } from '@/components/payroll/liquidation/PayrollValidationAlert';

export interface PayrollValidationResults {
  hasIncompleteNovelties: boolean;
  hasUnusualAmounts: boolean;
  legalCompliance: boolean;
  issues: string[];
  validationIssues: ValidationIssue[];
  canProceed: boolean;
}

export class PayrollValidationService {
  private static readonly MIN_SALARY = 1300000;

  static async validatePayrollPeriod(
    employees: PayrollEmployee[],
    periodId: string,
    startDate: string,
    endDate: string
  ): Promise<PayrollValidationResults> {
    const issues: string[] = [];
    const validationIssues: ValidationIssue[] = [];

    if (employees.length === 0) {
      issues.push('No hay empleados para liquidar');
      validationIssues.push({
        type: 'error',
        title: 'Sin empleados',
        description: 'No se han cargado empleados para este período',
        canAutoFix: false
      });
    }

    const hasErrors = validationIssues.some(issue => issue.type === 'error');

    return {
      hasIncompleteNovelties: false,
      hasUnusualAmounts: false,
      legalCompliance: true,
      issues,
      validationIssues,
      canProceed: !hasErrors
    };
  }
}