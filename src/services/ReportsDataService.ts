
import { 
  PayrollSummaryReport, 
  LaborCostReport, 
  SocialSecurityReport, 
  IncomeRetentionCertificate, 
  NoveltyHistoryReport, 
  AccountingExport,
  ReportFilters 
} from '@/types/reports';

// Mock data - En producción vendría de Supabase
const mockPayrollSummary: PayrollSummaryReport[] = [
  {
    employeeId: '1',
    employeeName: 'Juan Pérez',
    period: '2025-01',
    totalEarnings: 2500000,
    totalDeductions: 300000,
    netPay: 2200000,
    employerContributions: 500000,
    costCenter: 'Administración'
  },
  {
    employeeId: '2',
    employeeName: 'María García',
    period: '2025-01',
    totalEarnings: 3000000,
    totalDeductions: 400000,
    netPay: 2600000,
    employerContributions: 600000,
    costCenter: 'Ventas'
  }
];

const mockLaborCosts: LaborCostReport[] = [
  {
    employeeId: '1',
    employeeName: 'Juan Pérez',
    baseSalary: 2000000,
    benefits: 300000,
    overtime: 200000,
    bonuses: 0,
    employerContributions: 500000,
    totalCost: 3000000,
    costCenter: 'Administración'
  }
];

const mockSocialSecurity: SocialSecurityReport[] = [
  {
    employeeId: '1',
    employeeName: 'Juan Pérez',
    healthEmployee: 100000,
    healthEmployer: 212500,
    pensionEmployee: 160000,
    pensionEmployer: 240000,
    arl: 10440,
    compensationBox: 80000,
    total: 802940
  }
];

export class ReportsDataService {
  static async getPayrollSummaryReport(filters: ReportFilters): Promise<PayrollSummaryReport[]> {
    // Simular llamada a API
    await new Promise(resolve => setTimeout(resolve, 1000));
    return mockPayrollSummary;
  }

  static async getLaborCostReport(filters: ReportFilters): Promise<LaborCostReport[]> {
    await new Promise(resolve => setTimeout(resolve, 1000));
    return mockLaborCosts;
  }

  static async getSocialSecurityReport(filters: ReportFilters): Promise<SocialSecurityReport[]> {
    await new Promise(resolve => setTimeout(resolve, 1000));
    return mockSocialSecurity;
  }

  static async getIncomeRetentionCertificates(year: number): Promise<IncomeRetentionCertificate[]> {
    return [
      {
        employeeId: '1',
        employeeName: 'Juan Pérez',
        year: 2024,
        totalIncome: 30000000,
        totalRetentions: 500000,
        status: 'generated',
        generatedAt: '2025-01-10T09:00:00Z'
      }
    ];
  }

  static async getNoveltyHistoryReport(filters: ReportFilters): Promise<NoveltyHistoryReport[]> {
    return [
      {
        id: '1',
        employeeId: '1',
        employeeName: 'Juan Pérez',
        type: 'overtime',
        description: 'Horas extras nocturnas',
        amount: 150000,
        hours: 8,
        date: '2025-01-15',
        status: 'approved'
      }
    ];
  }

  static async getAccountingExports(filters: ReportFilters): Promise<AccountingExport[]> {
    return [
      {
        id: '1',
        type: 'payroll',
        period: '2025-01',
        totalAmount: 5000000,
        accountingEntries: [
          { account: '510506', description: 'Sueldos y salarios', debit: 5000000, credit: 0 },
          { account: '236505', description: 'Salarios por pagar', debit: 0, credit: 5000000 }
        ],
        generatedAt: '2025-01-31T18:00:00Z'
      }
    ];
  }
}
