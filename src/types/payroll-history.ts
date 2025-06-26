
export interface PayrollHistoryPeriod {
  id: string;
  period: string;
  startDate: string;
  endDate: string;
  type: 'semanal' | 'quincenal' | 'mensual' | 'personalizado'; // Actualizado para incluir todos los tipos
  employeesCount: number;
  status: 'cerrado' | 'con_errores' | 'revision' | 'editado';
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
}

export interface PayrollHistoryEmployee {
  id: string;
  periodId: string;
  name: string;
  position: string;
  grossPay: number;
  deductions: number;
  netPay: number;
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
  periodType?: 'semanal' | 'quincenal' | 'mensual' | 'personalizado'; // Actualizado
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
