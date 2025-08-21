
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
  // ✅ NEW: Legal compliance fields for incapacity handling
  effectiveWorkedDays: number;
  incapacityDays: number;
  incapacityValue: number;
  legalBasis?: string;
  // ✅ NEW: cedula field for vouchers
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

// ✅ NEW: Missing PayrollPeriod type
export interface PayrollPeriod {
  id: string;
  periodo: string;
  fecha_inicio: string;
  fecha_fin: string;
  estado: PeriodStatus;
  tipo_periodo: 'quincenal' | 'mensual' | 'semanal';
  company_id: string;
  created_at?: string;
  updated_at?: string;
  year?: number;
}

// ✅ NEW: Missing PeriodStatus type
export type PeriodStatus = 'borrador' | 'cerrado' | 'procesada' | 'pagada' | 'con_errores' | 'editado' | 'reabierto';
