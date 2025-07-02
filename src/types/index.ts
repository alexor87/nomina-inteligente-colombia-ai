
// Employee interface
export interface Employee {
  // Core identification
  id: string;
  cedula: string;
  tipoDocumento: 'CC' | 'TI' | 'CE' | 'PA' | 'RC' | 'NIT' | 'PEP' | 'PPT';
  
  // Personal information
  nombre: string;
  segundoNombre?: string;
  apellido: string;
  email?: string;
  telefono?: string;
  sexo?: 'M' | 'F' | 'O';
  fechaNacimiento?: string;
  direccion?: string;
  ciudad?: string;
  departamento?: string;
  
  // Company relationship
  empresaId: string;
  company_id?: string;
  
  // Labor information
  salarioBase: number;
  tipoContrato: 'indefinido' | 'fijo' | 'obra' | 'aprendizaje';
  fechaIngreso: string;
  periodicidadPago: 'quincenal' | 'mensual';
  cargo?: string;
  codigoCIIU?: string;
  nivelRiesgoARL?: 'I' | 'II' | 'III' | 'IV' | 'V';
  estado: 'activo' | 'inactivo' | 'vacaciones' | 'incapacidad';
  centroCostos?: string;
  
  // Contract details
  fechaFirmaContrato?: string;
  fechaFinalizacionContrato?: string;
  tipoJornada?: 'completa' | 'parcial' | 'horas';
  diasTrabajo?: number;
  horasTrabajo?: number;
  beneficiosExtralegales?: boolean;
  clausulasEspeciales?: string;
  
  // Banking information
  banco?: string;
  tipoCuenta?: 'ahorros' | 'corriente';
  numeroCuenta?: string;
  titularCuenta?: string;
  formaPago?: 'dispersion' | 'manual';
  
  // Affiliations
  eps?: string;
  afp?: string;
  arl?: string;
  cajaCompensacion?: string;
  tipoCotizanteId?: string;
  subtipoCotizanteId?: string;
  regimenSalud?: 'contributivo' | 'subsidiado';
  estadoAfiliacion?: 'completa' | 'pendiente' | 'inconsistente';
  
  // UI/Display properties
  avatar?: string;
  centrosocial?: string;
  ultimaLiquidacion?: string;
  contratoVencimiento?: string;
  
  // Timestamps
  createdAt?: string;
  updatedAt?: string;
}

// Payroll related types
export interface PayrollCalculation {
  salarioBase: number;
  diasTrabajados: number;
  horasExtra: number;
  recargoNocturno: number;
  recargoDominical: number;
  bonificaciones: number;
  auxilioTransporte: number;
  totalDevengado: number;
  saludEmpleado: number;
  pensionEmpleado: number;
  retencionFuente: number;
  otrasDeducciones: number;
  totalDeducciones: number;
  netoPagado: number;
  cesantias: number;
  interesesCesantias: number;
  prima: number;
  vacaciones: number;
}

export interface Payroll {
  id: string;
  employeeId: string;
  companyId: string;
  periodo: string;
  calculation: PayrollCalculation;
  estado: 'borrador' | 'procesado' | 'pagado';
  createdAt: string;
  updatedAt: string;
}

export interface LegalValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// Dashboard types
export interface DashboardMetrics {
  totalEmployees: number;
  activeEmployees: number;
  pendingPayrolls: number;
  monthlyPayrollTotal: number;
  complianceScore: number;
  alerts: number;
}
