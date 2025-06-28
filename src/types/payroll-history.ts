
export interface PayrollHistoryPeriod {
  id: string;
  period: string;
  startDate: string;
  endDate: string;
  type: 'semanal' | 'quincenal' | 'mensual' | 'personalizado';
  employeesCount: number;
  status: 'cerrado' | 'con_errores' | 'revision' | 'editado' | 'reabierto';
  totalGrossPay: number;
  totalNetPay: number;
  totalDeductions: number;
  totalCost: number;
  employerContributions: number;
  pilaFileUrl?: string;
  paymentStatus: 'pagado' | 'parcial' | 'pendiente';
  version: number;
  originalId?: string;
  createdAt: string;
  updatedAt: string;
  editedBy?: string;
  editReason?: string;
  costCenter?: string;
  editable?: boolean;
  reopenedBy?: string;
  reopenedAt?: string;
  reportedToDian?: boolean;
}

export interface PayrollHistoryEmployee {
  id: string;
  periodId: string;
  name: string;
  position: string;
  grossPay: number; // Devengado del período
  deductions: number;
  netPay: number;
  baseSalary: number; // Salario base configurado del empleado
  paymentStatus: 'pagado' | 'pendiente';
  payslipUrl?: string;
}

export interface PayrollHistoryFilters {
  dateRange: {
    from?: string;
    to?: string;
  };
  status?: string;
  costCenter?: string;
  periodType?: 'semanal' | 'quincenal' | 'mensual' | 'personalizado';
  employeeSearch?: string;
}

export interface PayrollHistoryDetails {
  period: PayrollHistoryPeriod;
  summary: {
    totalDevengado: number;
    totalDeducciones: number;
    totalNeto: number;
    costoTotal: number;
    aportesEmpleador: number;
  };
  employees: PayrollHistoryEmployee[];
  files: {
    desprendibles: string[];
    pilaFile?: string;
    certificates: string[];
    reports: string[];
  };
}

export interface EditWizardSteps {
  pilaFile: {
    regenerate: boolean;
  };
  payslips: {
    update: boolean;
  };
}

export interface ReopenPeriodData {
  periodId: string;
  reason: string;
  userId: string;
}

export interface AuditLog {
  id: string;
  periodId: string;
  action: 'created' | 'reopened' | 'edited' | 'closed' | 'exported';
  userId: string;
  userName: string;
  timestamp: string;
  details: string;
  changes?: Record<string, any>;
}

// Nuevos tipos para la funcionalidad de reapertura
export interface ReopenAuditLog {
  id: string;
  companyId: string;
  periodo: string;
  userId: string;
  userEmail: string;
  action: 'reabierto' | 'cerrado_nuevamente';
  previousState: string;
  newState: string;
  hasVouchers: boolean;
  notes?: string;
  createdAt: string;
}
