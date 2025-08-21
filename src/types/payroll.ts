// Import for Novedad type - using a more flexible approach
export interface Novedad {
  id?: string;
  tipo_novedad: string;
  valor: number;
  constitutivo_salario?: boolean;
  dias?: number;
  subtipo?: string;
}

export interface PayrollEmployee extends BaseEmployeeData {
  grossPay: number;
  deductions: number;
  netPay: number;
  transportAllowance: number;
  employerContributions: number;
  ibc: number;
  status: 'valid' | 'error';
  errors: string[];
  healthDeduction: number;
  pensionDeduction: number;
  effectiveWorkedDays: number;
  incapacityDays: number;
  incapacityValue: number;
  legalBasis?: string;
  cedula?: string;
}

export interface PayrollSummary {
  totalEmployees: number;
  validEmployees: number;
  totalGrossPay: number;
  totalDeductions: number;
  totalNetPay: number;
  employerContributions: number;
  totalPayrollCost: number;
}

export interface BaseEmployeeData {
  id: string;
  name: string;
  position: string;
  baseSalary: number;
  workedDays: number;
  extraHours: number;
  disabilities: number;
  bonuses: number;
  absences: number;
  eps: string;
  afp: string;
  novedades?: Novedad[];
}

export interface NovedadForIBC {
  valor: number;
  constitutivo_salario: boolean;
  tipo_novedad: string;
  dias?: number;
  subtipo?: string;
}

export interface PayrollPeriod {
  id: string;
  periodo: string;
  fecha_inicio: string;
  fecha_fin: string;
  estado: 'borrador' | 'cerrado' | 'procesada' | 'pagada' | 'con_errores' | 'editado' | 'reabierto';
  tipo_periodo: 'quincenal' | 'mensual' | 'semanal';
  company_id: string;
  created_at?: string;
  updated_at?: string;
  year?: number;
  empleados_count?: number;
  total_neto?: number;
  periodName?: string;
  startDate?: string;
  endDate?: string;
}

export interface PeriodStatusInfo {
  status: 'borrador' | 'cerrado' | 'procesada' | 'pagada' | 'con_errores' | 'editado' | 'reabierto';
  action?: 'resume' | 'create' | 'wait';
  suggestion?: string;
  message?: string;
  currentPeriod?: PayrollPeriod;
  nextPeriod?: PayrollPeriod;
}

export type PeriodStatus = 'borrador' | 'cerrado' | 'procesada' | 'pagada' | 'con_errores' | 'editado' | 'reabierto' | PeriodStatusInfo;

export interface PayrollCalculationResult {
  grossPay: number;
  deductions: number;
  netPay: number;
  transportAllowance: number;
  employerContributions: number;
  healthDeduction: number;
  pensionDeduction: number;
  effectiveWorkedDays: number;
  incapacityDays: number;
  incapacityValue: number;
  legalBasis?: string;
}

// ✅ Add LiquidationStep type
export type LiquidationStep = 
  | 'idle'
  | 'initializing'
  | 'loading_employees' 
  | 'validating_period'
  | 'calculating_payroll'
  | 'processing_payments'
  | 'generating_reports'
  | 'finalizing'
  | 'completed'
  | 'error';
