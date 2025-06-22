
export interface ReportFilters {
  dateRange?: {
    from: string;
    to: string;
  };
  employeeIds?: string[];
  costCenters?: string[];
  contractTypes?: string[];
  employeeStatus?: string[];
  noveltyTypes?: string[];
}

export interface SavedFilter {
  id: string;
  name: string;
  filters: ReportFilters;
  reportType: string;
  userId: string;
  createdAt: string;
}

export interface PayrollSummaryReport {
  employeeId: string;
  employeeName: string;
  period: string;
  totalEarnings: number;
  totalDeductions: number;
  netPay: number;
  employerContributions: number;
  costCenter?: string;
}

export interface LaborCostReport {
  employeeId: string;
  employeeName: string;
  baseSalary: number;
  benefits: number;
  overtime: number;
  bonuses: number;
  employerContributions: number;
  totalCost: number;
  costCenter?: string;
}

export interface SocialSecurityReport {
  employeeId: string;
  employeeName: string;
  healthEmployee: number;
  healthEmployer: number;
  pensionEmployee: number;
  pensionEmployer: number;
  arl: number;
  compensationBox: number;
  total: number;
}

export interface IncomeRetentionCertificate {
  employeeId: string;
  employeeName: string;
  year: number;
  totalIncome: number;
  totalRetentions: number;
  status: 'generated' | 'sent' | 'pending';
  generatedAt?: string;
  sentAt?: string;
}

export interface NoveltyHistoryReport {
  id: string;
  employeeId: string;
  employeeName: string;
  type: 'overtime' | 'incapacity' | 'license' | 'bonus' | 'advance' | 'absence';
  description: string;
  amount?: number;
  hours?: number;
  date: string;
  status: string;
}

export interface AccountingExport {
  id: string;
  type: string;
  period: string;
  totalAmount: number;
  accountingEntries: AccountingEntry[];
  generatedAt: string;
}

export interface AccountingEntry {
  account: string;
  description: string;
  debit: number;
  credit: number;
}

export interface ExportHistory {
  id: string;
  reportType: string;
  fileName: string;
  format: 'excel' | 'pdf' | 'csv';
  generatedBy: string;
  generatedAt: string;
  parameters: ReportFilters;
  downloadUrl?: string;
}

export interface ReportMetrics {
  averageCostPerEmployee: number;
  averageBenefitLoad: number;
  totalMonthlyCost: number;
  employeeCount: number;
}
