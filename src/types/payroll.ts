import { Novedad } from "./novedades-enhanced";

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
