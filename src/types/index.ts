export interface ServiceResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

export interface Employee {
  id: string;
  empresaId: string;
  company_id?: string;
  cedula: string;
  tipoDocumento: 'CC' | 'TI' | 'CE' | 'PA' | 'RC' | 'NIT' | 'PEP' | 'PPT';
  nombre: string;
  segundoNombre?: string;
  apellido: string;
  email?: string;
  telefono?: string;
  sexo?: 'M' | 'F';
  fechaNacimiento?: string;
  direccion?: string;
  ciudad?: string;
  departamento?: string;
  salarioBase: number;
  tipoContrato: 'indefinido' | 'fijo' | 'obra' | 'aprendizaje';
  fechaIngreso: string;
  periodicidadPago: 'mensual' | 'quincenal';
  cargo?: string;
  codigoCIIU?: string;
  nivelRiesgoARL?: 'I' | 'II' | 'III' | 'IV' | 'V';
  estado: 'activo' | 'inactivo' | 'vacaciones' | 'incapacidad' | 'eliminado';
  centroCostos?: string;
  fechaFirmaContrato?: string;
  fechaFinalizacionContrato?: string;
  tipoJornada: 'completa' | 'parcial' | 'horas';
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
  estadoAfiliacion?: 'completa' | 'pendiente' | 'inconsistente';
  custom_fields?: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
}

// Dashboard types
export interface DashboardMetrics {
  totalEmployees: number;
  activeEmployees: number;
  pendingPayrolls: number;
  totalPayrollCost: number; // Required
  employeeGrowth: number; // Required  
  payrollTrend: number; // Required
  monthlyPayrollTotal: number;
  complianceScore: number;
  alerts: number;
  totalEmpleados: number;
  nominasProcesadas: number;
  alertasLegales: number;
  gastosNomina: number;
  tendenciaMensual: number;
}

// Enhanced Payroll types
export interface PayrollCalculation {
  grossPay: number;
  deductions: number;
  netPay: number;
  transportAllowance: number;
  employerContributions: number;
  auxilioTransporte?: number;
  salarioBase?: number;
  diasTrabajados?: number;
  horasExtra?: number;
  recargoNocturno?: number;
  recargoDominical?: number;
  bonificaciones?: number;
}

export interface LegalValidation {
  isValid: boolean;
  violations: string[];
  warnings: string[];
  errors: string[];
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
