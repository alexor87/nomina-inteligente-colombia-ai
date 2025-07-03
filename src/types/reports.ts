
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

// Updated NoveltyHistoryReport to match database types
export interface NoveltyHistoryReport {
  id: string;
  employeeId: string;
  employeeName: string;
  type: 'horas_extra' | 'recargo_nocturno' | 'vacaciones' | 'licencia_remunerada' | 'incapacidad' | 'bonificacion' | 'comision' | 'prima' | 'otros_ingresos' | 'salud' | 'pension' | 'fondo_solidaridad' | 'retencion_fuente' | 'prestamo' | 'embargo' | 'descuento_voluntario';
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

// Helper function to convert database types to display labels
export const noveltyTypeLabels: Record<string, string> = {
  'horas_extra': 'Horas Extra',
  'recargo_nocturno': 'Recargo Nocturno',
  'vacaciones': 'Vacaciones',
  'licencia_remunerada': 'Licencia Remunerada',
  'incapacidad': 'Incapacidad',
  'bonificacion': 'Bonificación',
  'comision': 'Comisión',
  'prima': 'Prima',
  'otros_ingresos': 'Otros Ingresos',
  'salud': 'Salud',
  'pension': 'Pensión',
  'fondo_solidaridad': 'Fondo Solidaridad',
  'retencion_fuente': 'Retención Fuente',
  'prestamo': 'Préstamo',
  'embargo': 'Embargo',
  'descuento_voluntario': 'Descuento Voluntario'
};

// Helper function to get badge variant for novelty types
export const getNoveltyTypeBadgeVariant = (type: string) => {
  switch (type) {
    case 'horas_extra':
    case 'recargo_nocturno':
    case 'bonificacion':
    case 'comision':
    case 'prima':
    case 'otros_ingresos':
      return 'default';
    case 'vacaciones':
    case 'licencia_remunerada':
      return 'secondary';
    case 'incapacidad':
      return 'destructive';
    case 'salud':
    case 'pension':
    case 'fondo_solidaridad':
      return 'outline';
    case 'retencion_fuente':
    case 'prestamo':
    case 'embargo':
    case 'descuento_voluntario':
      return 'destructive';
    default:
      return 'outline';
  }
};
