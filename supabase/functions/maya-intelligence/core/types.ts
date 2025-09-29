// ============================================================================
// MAYA Core Types - Professional Architecture
// ============================================================================

export interface MayaRequest {
  context: string;
  phase: string;
  data?: any;
  message?: string;
  conversation?: Array<{role: string, content: string}>;
  sessionId?: string;
  richContext?: RichContext;
}

export interface RichContext {
  currentPage?: string;
  pageType?: string;
  companyId?: string;
  timestamp?: string;
  dashboardData?: DashboardData;
  employeeData?: EmployeeData;
}

export interface DashboardData {
  metrics?: {
    totalEmployees?: number;
    activeEmployees?: number;
    monthlyPayroll?: number;
    pendingPayroll?: number;
  };
  payrollTrends?: Array<{
    month: string;
    total: number;
    employeeCount: number;
    avgPerEmployee: number;
  }>;
  efficiencyMetrics?: Array<{
    metric: string;
    value: number;
    unit: string;
    change: number;
  }>;
  recentActivity?: Array<{
    action: string;
    user: string;
    type: string;
  }>;
  recentEmployees?: Array<{
    name: string;
    position: string;
    status: string;
    department: string;
  }>;
}

export interface EmployeeData {
  allEmployees?: Array<{
    id: string;
    name: string;
    position: string;
    department: string;
    salary: number;
    hireDate: string;
    yearsOfService: number;
  }>;
  totalCount?: number;
  inactiveCount?: number;
  avgSalary?: number;
  byDepartment?: Record<string, {
    count: number;
    totalSalary: number;
  }>;
  recentHires?: Array<{
    name: string;
    position: string;
    hireDate: string;
  }>;
  seniorEmployees?: Array<{
    name: string;
    position: string;
    yearsOfService: number;
  }>;
}

// Intent Detection Types
export type IntentType = 
  | 'VOUCHER_SEND'
  | 'VOUCHER_MASS_SEND'
  | 'EMPLOYEE_SEARCH'
  | 'EMPLOYEE_CREATE'
  | 'EMPLOYEE_UPDATE'
  | 'EMPLOYEE_DELETE'
  | 'PAYROLL_LIQUIDATE'
  | 'VACATION_REGISTER'
  | 'ABSENCE_REGISTER'
  | 'REPORT_GENERATE'
  | 'CONVERSATION'
  | 'UNKNOWN';

export interface Intent {
  type: IntentType;
  confidence: number;
  parameters: Record<string, any>;
  requiresConfirmation: boolean;
  entities: ExtractedEntity[];
}

export interface ExtractedEntity {
  type: 'employee' | 'period' | 'amount' | 'date' | 'department' | 'report_type';
  value: string;
  confidence: number;
  resolved?: any;
}

// Handler Types
export interface HandlerResponse {
  hasExecutableAction: boolean;
  response: string;
  actions?: ExecutableAction[];
  action?: ExecutableAction;
  emotionalState?: EmotionalState;
  requiresFollowUp?: boolean;
}

export interface ExecutableAction {
  id: string;
  type: string;
  label: string;
  description?: string;
  parameters: Record<string, any>;
  requiresConfirmation?: boolean;
  icon?: string;
}

export type EmotionalState = 
  | 'neutral'
  | 'analyzing' 
  | 'celebrating'
  | 'concerned'
  | 'encouraging'
  | 'thinking';

// Service Integration Types
export interface ServiceCall {
  serviceName: string;
  methodName: string;
  parameters: Record<string, any>;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface MayaLogger {
  info(message: string, data?: any): void;
  error(message: string, error?: any): void;
  warn(message: string, data?: any): void;
}