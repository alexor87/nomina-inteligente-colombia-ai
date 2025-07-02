
// Import from the main types file
import { Employee as MainEmployee } from '@/types';

// Re-export as EmployeeUnified for backward compatibility
export type EmployeeUnified = MainEmployee;
export type Employee = MainEmployee;
export type EmployeeWithStatus = MainEmployee;

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

// Helper function to convert between database and form formats
export function mapDatabaseToUnified(dbEmployee: any): MainEmployee {
  return {
    id: dbEmployee.id,
    cedula: dbEmployee.cedula || '',
    tipoDocumento: dbEmployee.tipo_documento || dbEmployee.tipoDocumento || 'CC',
    nombre: dbEmployee.nombre || '',
    segundoNombre: dbEmployee.segundo_nombre || dbEmployee.segundoNombre,
    apellido: dbEmployee.apellido || '',
    email: dbEmployee.email,
    telefono: dbEmployee.telefono,
    sexo: dbEmployee.sexo,
    fechaNacimiento: dbEmployee.fecha_nacimiento || dbEmployee.fechaNacimiento,
    direccion: dbEmployee.direccion,
    ciudad: dbEmployee.ciudad,
    departamento: dbEmployee.departamento,
    empresaId: dbEmployee.company_id || dbEmployee.empresa_id || '',
    company_id: dbEmployee.company_id || dbEmployee.empresa_id,
    salarioBase: Number(dbEmployee.salario_base || dbEmployee.salarioBase || 0),
    tipoContrato: dbEmployee.tipo_contrato || dbEmployee.tipoContrato || 'indefinido',
    fechaIngreso: dbEmployee.fecha_ingreso || dbEmployee.fechaIngreso || new Date().toISOString().split('T')[0],
    periodicidadPago: (dbEmployee.periodicidad_pago || dbEmployee.periodicidadPago || 'mensual') as 'quincenal' | 'mensual',
    cargo: dbEmployee.cargo,
    codigoCIIU: dbEmployee.codigo_ciiu || dbEmployee.codigoCIIU,
    nivelRiesgoARL: dbEmployee.nivel_riesgo_arl || dbEmployee.nivelRiesgoARL,
    estado: dbEmployee.estado || 'activo',
    centroCostos: dbEmployee.centro_costos || dbEmployee.centroCostos,
    fechaFirmaContrato: dbEmployee.fecha_firma_contrato || dbEmployee.fechaFirmaContrato,
    fechaFinalizacionContrato: dbEmployee.fecha_finalizacion_contrato || dbEmployee.fechaFinalizacionContrato,
    tipoJornada: dbEmployee.tipo_jornada || dbEmployee.tipoJornada || 'completa',
    diasTrabajo: dbEmployee.dias_trabajo || dbEmployee.diasTrabajo || 30,
    horasTrabajo: dbEmployee.horas_trabajo || dbEmployee.horasTrabajo || 8,
    beneficiosExtralegales: dbEmployee.beneficios_extralegales || dbEmployee.beneficiosExtralegales || false,
    clausulasEspeciales: dbEmployee.clausulas_especiales || dbEmployee.clausulasEspeciales,
    banco: dbEmployee.banco,
    tipoCuenta: dbEmployee.tipo_cuenta || dbEmployee.tipoCuenta || 'ahorros',
    numeroCuenta: dbEmployee.numero_cuenta || dbEmployee.numeroCuenta,
    titularCuenta: dbEmployee.titular_cuenta || dbEmployee.titularCuenta,
    formaPago: dbEmployee.forma_pago || dbEmployee.formaPago || 'dispersion',
    eps: dbEmployee.eps,
    afp: dbEmployee.afp,
    arl: dbEmployee.arl,
    cajaCompensacion: dbEmployee.caja_compensacion || dbEmployee.cajaCompensacion,
    tipoCotizanteId: dbEmployee.tipo_cotizante_id || dbEmployee.tipoCotizanteId,
    subtipoCotizanteId: dbEmployee.subtipo_cotizante_id || dbEmployee.subtipoCotizanteId,
    regimenSalud: dbEmployee.regimen_salud || dbEmployee.regimenSalud || 'contributivo',
    estadoAfiliacion: dbEmployee.estado_afiliacion || dbEmployee.estadoAfiliacion || 'pendiente',
    avatar: undefined, // Not stored in database
    centrosocial: dbEmployee.centro_costos || dbEmployee.centroCostos,
    ultimaLiquidacion: undefined,
    contratoVencimiento: dbEmployee.fecha_finalizacion_contrato || dbEmployee.fechaFinalizacionContrato,
    createdAt: dbEmployee.created_at || dbEmployee.createdAt,
    updatedAt: dbEmployee.updated_at || dbEmployee.updatedAt
  };
}

export function mapUnifiedToDatabase(employee: Partial<MainEmployee>): any {
  return {
    id: employee.id,
    cedula: employee.cedula,
    tipo_documento: employee.tipoDocumento,
    nombre: employee.nombre,
    segundo_nombre: employee.segundoNombre,
    apellido: employee.apellido,
    email: employee.email,
    telefono: employee.telefono,
    sexo: employee.sexo,
    fecha_nacimiento: employee.fechaNacimiento,
    direccion: employee.direccion,
    ciudad: employee.ciudad,
    departamento: employee.departamento,
    company_id: employee.company_id || employee.empresaId,
    salario_base: employee.salarioBase,
    tipo_contrato: employee.tipoContrato,
    fecha_ingreso: employee.fechaIngreso,
    periodicidad_pago: employee.periodicidadPago,
    cargo: employee.cargo,
    codigo_ciiu: employee.codigoCIIU,
    nivel_riesgo_arl: employee.nivelRiesgoARL,
    estado: employee.estado,
    centro_costos: employee.centroCostos,
    fecha_firma_contrato: employee.fechaFirmaContrato,
    fecha_finalizacion_contrato: employee.fechaFinalizacionContrato,
    tipo_jornada: employee.tipoJornada,
    dias_trabajo: employee.diasTrabajo,
    horas_trabajo: employee.horasTrabajo,
    beneficios_extralegales: employee.beneficiosExtralegales,
    clausulas_especiales: employee.clausulasEspeciales,
    banco: employee.banco,
    tipo_cuenta: employee.tipoCuenta,
    numero_cuenta: employee.numeroCuenta,
    titular_cuenta: employee.titularCuenta,
    forma_pago: employee.formaPago,
    eps: employee.eps,
    afp: employee.afp,
    arl: employee.arl,
    caja_compensacion: employee.cajaCompensacion,
    tipo_cotizante_id: employee.tipoCotizanteId,
    subtipo_cotizante_id: employee.subtipoCotizanteId,
    regimen_salud: employee.regimenSalud,
    estado_afiliacion: employee.estadoAfiliacion
  };
}
