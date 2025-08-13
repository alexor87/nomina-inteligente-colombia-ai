
// Updated EmployeeUnified type to match EmployeeValidationEnhancedSchema
export interface EmployeeUnified {
  id?: string;
  company_id?: string;
  empresaId?: string;
  
  // Personal Information
  cedula: string;
  tipoDocumento: 'CC' | 'TI' | 'CE' | 'PA' | 'RC' | 'NIT' | 'PEP' | 'PPT';
  nombre: string;
  segundoNombre?: string;
  apellido: string;
  email?: string;
  telefono?: string;
  sexo?: 'M' | 'F' | 'O'; // Updated to include 'O'
  fechaNacimiento?: string;
  direccion?: string;
  ciudad?: string;
  departamento?: string;
  
  // Labor Information
  salarioBase: number;
  tipoContrato: 'indefinido' | 'fijo' | 'obra' | 'aprendizaje';
  fechaIngreso: string;
  periodicidadPago: 'quincenal' | 'mensual'; // Removed 'semanal'
  cargo?: string;
  codigoCIIU?: string;
  nivelRiesgoARL?: '1' | '2' | '3' | '4' | '5'; // Updated to use numbers
  estado: 'activo' | 'inactivo' | 'vacaciones' | 'incapacidad';
  centroCostos?: string;
  
  // Contract Details
  fechaFirmaContrato?: string;
  fechaFinalizacionContrato?: string;
  tipoJornada: 'completa' | 'parcial' | 'horas'; // Replaced 'flexible' with 'horas'
  diasTrabajo: number;
  horasTrabajo: number;
  beneficiosExtralegales: boolean;
  clausulasEspeciales?: string;
  
  // Banking Information
  banco?: string;
  tipoCuenta: 'ahorros' | 'corriente';
  numeroCuenta?: string;
  titularCuenta?: string;
  formaPago: 'dispersion' | 'manual';
  
  // Affiliations
  eps?: string;
  afp?: string;
  arl?: string;
  cajaCompensacion?: string;
  tipoCotizanteId?: string;
  subtipoCotizanteId?: string;
  regimenSalud: 'contributivo' | 'subsidiado';
  estadoAfiliacion: 'completa' | 'pendiente' | 'inconsistente';
  
  // Custom fields
  custom_fields?: Record<string, any>;
  customFields?: Record<string, any>;
  
  // Timestamps
  createdAt?: string;
  updatedAt?: string;
}
