
import { Employee } from './index';

export interface EmployeeWithStatus extends Employee {
  centrosocial?: string;
  nivelRiesgoARL?: 'I' | 'II' | 'III' | 'IV' | 'V';
  estadoAfiliacion: 'completa' | 'pendiente' | 'inconsistente';
  ultimaLiquidacion?: string;
  contratoVencimiento?: string;
  fechaUltimaModificacion?: string;
  usuarioUltimaModificacion?: string;
  avatar?: string;
  // Banking information
  banco?: string;
  tipoCuenta?: 'ahorros' | 'corriente';
  numeroCuenta?: string;
  titularCuenta?: string;
  // Status fields that are calculated/added by the service
  payrollStatus?: string;
  alertCount?: number;
  ultimoProcesamientoNomina?: string;
  proximoVencimientoContrato?: string | null;
  diasDesdeUltimaRevision?: number;
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

export interface ComplianceIndicator {
  type: 'eps' | 'pension' | 'arl' | 'contrato';
  status: 'completo' | 'pendiente' | 'vencido';
  message: string;
}

export const ESTADOS_EMPLEADO = [
  { value: 'activo', label: 'Activo', color: 'bg-green-100 text-green-800' },
  { value: 'vacaciones', label: 'Vacaciones', color: 'bg-blue-100 text-blue-800' },
  { value: 'licencia', label: 'Licencia', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'retirado', label: 'Retirado', color: 'bg-red-100 text-red-800' },
  { value: 'inactivo', label: 'Inactivo', color: 'bg-gray-100 text-gray-800' }
];

export const CENTROS_COSTO = [
  'Administración',
  'Comercial',
  'Producción',
  'Tecnología',
  'Recursos Humanos',
  'Contabilidad'
];
