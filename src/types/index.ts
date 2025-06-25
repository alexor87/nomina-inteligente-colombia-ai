
// Tipos principales de la aplicación
export interface Employee {
  id: string;
  cedula: string;
  tipoDocumento: 'CC' | 'TI' | 'CE' | 'PA' | 'RC' | 'NIT' | 'PEP' | 'PPT';
  nombre: string;
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
  createdAt: string;
  updatedAt: string;
}

export interface Company {
  id: string;
  nit: string;
  razonSocial: string;
  email: string;
  telefono?: string;
  direccion?: string;
  ciudad?: string;
  representanteLegal?: string;
  actividadEconomica?: string;
  empleadosCount: number;
  plan: 'basico' | 'profesional' | 'empresarial';
  estado: 'activa' | 'suspendida' | 'inactiva';
  createdAt: string;
  updatedAt: string;
}

export interface Payroll {
  id: string;
  empleadoId: string;
  empresaId: string;
  periodo: string; // YYYY-MM
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
  // Deducciones
  saludEmpleado: number;
  pensionEmpleado: number;
  retencionFuente: number;
  otrasDeduciones: number;
  // Totales
  totalDevengado: number;
  totalDeducciones: number;
  netoPagado: number;
  estado: 'borrador' | 'procesada' | 'pagada';
  createdAt: string;
  updatedAt: string;
}

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

export interface DashboardMetrics {
  totalEmpleados: number;
  nominasProcesadas: number;
  alertasLegales: number;
  gastosNomina: number;
  tendenciaMensual: number;
}

export interface User {
  id: string;
  email: string;
  role: 'admin' | 'company' | 'employee';
  companyId?: string;
  profile?: {
    firstName: string;
    lastName: string;
    avatar?: string;
  };
}
