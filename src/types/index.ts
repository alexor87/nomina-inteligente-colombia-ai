
export interface ServiceResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

export interface Employee {
  id: string;
  empresaId: string;
  company_id?: string; // Added for compatibility
  cedula: string;
  tipoDocumento: 'CC' | 'TI' | 'CE' | 'PA' | 'RC' | 'NIT' | 'PEP' | 'PPT';
  nombre: string;
  segundoNombre?: string;
  apellido: string;
  email?: string;
  telefono?: string;
  sexo?: 'M' | 'F'; // Made specific union type to match EmployeeUnified
  fechaNacimiento?: string;
  direccion?: string;
  ciudad?: string;
  departamento?: string;
  salarioBase: number;
  tipoContrato: 'indefinido' | 'fijo' | 'obra' | 'aprendizaje';
  fechaIngreso: string;
  periodicidadPago?: 'mensual' | 'quincenal';
  cargo?: string;
  codigoCIIU?: string;
  nivelRiesgoARL?: 'I' | 'II' | 'III' | 'IV' | 'V';
  estado: 'activo' | 'inactivo' | 'vacaciones' | 'incapacidad' | 'eliminado'; // Added 'eliminado' for compatibility
  centroCostos?: string;
  fechaFirmaContrato?: string;
  fechaFinalizacionContrato?: string;
  tipoJornada?: 'completa' | 'parcial' | 'horas';
  diasTrabajo?: number;
  horasTrabajo?: number;
  beneficiosExtralegales?: boolean;
  clausulasEspeciales?: string;
  banco?: string;
  tipoCuenta?: 'ahorros' | 'corriente';
  numeroCuenta?: string;
  titularCuenta?: string;
  formaPago?: 'dispersion' | 'manual';
  eps?: string;
  afp?: string;
  arl?: string;
  cajaCompensacion?: string;
  regimenSalud?: 'contributivo' | 'subsidiado';
  tipoCotizanteId?: string;
  subtipoCotizanteId?: string;
  estadoAfiliacion?: 'completa' | 'pendiente' | 'inconsistente'; // Added for compatibility
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
  monthlyPayrollTotal: number; // Added missing property
  complianceScore: number;
  alerts: number;
  totalEmpleados: number; // Added missing property
  nominasProcesadas: number; // Added missing property
  alertasLegales: number;
  gastosNomina: number; // Added missing property
  tendenciaMensual: number; // Added missing property
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
