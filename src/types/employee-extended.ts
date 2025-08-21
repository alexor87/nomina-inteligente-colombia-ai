import { Employee } from '@/types';

export interface EmployeeWithStatus {
  // Core identification
  id: string;
  company_id: string;
  cedula: string;
  tipoDocumento?: string;
  
  // Personal information
  nombre: string;
  segundoNombre?: string;
  apellido: string;
  email?: string;
  telefono?: string;
  avatar?: string;
  sexo?: string;
  fechaNacimiento?: string;
  direccion?: string;
  ciudad?: string;
  departamento?: string;
  
  // Employment information
  cargo?: string;
  salarioBase: number;
  tipoContrato: string;
  fechaIngreso: string;
  estado: string;
  periodicidadPago?: string;
  codigoCIIU?: string;
  centroCostos?: string;
  centrosocial?: string;
  
  // Contract details
  fechaFirmaContrato?: string;
  fechaFinalizacionContrato?: string;
  contratoVencimiento?: string;
  tipoJornada?: string;
  diasTrabajo?: number;
  horasTrabajo?: number;
  beneficiosExtralegales?: boolean;
  clausulasEspeciales?: string;
  
  // Affiliations
  eps?: string;
  afp?: string;
  arl?: string;
  cajaCompensacion?: string;
  estadoAfiliacion: string;
  nivelRiesgoARL?: string;
  regimenSalud?: string;
  
  // Banking information
  banco?: string;
  tipoCuenta?: string;
  numeroCuenta?: string;
  titularCuenta?: string;
  formaPago?: string;
  
  // Types de cotizante
  tipoCotizanteId?: string;
  subtipoCotizanteId?: string;
  
  // Audit fields
  empresaId?: string;
  createdAt?: string;
  updatedAt?: string;
  ultimaLiquidacion?: string;
  
  // Custom fields
  custom_fields?: Record<string, any>;
}

export interface EmployeeComplianceIndicators {
  documentos: 'completo' | 'incompleto' | 'pendiente';
  afiliaciones: 'completo' | 'incompleto' | 'pendiente';
  contractual: 'completo' | 'incompleto' | 'pendiente';
}

export interface ComplianceIndicator {
  type: 'eps' | 'pension' | 'arl' | 'contrato';
  status: 'completo' | 'pendiente' | 'vencido';
  message: string;
}

export interface EmployeeFilters {
  searchTerm: string;
  estado?: string;
  tipoContrato?: string;
  centroCosto?: string;
  fechaIngresoInicio?: string;
  fechaIngresoFin?: string;
  nivelRiesgoARL?: string;
  afiliacionIncompleta?: boolean;
}

export interface EmployeeListFilters {
  searchTerm: string;
  estado: string;
  tipoContrato: string;
  cargo: string;
  eps: string;
  afp: string;
  dateRange: {
    from?: Date;
    to?: Date;
  };
}

export interface EmployeePagination {
  currentPage: number;
  itemsPerPage: number;
  totalItems: number;
  totalPages: number;
  offset: number;
}

// Estados de empleado
export const ESTADOS_EMPLEADO = [
  { value: 'activo', label: 'Activo', color: 'bg-green-100 text-green-800' },
  { value: 'inactivo', label: 'Inactivo', color: 'bg-red-100 text-red-800' },
  { value: 'vacaciones', label: 'Vacaciones', color: 'bg-blue-100 text-blue-800' },
  { value: 'incapacidad', label: 'Incapacidad', color: 'bg-yellow-100 text-yellow-800' }
];

// Centros de costo disponibles
export const CENTROS_COSTO = [
  'Administración',
  'Ventas',
  'Producción',
  'Marketing',
  'Recursos Humanos',
  'Tecnología',
  'Finanzas',
  'Operaciones'
];
