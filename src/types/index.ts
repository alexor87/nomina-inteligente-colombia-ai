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
  periodicidadPago: 'quincenal' | 'mensual'; // Fixed: made it specific union type
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
  
  // Timestamps
  createdAt?: string;
  updatedAt?: string;
}
