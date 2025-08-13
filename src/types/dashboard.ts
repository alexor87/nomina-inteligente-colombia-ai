
export interface DashboardMetrics {
  totalEmployees: number;
  activeEmployees: number;
  inactiveEmployees: number;
  pendingActions: number;
  totalPayroll: number;
  averageSalary: number;
  complianceRate: number;
  recentHires: number;
}

export interface PayrollCalculation {
  employeeId: string;
  grossSalary: number;
  deductions: {
    health: number;
    pension: number;
    taxes: number;
    other: number;
  };
  additions: {
    overtime: number;
    bonuses: number;
    allowances: number;
  };
  netSalary: number;
  period: string;
}

export interface LegalValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  complianceLevel: 'high' | 'medium' | 'low';
}

export interface Payroll {
  id: string;
  period: string;
  status: 'draft' | 'calculated' | 'approved' | 'paid';
  employees: PayrollCalculation[];
  totalGross: number;
  totalNet: number;
  createdAt: string;
  approvedAt?: string;
  paidAt?: string;
}
