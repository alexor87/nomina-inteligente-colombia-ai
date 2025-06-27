

export interface User {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
  companyId?: string;
}

export interface Company {
  id: string;
  name: string;
  address?: string;
  city?: string;
  country?: string;
  industry?: string;
  employees?: Employee[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Employee {
  id: string;
  cedula: string;
  tipoDocumento: 'CC' | 'TI' | 'CE' | 'PA' | 'RC' | 'NIT' | 'PEP' | 'PPT';
  nombre: string;
  segundoNombre?: string;
  apellido: string;
  email: string;
  telefono?: string;
  salarioBase: number;
  tipoContrato: 'indefinido' | 'fijo' | 'obra' | 'aprendizaje';
  fechaIngreso: string;
  estado: 'activo' | 'inactivo' | 'vacaciones' | 'incapacidad';
  eps?: string;
  afp?: string;
  arl?: string;
  cajaCompensacion?: string;
  cargo?: string;
  empresaId: string;
  estadoAfiliacion: 'completa' | 'pendiente' | 'inconsistente';
  nivelRiesgoARL?: 'I' | 'II' | 'III' | 'IV' | 'V';
  createdAt?: string; // Make this optional to match EmployeeWithStatus
  updatedAt?: string;
  // Banking information
  banco?: string;
  tipoCuenta?: 'ahorros' | 'corriente';
  numeroCuenta?: string;
  titularCuenta?: string;
  // Additional fields for compatibility
  tipoCotizanteId?: string;
  subtipoCotizanteId?: string;
  // Extended fields
  sexo?: 'M' | 'F' | 'O'; // Updated to match form data type
  fechaNacimiento?: string;
  direccion?: string;
  ciudad?: string;
  departamento?: string;
  periodicidadPago?: string;
  codigoCIIU?: string;
  centroCostos?: string;
  fechaFirmaContrato?: string;
  fechaFinalizacionContrato?: string;
  tipoJornada?: string;
  diasTrabajo?: number;
  horasTrabajo?: number;
  beneficiosExtralegales?: boolean;
  clausulasEspeciales?: string;
  formaPago?: string;
  regimenSalud?: string;
  avatar?: string;
  centrosocial?: string;
  ultimaLiquidacion?: string;
  contratoVencimiento?: string;
}

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  success: boolean;
}

// Payroll types
export interface PayrollCalculation {
  salarioBase: number;
  diasTrabajados: number;
  horasExtra?: number;
  recargoNocturno?: number;
  recargoDominical?: number;
  bonificaciones?: number;
}

export interface LegalValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface Payroll {
  id: string;
  empleadoId: string;
  empresaId: string;
  periodo: string;
  estado: 'borrador' | 'procesada' | 'pagada' | 'anulada';
  salarioBase: number;
  diasTrabajados: number;
  horasExtra: number;
  recargoNocturno: number;
  recargoDominical: number;
  auxilioTransporte: number;
  bonificaciones: number;
  cesantias: number;
  interesesCesantias: number;
  prima: number;
  vacaciones: number;
  saludEmpleado: number;
  pensionEmpleado: number;
  retencionFuente: number;
  otrasDeduciones: number;
  totalDevengado: number;
  totalDeducciones: number;
  netoPagado: number;
  createdAt: string;
  updatedAt: string;
}

// Dashboard types
export interface DashboardMetrics {
  totalEmpleados: number;
  nominasProcesadas: number;
  alertasLegales: number;
  gastosNomina: number;
  tendenciaMensual: number;
}

