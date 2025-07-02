
// Unified Employee types to resolve inconsistencies

export interface EmployeeUnified {
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
  empresaId: string; // Made required for consistency
  company_id?: string; // For compatibility with database
  
  // Labor information
  salarioBase: number;
  tipoContrato: 'indefinido' | 'fijo' | 'obra' | 'aprendizaje';
  fechaIngreso: string;
  periodicidadPago: 'quincenal' | 'mensual'; // Made required with specific values
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

// Use EmployeeUnified as the main type for all employee operations
export type EmployeeWithStatus = EmployeeUnified;

// Helper function to convert between database and form formats
export function mapDatabaseToUnified(dbEmployee: any): EmployeeUnified {
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
    createdAt: dbEmployee.created_at || dbEmployee.createdAt,
    updatedAt: dbEmployee.updated_at || dbEmployee.updatedAt
  };
}

export function mapUnifiedToDatabase(employee: Partial<EmployeeUnified>): any {
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
