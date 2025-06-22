
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
  },
  {
    employeeId: '3',
    employeeName: 'Carlos López',
    period: '2025-01',
    totalEarnings: 2800000,
    totalDeductions: 350000,
    netPay: 2450000,
    employerContributions: 560000,
    costCenter: 'Operaciones'
  },
  {
    employeeId: '4',
    employeeName: 'Ana Rodríguez',
    period: '2025-01',
    totalEarnings: 3200000,
    totalDeductions: 420000,
    netPay: 2780000,
    employerContributions: 640000,
    costCenter: 'Administración'
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
  },
  {
    employeeId: '2',
    employeeName: 'María García',
    baseSalary: 2500000,
    benefits: 350000,
    overtime: 150000,
    bonuses: 100000,
    employerContributions: 600000,
    totalCost: 3700000,
    costCenter: 'Ventas'
  },
  {
    employeeId: '3',
    employeeName: 'Carlos López',
    baseSalary: 2200000,
    benefits: 330000,
    overtime: 270000,
    bonuses: 50000,
    employerContributions: 560000,
    totalCost: 3410000,
    costCenter: 'Operaciones'
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
  },
  {
    employeeId: '2',
    employeeName: 'María García',
    healthEmployee: 125000,
    healthEmployer: 265625,
    pensionEmployee: 200000,
    pensionEmployer: 300000,
    arl: 13050,
    compensationBox: 100000,
    total: 1003675
  },
  {
    employeeId: '3',
    employeeName: 'Carlos López',
    healthEmployee: 110000,
    healthEmployer: 234375,
    pensionEmployee: 176000,
    pensionEmployer: 264000,
    arl: 11484,
    compensationBox: 88000,
    total: 883859
  }
];

export class ReportsDataService {
  private static applyFilters<T extends { employeeName: string; costCenter?: string }>(
    data: T[], 
    filters: ReportFilters
  ): T[] {
    let filteredData = [...data];

    // Filtro por empleados
    if (filters.employeeIds && filters.employeeIds.length > 0) {
      filteredData = filteredData.filter(item => 
        filters.employeeIds!.some(id => item.employeeName.toLowerCase().includes(id.toLowerCase()))
      );
    }

    // Filtro por centro de costo
    if (filters.costCenters && filters.costCenters.length > 0) {
      filteredData = filteredData.filter(item => 
        item.costCenter && filters.costCenters!.includes(item.costCenter)
      );
    }

    // Filtro por rango de fechas (simulado - en producción se consultaría la BD)
    if (filters.dateRange) {
      // En un caso real, aquí se filtrarían los registros por fecha
      console.log('Filtering by date range:', filters.dateRange);
    }

    return filteredData;
  }

  static async getPayrollSummaryReport(filters: ReportFilters): Promise<PayrollSummaryReport[]> {
    // Simular llamada a API
    await new Promise(resolve => setTimeout(resolve, 1000));
    return this.applyFilters(mockPayrollSummary, filters);
  }

  static async getLaborCostReport(filters: ReportFilters): Promise<LaborCostReport[]> {
    await new Promise(resolve => setTimeout(resolve, 1000));
    return this.applyFilters(mockLaborCosts, filters);
  }

  static async getSocialSecurityReport(filters: ReportFilters): Promise<SocialSecurityReport[]> {
    await new Promise(resolve => setTimeout(resolve, 1000));
    return this.applyFilters(mockSocialSecurity, filters);
  }

  static async getIncomeRetentionCertificates(year: number): Promise<IncomeRetentionCertificate[]> {
    return [
      {
        employeeId: '1',
        employeeName: 'Juan Pérez',
        year: year,
        totalIncome: 30000000,
        totalRetentions: 500000,
        status: 'generated',
        generatedAt: '2025-01-10T09:00:00Z'
      },
      {
        employeeId: '2',
        employeeName: 'María García',
        year: year,
        totalIncome: 36000000,
        totalRetentions: 750000,
        status: 'sent',
        generatedAt: '2025-01-10T09:00:00Z',
        sentAt: '2025-01-12T14:30:00Z'
      },
      {
        employeeId: '3',
        employeeName: 'Carlos López',
        year: year,
        totalIncome: 33600000,
        totalRetentions: 650000,
        status: 'pending'
      }
    ];
  }

  static async getNoveltyHistoryReport(filters: ReportFilters): Promise<NoveltyHistoryReport[]> {
    const mockData = [
      {
        id: '1',
        employeeId: '1',
        employeeName: 'Juan Pérez',
        type: 'overtime' as const,
        description: 'Horas extras nocturnas',
        amount: 150000,
        hours: 8,
        date: '2025-01-15',
        status: 'approved'
      },
      {
        id: '2',
        employeeId: '2',
        employeeName: 'María García',
        type: 'bonus' as const,
        description: 'Bono por cumplimiento de metas',
        amount: 200000,
        date: '2025-01-20',
        status: 'approved'
      },
      {
        id: '3',
        employeeId: '1',
        employeeName: 'Juan Pérez',
        type: 'incapacity' as const,
        description: 'Incapacidad médica',
        amount: -100000,
        hours: 24,
        date: '2025-01-10',
        status: 'approved'
      },
      {
        id: '4',
        employeeId: '3',
        employeeName: 'Carlos López',
        type: 'advance' as const,
        description: 'Anticipo de nómina',
        amount: 300000,
        date: '2025-01-05',
        status: 'pending'
      }
    ];

    // Filtrar por tipo de novedad si está especificado
    let filteredData = mockData;
    if (filters.noveltyTypes && filters.noveltyTypes.length > 0) {
      filteredData = mockData.filter(item => filters.noveltyTypes!.includes(item.type));
    }

    return this.applyFilters(filteredData, filters);
  }

  static async getAccountingExports(filters: ReportFilters): Promise<AccountingExport[]> {
    return [
      {
        id: '1',
        type: 'payroll',
        period: '2025-01',
        totalAmount: 11830000,
        accountingEntries: [
          { account: '510506', description: 'Sueldos y salarios', debit: 11830000, credit: 0 },
          { account: '237005', description: 'Salarios por pagar', debit: 0, credit: 11830000 },
          { account: '510515', description: 'Aportes patronales', debit: 2260000, credit: 0 },
          { account: '237010', description: 'Aportes por pagar', debit: 0, credit: 2260000 }
        ],
        generatedAt: '2025-01-31T18:00:00Z'
      },
      {
        id: '2',
        type: 'social_security',
        period: '2025-01',
        totalAmount: 2690474,
        accountingEntries: [
          { account: '237006', description: 'EPS por pagar', debit: 0, credit: 843750 },
          { account: '237007', description: 'Pensión por pagar', debit: 0, credit: 1100000 },
          { account: '237008', description: 'ARL por pagar', debit: 0, credit: 34974 },
          { account: '237009', description: 'Caja compensación por pagar', debit: 0, credit: 268000 },
          { account: '510520', description: 'Seguridad social patronal', debit: 2246724, credit: 0 }
        ],
        generatedAt: '2025-01-31T19:00:00Z'
      }
    ];
  }
}
