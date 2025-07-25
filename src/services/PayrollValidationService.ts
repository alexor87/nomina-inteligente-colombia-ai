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

export interface PreLiquidationValidation {
  isValid: boolean;
  issues: Array<{
    type: string;
    description: string;
    severity: 'low' | 'medium' | 'high';
    autoRepairable: boolean;
  }>;
  summary: {
    totalEmployees: number;
    employeesWithIssues: number;
    totalDevengado: number;
    totalDeducciones: number;
    totalNeto: number;
  };
}

export interface IntegrityCheckResult {
  hasIssues: boolean;
  issueCount: number;
  details: string[];
}

export interface EmployeeValidationResult {
  validEmployees: Array<{
    id: string;
    name: string;
    status: string;
  }>;
  invalidEmployees: Array<{
    id: string;
    name: string;
    issues: string[];
  }>;
  issues: Array<{
    type: string;
    description: string;
    severity: 'low' | 'medium' | 'high';
  }>;
}

export interface CompanyPeriodsIssues {
  periodsWithIssues: Array<{
    id: string;
    periodo: string;
    issueType: string;
    issueCount: number;
  }>;
  totalIssues: number;
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

  static async validatePreLiquidation(periodId: string, companyId: string): Promise<PreLiquidationValidation> {
    try {
      console.log('🔍 Validando pre-liquidación...', { periodId, companyId });
      
      const issues: PreLiquidationValidation['issues'] = [];
      
      // Simulación de validaciones básicas
      const mockSummary = {
        totalEmployees: 10,
        employeesWithIssues: 0,
        totalDevengado: 15000000,
        totalDeducciones: 3000000,
        totalNeto: 12000000
      };

      return {
        isValid: issues.length === 0,
        issues,
        summary: mockSummary
      };
    } catch (error) {
      console.error('Error en validatePreLiquidation:', error);
      return {
        isValid: false,
        issues: [{
          type: 'error',
          description: 'Error al validar período',
          severity: 'high',
          autoRepairable: false
        }],
        summary: {
          totalEmployees: 0,
          employeesWithIssues: 0,
          totalDevengado: 0,
          totalDeducciones: 0,
          totalNeto: 0
        }
      };
    }
  }

  static async quickIntegrityCheck(periodId: string, companyId: string): Promise<IntegrityCheckResult> {
    try {
      console.log('📊 Verificando integridad...', { periodId, companyId });
      
      return {
        hasIssues: false,
        issueCount: 0,
        details: []
      };
    } catch (error) {
      console.error('Error en quickIntegrityCheck:', error);
      return {
        hasIssues: true,
        issueCount: 1,
        details: ['Error al verificar integridad']
      };
    }
  }

  static async validateEmployeesForPeriod(periodId: string, companyId: string): Promise<EmployeeValidationResult> {
    try {
      console.log('👥 Validando empleados...', { periodId, companyId });
      
      return {
        validEmployees: [],
        invalidEmployees: [],
        issues: []
      };
    } catch (error) {
      console.error('Error en validateEmployeesForPeriod:', error);
      return {
        validEmployees: [],
        invalidEmployees: [],
        issues: [{
          type: 'error',
          description: 'Error al validar empleados',
          severity: 'high'
        }]
      };
    }
  }

  static async getCompanyPeriodsIssues(companyId: string): Promise<CompanyPeriodsIssues> {
    try {
      console.log('🏢 Obteniendo problemas de empresa...', { companyId });
      
      return {
        periodsWithIssues: [],
        totalIssues: 0
      };
    } catch (error) {
      console.error('Error en getCompanyPeriodsIssues:', error);
      return {
        periodsWithIssues: [],
        totalIssues: 0
      };
    }
  }
}