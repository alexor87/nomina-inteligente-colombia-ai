
import { Database } from '@/integrations/supabase/types';

// Extended employee status type to include 'eliminado' for logical deletion
export type EmployeeStatus = 'activo' | 'inactivo' | 'vacaciones' | 'incapacidad' | 'eliminado';

export interface EmployeeUnified {
  id: string;
  company_id: string;
  empresaId?: string; // ✅ ADDED: For backward compatibility with legacy Employee type
  nombre: string;
  apellido: string;
  segundoNombre?: string;
  cedula: string;
  tipoDocumento?: string;
  email?: string;
  telefono?: string;
  direccion?: string;
  ciudad?: string;
  departamento?: string;
  fechaNacimiento?: string;
  sexo?: string;
  
  // Employment details
  fechaIngreso: string;
  fechaFirmaContrato?: string;
  fechaFinalizacionContrato?: string;
  tipoContrato?: string;
  estado: EmployeeStatus;
  cargo?: string;
  salarioBase: number;
  periodicidadPago?: string;
  diasTrabajo?: number;
  horasTrabajo?: number;
  tipoJornada?: string;
  beneficiosExtralegales?: boolean;
  
  // Social security
  eps?: string;
  afp?: string;
  arl?: string;
  nivelRiesgoArl?: string;
  cajaCompensacion?: string;
  regimenSalud?: string;
  estadoAfiliacion?: string;
  tipoCotizanteId?: string;
  subtipoCotizanteId?: string;
  
  // Banking
  banco?: string;
  tipoCuenta?: string;
  numeroCuenta?: string;
  titularCuenta?: string;
  formaPago?: string;
  
  // Additional fields
  codigoCiiu?: string;
  centroCostos?: string;
  clausulasEspeciales?: string;
  customFields?: Record<string, any>;
  
  // Metadata - made optional to fix compatibility issues
  createdAt?: string;
  updatedAt?: string;
}

type DatabaseEmployee = Database['public']['Tables']['employees']['Row'];

export const mapDatabaseToUnified = (dbEmployee: DatabaseEmployee): EmployeeUnified => {
  return {
    id: dbEmployee.id,
    company_id: dbEmployee.company_id,
    empresaId: dbEmployee.company_id, // ✅ ADDED: Map company_id to empresaId for compatibility
    nombre: dbEmployee.nombre,
    apellido: dbEmployee.apellido,
    segundoNombre: dbEmployee.segundo_nombre || undefined,
    cedula: dbEmployee.cedula,
    tipoDocumento: dbEmployee.tipo_documento || undefined,
    email: dbEmployee.email || undefined,
    telefono: dbEmployee.telefono || undefined,
    direccion: dbEmployee.direccion || undefined,
    ciudad: dbEmployee.ciudad || undefined,
    departamento: dbEmployee.departamento || undefined,
    fechaNacimiento: dbEmployee.fecha_nacimiento || undefined,
    sexo: dbEmployee.sexo || undefined,
    
    fechaIngreso: dbEmployee.fecha_ingreso,
    fechaFirmaContrato: dbEmployee.fecha_firma_contrato || undefined,
    fechaFinalizacionContrato: dbEmployee.fecha_finalizacion_contrato || undefined,
    tipoContrato: dbEmployee.tipo_contrato || undefined,
    estado: (dbEmployee.estado as EmployeeStatus) || 'activo',
    cargo: dbEmployee.cargo || undefined,
    salarioBase: Number(dbEmployee.salario_base) || 0,
    periodicidadPago: dbEmployee.periodicidad_pago || undefined,
    diasTrabajo: dbEmployee.dias_trabajo || undefined,
    horasTrabajo: dbEmployee.horas_trabajo || undefined,
    tipoJornada: dbEmployee.tipo_jornada || undefined,
    beneficiosExtralegales: dbEmployee.beneficios_extralegales || false,
    
    eps: dbEmployee.eps || undefined,
    afp: dbEmployee.afp || undefined,
    arl: dbEmployee.arl || undefined,
    nivelRiesgoArl: dbEmployee.nivel_riesgo_arl || undefined,
    cajaCompensacion: dbEmployee.caja_compensacion || undefined,
    regimenSalud: dbEmployee.regimen_salud || undefined,
    estadoAfiliacion: dbEmployee.estado_afiliacion || undefined,
    tipoCotizanteId: dbEmployee.tipo_cotizante_id || undefined,
    subtipoCotizanteId: dbEmployee.subtipo_cotizante_id || undefined,
    
    banco: dbEmployee.banco || undefined,
    tipoCuenta: dbEmployee.tipo_cuenta || undefined,
    numeroCuenta: dbEmployee.numero_cuenta || undefined,
    titularCuenta: dbEmployee.titular_cuenta || undefined,
    formaPago: dbEmployee.forma_pago || undefined,
    
    codigoCiiu: dbEmployee.codigo_ciiu || undefined,
    centroCostos: dbEmployee.centro_costos || undefined,
    clausulasEspeciales: dbEmployee.clausulas_especiales || undefined,
    customFields: (dbEmployee.custom_fields as Record<string, any>) || {},
    
    createdAt: dbEmployee.created_at,
    updatedAt: dbEmployee.updated_at
  };
};

export const mapUnifiedToDatabase = (employee: Partial<EmployeeUnified>): Partial<DatabaseEmployee> => {
  return {
    id: employee.id,
    company_id: employee.company_id || employee.empresaId, // ✅ FIXED: Use company_id or fall back to empresaId
    nombre: employee.nombre,
    apellido: employee.apellido,
    segundo_nombre: employee.segundoNombre,
    cedula: employee.cedula,
    tipo_documento: employee.tipoDocumento,
    email: employee.email,
    telefono: employee.telefono,
    direccion: employee.direccion,
    ciudad: employee.ciudad,
    departamento: employee.departamento,
    fecha_nacimiento: employee.fechaNacimiento,
    sexo: employee.sexo,
    
    fecha_ingreso: employee.fechaIngreso,
    fecha_firma_contrato: employee.fechaFirmaContrato,
    fecha_finalizacion_contrato: employee.fechaFinalizacionContrato,
    tipo_contrato: employee.tipoContrato,
    estado: employee.estado,
    cargo: employee.cargo,
    salario_base: employee.salarioBase,
    periodicidad_pago: employee.periodicidadPago,
    dias_trabajo: employee.diasTrabajo,
    horas_trabajo: employee.horasTrabajo,
    tipo_jornada: employee.tipoJornada,
    beneficios_extralegales: employee.beneficiosExtralegales,
    
    eps: employee.eps,
    afp: employee.afp,
    arl: employee.arl,
    nivel_riesgo_arl: employee.nivelRiesgoArl,
    caja_compensacion: employee.cajaCompensacion,
    regimen_salud: employee.regimenSalud,
    estado_afiliacion: employee.estadoAfiliacion,
    tipo_cotizante_id: employee.tipoCotizanteId,
    subtipo_cotizante_id: employee.subtipoCotizanteId,
    
    banco: employee.banco,
    tipo_cuenta: employee.tipoCuenta,
    numero_cuenta: employee.numeroCuenta,
    titular_cuenta: employee.titularCuenta,
    forma_pago: employee.formaPago,
    
    codigo_ciiu: employee.codigoCiiu,
    centro_costos: employee.centroCostos,
    clausulas_especiales: employee.clausulasEspeciales,
    custom_fields: employee.customFields,
    
    created_at: employee.createdAt,
    updated_at: employee.updatedAt
  };
};
