
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
  sexo?: 'M' | 'F';
  fechaNacimiento?: string;
  direccion?: string;
  ciudad?: string;
  departamento?: string;
  
  // Labor Information - Updated to match form values
  salarioBase: number;
  tipoContrato: 'indefinido' | 'fijo' | 'obra_labor' | 'aprendizaje' | 'practicas';
  fechaIngreso: string;
  periodicidadPago: 'mensual' | 'quincenal' | 'semanal';
  cargo?: string;
  codigoCIIU?: string;
  nivelRiesgoARL?: string;
  estado: 'activo' | 'inactivo' | 'vacaciones' | 'incapacidad' | 'licencia';
  centroCostos?: string;
  fechaFirmaContrato?: string;
  fechaFinalizacionContrato?: string;
  tipoJornada: 'completa' | 'medio_tiempo' | 'por_horas' | 'flexible';
  diasTrabajo?: number;
  horasTrabajo?: number;
  beneficiosExtralegales?: boolean;
  clausulasEspeciales?: string;
  
  // Banking Information
  banco?: string;
  tipoCuenta: 'ahorros' | 'corriente';
  numeroCuenta?: string;
  titularCuenta?: string;
  formaPago: 'dispersion' | 'cheque' | 'efectivo';
  
  // Affiliations
  eps?: string;
  afp?: string;
  arl?: string;
  cajaCompensacion?: string;
  tipoCotizanteId?: string;
  subtipoCotizanteId?: string;
  regimenSalud: 'contributivo' | 'subsidiado';
  estadoAfiliacion: 'pendiente' | 'afiliado' | 'tramite';
  
  // Custom fields
  custom_fields?: Record<string, any>;
  
  // Metadata
  createdAt?: string;
  updatedAt?: string;
}
