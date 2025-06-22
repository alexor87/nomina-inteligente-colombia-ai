
export interface PayrollHistoryPeriod {
  id: string;
  period: string;
  startDate: string;
  endDate: string;
  type: 'quincenal' | 'mensual';
  employeesCount: number;
  status: 'cerrado' | 'con_errores' | 'revision_dian' | 'editado';
  totalGrossPay: number;
  totalNetPay: number;
  pilaFileUrl?: string;
  dianStatus: 'enviado' | 'rechazado' | 'pendiente';
  paymentStatus: 'pagado' | 'parcial' | 'pendiente';
  version: number;
  originalId?: string; // Para versiones editadas
  createdAt: string;
  updatedAt: string;
  editedBy?: string;
  editReason?: string;
}

export interface PayrollHistoryEmployee {
  id: string;
  periodId: string;
  name: string;
  position: string;
  netPay: number;
  dianStatus: 'enviado' | 'rechazado' | 'pendiente';
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
  periodType?: 'quincenal' | 'mensual';
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
    dianXmls: string[];
    certificates: string[];
    reports: string[];
  };
}

export interface EditWizardSteps {
  pilaFile: {
    regenerate: boolean;
  };
  dianSubmission: {
    resend: boolean;
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
