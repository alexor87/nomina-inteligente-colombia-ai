
export interface ServiceResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

export interface Employee {
  id: string;
  empresaId: string; // Added missing empresaId
  cedula: string;
  tipoDocumento?: 'CC' | 'TI' | 'CE' | 'PA' | 'RC' | 'NIT' | 'PEP' | 'PPT'; // Made specific union type
  nombre: string;
  segundoNombre?: string;
  apellido: string;
  email?: string;
  telefono?: string;
  sexo?: string;
  fechaNacimiento?: string;
  direccion?: string;
  ciudad?: string;
  departamento?: string;
  salarioBase: number;
  tipoContrato: 'indefinido' | 'fijo' | 'obra' | 'aprendizaje'; // Made specific union type
  fechaIngreso: string;
  periodicidadPago?: 'mensual' | 'quincenal'; // Made specific union type
  cargo?: string;
  codigoCIIU?: string;
  nivelRiesgoARL?: 'I' | 'II' | 'III' | 'IV' | 'V'; // Made specific union type
  estado: 'activo' | 'inactivo' | 'vacaciones' | 'incapacidad'; // Made specific union type
  centroCostos?: string;
  fechaFirmaContrato?: string;
  fechaFinalizacionContrato?: string;
  tipoJornada?: 'completa' | 'parcial' | 'horas'; // Made specific union type
  diasTrabajo?: number;
  horasTrabajo?: number;
  beneficiosExtralegales?: boolean;
  clausulasEspeciales?: string;
  banco?: string;
  tipoCuenta?: 'ahorros' | 'corriente'; // Made specific union type
  numeroCuenta?: string;
  titularCuenta?: string;
  formaPago?: 'dispersion' | 'manual'; // Made specific union type
  eps?: string;
  afp?: string;
  arl?: string;
  cajaCompensacion?: string;
  regimenSalud?: 'contributivo' | 'subsidiado'; // Made specific union type
  tipoCotizanteId?: string;
  subtipoCotizanteId?: string;
  custom_fields?: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
}

// Dashboard types
export interface DashboardMetrics {
  totalEmployees: number;
  activeEmployees: number;
  pendingPayrolls: number;
  totalPayrollCost: number;
  employeeGrowth: number;
  payrollTrend: number;
}

// Payroll types
export interface PayrollCalculation {
  grossPay: number;
  deductions: number;
  netPay: number;
  transportAllowance: number;
  employerContributions: number;
}

export interface LegalValidation {
  isValid: boolean;
  violations: string[];
  warnings: string[];
}

export interface Payroll {
  id: string;
  employeeId: string;
  period: string;
  grossPay: number;
  deductions: number;
  netPay: number;
  status: string;
}

// Liquidation types
export interface LiquidationStep {
  id: string;
  name: string;
  completed: boolean;
  hasError?: boolean;
  errorMessage?: string;
}

export interface LiquidationProgress {
  currentStep: number;
  totalSteps: number;
  steps: LiquidationStep[];
  isComplete: boolean;
}

export * from './payroll';
export * from './employee-unified';
