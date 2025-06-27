
export const ESTADOS_EMPLEADO = [
  { value: 'activo', label: 'Activo', color: 'bg-green-100 text-green-800' },
  { value: 'inactivo', label: 'Inactivo', color: 'bg-gray-100 text-gray-800' },
  { value: 'vacaciones', label: 'En Vacaciones', color: 'bg-blue-100 text-blue-800' },
  { value: 'incapacidad', label: 'En Incapacidad', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'suspendido', label: 'Suspendido', color: 'bg-red-100 text-red-800' },
  { value: 'retirado', label: 'Retirado', color: 'bg-gray-100 text-gray-800' }
] as const;

export const CENTROS_COSTO = [
  'Administración',
  'Ventas',
  'Producción',
  'Recursos Humanos',
  'Contabilidad',
  'Tecnología',
  'Marketing',
  'Logística'
] as const;

export interface EmployeeFilters {
  searchTerm: string;
  estado: string;
  tipoContrato: string;
  centroCosto: string;
  fechaIngresoInicio: string;
  fechaIngresoFin: string;
  nivelRiesgoARL: string;
  afiliacionIncompleta?: boolean;
}

export interface ComplianceIndicator {
  type: 'eps' | 'pension' | 'arl' | 'contrato' | 'documentos';
  status: 'completo' | 'pendiente' | 'vencido' | 'inconsistente';
  message: string;
  dueDate?: string;
}

export interface EmployeeWithStatus {
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
  createdAt?: string;
  updatedAt?: string;
  // Banking information
  banco?: string;
  tipoCuenta?: 'ahorros' | 'corriente';
  numeroCuenta?: string;
  titularCuenta?: string;
  // Extended personal information - NOW COMPATIBLE WITH ALL FORM FIELDS
  sexo?: 'M' | 'F' | 'O';
  fechaNacimiento?: string;
  direccion?: string;
  ciudad?: string;
  departamento?: string;
  // Extended labor information
  periodicidadPago?: 'quincenal' | 'mensual';
  codigoCIIU?: string;
  centroCostos?: string;
  // Contract details
  fechaFirmaContrato?: string;
  fechaFinalizacionContrato?: string;
  tipoJornada?: 'completa' | 'parcial' | 'horas';
  diasTrabajo?: number;
  horasTrabajo?: number;
  beneficiosExtralegales?: boolean;
  clausulasEspeciales?: string;
  formaPago?: 'dispersion' | 'manual';
  regimenSalud?: 'contributivo' | 'subsidiado';
  // Types de cotizante
  tipoCotizanteId?: string;
  subtipoCotizanteId?: string;
  // Legacy fields for backward compatibility
  avatar?: string;
  centrosocial?: string;
  ultimaLiquidacion?: string;
  contratoVencimiento?: string;
}
