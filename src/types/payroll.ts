export interface PayrollPeriod {
  id: string;
  company_id: string;
  fecha_inicio: string;
  fecha_fin: string;
  estado: 'borrador' | 'en_proceso' | 'cerrado' | 'aprobado';
  tipo_periodo: 'quincenal' | 'mensual' | 'semanal' | 'personalizado';
  periodo: string;
  empleados_count: number;
  total_devengado: number;
  total_deducciones: number;
  total_neto: number;
  created_at: string;
  updated_at: string;
  modificado_por?: string;
  modificado_en?: string;
  numero_periodo_anual?: number;
}

// ✅ NUEVA INTERFACE: Para novedades en cálculo de IBC
export interface NovedadForIBC {
  valor: number;
  constitutivo_salario: boolean;
  tipo_novedad: string;
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
  // ✅ NUEVO CAMPO: IBC calculado incluyendo novedades
  ibc?: number;
  // ✅ NUEVO CAMPO: novedades para cálculo de IBC
  novedades?: NovedadForIBC[];
  // ✅ NUEVOS CAMPOS: Deducciones separadas para persistencia correcta
  healthDeduction: number;
  pensionDeduction: number;
  // ✅ NUEVO CAMPO: Cédula del empleado
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
  eps?: string;
  afp?: string;
  additionalDeductions?: number;
  // ✅ NUEVO CAMPO: novedades para cálculo de IBC
  novedades?: NovedadForIBC[];
}

// ✅ UNIFICACIÓN: Interfaces consolidadas para detección de períodos
export interface PeriodStatus {
  currentPeriod: any | null;
  needsCreation: boolean;
  canContinue: boolean;
  message: string;
  suggestion: string;
  action?: 'create' | 'resume' | 'wait';
  nextPeriod?: {
    startDate: string;
    endDate: string;
    periodName: string;
    type: 'semanal' | 'quincenal' | 'mensual';
  };
}

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
  periodo: string;
  empleados_count: number;
  total_devengado: number;
  total_deducciones: number;
  total_neto: number;
  modificado_por?: string;
  modificado_en?: string;
  created_at: string;
  updated_at: string;
  numero_periodo_anual?: number;
}
