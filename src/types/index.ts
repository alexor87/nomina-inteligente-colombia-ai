
export interface ServiceResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

export interface Employee {
  id: string;
  cedula: string;
  tipoDocumento?: string;
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
  tipoContrato: string;
  fechaIngreso: string;
  periodicidadPago?: string;
  cargo?: string;
  codigoCIIU?: string;
  nivelRiesgoARL?: string;
  estado: string;
  centroCostos?: string;
  fechaFirmaContrato?: string;
  fechaFinalizacionContrato?: string;
  tipoJornada?: string;
  diasTrabajo?: number;
  horasTrabajo?: number;
  beneficiosExtralegales?: boolean;
  clausulasEspeciales?: string;
  banco?: string;
  tipoCuenta?: string;
  numeroCuenta?: string;
  titularCuenta?: string;
  formaPago?: string;
  eps?: string;
  afp?: string;
  arl?: string;
  cajaCompensacion?: string;
  regimenSalud?: string;
  tipoCotizanteId?: string;
  subtipoCotizanteId?: string;
  custom_fields?: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
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
