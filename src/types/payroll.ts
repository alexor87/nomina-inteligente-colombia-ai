
export interface PayrollPeriod {
  id: string;
  startDate: string;
  endDate: string;
  status: 'draft' | 'in_progress' | 'closed' | 'approved';
  type: 'quincenal' | 'mensual';
}

export interface PayrollEmployee {
  id: string;
  name: string;
  position: string;
  baseSalary: number;
  workedDays: number;
  extraHours: number;
  disabilities: number;
  bonuses: number;
  absences: number;
  grossPay: number;
  deductions: number;
  netPay: number;
  status: 'valid' | 'error' | 'incomplete';
  errors: string[];
  eps?: string;
  afp?: string;
  transportAllowance: number;
  employerContributions: number;
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
  eps?: string;
  afp?: string;
}

// Nuevos tipos para la funcionalidad avanzada
export interface CompanySettings {
  id: string;
  company_id: string;
  periodicity: 'mensual' | 'quincenal' | 'semanal' | 'personalizado';
  created_at: string;
  updated_at: string;
}

export interface DBPayrollPeriod {
  id: string;
  company_id: string;
  fecha_inicio: string;
  fecha_fin: string;
  estado: 'borrador' | 'en_proceso' | 'cerrado' | 'aprobado';
  tipo_periodo: 'mensual' | 'quincenal' | 'semanal' | 'personalizado';
  modificado_por?: string;
  modificado_en?: string;
  created_at: string;
  updated_at: string;
}
