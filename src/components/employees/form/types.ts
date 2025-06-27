
export interface EmployeeFormData {
  // Información Personal
  cedula: string;
  tipoDocumento: 'CC' | 'TI' | 'CE' | 'PA' | 'RC' | 'NIT' | 'PEP' | 'PPT';
  nombre: string;
  segundoNombre: string;
  apellido: string;
  email: string;
  telefono: string;
  sexo: 'M' | 'F' | 'O';
  fechaNacimiento: string;
  direccion: string;
  ciudad: string;
  departamento: string;
  
  // Información Laboral
  salarioBase: number;
  tipoContrato: 'indefinido' | 'fijo' | 'obra' | 'aprendizaje';
  fechaIngreso: string;
  periodicidadPago: 'quincenal' | 'mensual';
  cargo: string;
  codigoCIIU: string;
  nivelRiesgoARL: 'I' | 'II' | 'III' | 'IV' | 'V';
  estado: 'activo' | 'inactivo' | 'vacaciones' | 'incapacidad';
  centroCostos: string;
  
  // Detalles del Contrato
  fechaFirmaContrato: string;
  fechaFinalizacionContrato: string;
  tipoJornada: 'completa' | 'parcial' | 'horas';
  diasTrabajo: number;
  horasTrabajo: number;
  beneficiosExtralegales: boolean;
  clausulasEspeciales: string;
  
  // Información Bancaria
  banco: string;
  tipoCuenta: 'ahorros' | 'corriente';
  numeroCuenta: string;
  titularCuenta: string;
  formaPago: 'dispersion' | 'manual';
  
  // Afiliaciones
  eps: string;
  afp: string;
  arl: string;
  cajaCompensacion: string;
  tipoCotizanteId: string;
  subtipoCotizanteId: string;
  regimenSalud: 'contributivo' | 'subsidiado';
  estadoAfiliacion: 'completa' | 'pendiente' | 'inconsistente';
}
