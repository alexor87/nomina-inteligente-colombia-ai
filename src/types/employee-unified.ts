
export interface EmployeeUnified {
  id: string;
  company_id?: string;
  empresaId: string; // ✅ FIXED: Make required to match Employee
  
  // Personal Information
  cedula: string;
  tipoDocumento: 'CC' | 'TI' | 'CE' | 'PA' | 'RC' | 'NIT' | 'PEP' | 'PPT';
  nombre: string;
  segundoNombre?: string;
  apellido: string;
  email?: string;
  telefono?: string;
  sexo?: 'M' | 'F'; // ✅ FIXED: Remove 'O' to match Employee
  fechaNacimiento?: string;
  direccion?: string;
  ciudad?: string;
  departamento?: string;
  
  // Labor Information - Updated to match Employee model
  salarioBase: number;
  tipoContrato: 'indefinido' | 'fijo' | 'obra' | 'aprendizaje'; // ✅ FIXED: Match Employee type
  fechaIngreso: string;
  periodicidadPago: 'mensual' | 'quincenal'; // ✅ FIXED: Remove 'semanal'
  cargo?: string;
  codigoCIIU?: string;
  nivelRiesgoARL?: 'I' | 'II' | 'III' | 'IV' | 'V'; // ✅ FIXED: Use specific type
  estado: 'activo' | 'inactivo' | 'vacaciones' | 'incapacidad'; // ✅ FIXED: Remove 'licencia'
  centroCostos?: string;
  fechaFirmaContrato?: string;
  fechaFinalizacionContrato?: string;
  tipoJornada: 'completa' | 'parcial' | 'horas'; // ✅ FIXED: Match Employee type
  diasTrabajo?: number;
  horasTrabajo?: number;
  beneficiosExtralegales?: boolean;
  clausulasEspeciales?: string;
  
  // Banking Information
  banco?: string;
  tipoCuenta: 'ahorros' | 'corriente';
  numeroCuenta?: string;
  titularCuenta?: string;
  formaPago: 'dispersion' | 'manual'; // ✅ FIXED: Match Employee type
  
  // Affiliations
  eps?: string;
  afp?: string;
  arl?: string;
  cajaCompensacion?: string;
  tipoCotizanteId?: string;
  subtipoCotizanteId?: string;
  regimenSalud: 'contributivo' | 'subsidiado';
  estadoAfiliacion: 'completa' | 'pendiente' | 'inconsistente'; // ✅ FIXED: Match Employee type
  
  // Custom fields
  custom_fields?: Record<string, any>;
  
  // Metadata
  createdAt?: string;
  updatedAt?: string;
}

// ✅ ADD: Missing mapping functions
export const mapDatabaseToUnified = (dbData: any): EmployeeUnified => {
  return {
    id: dbData.id,
    company_id: dbData.company_id,
    empresaId: dbData.company_id,
    cedula: dbData.cedula || '',
    tipoDocumento: dbData.tipo_documento || 'CC',
    nombre: dbData.nombre || '',
    segundoNombre: dbData.segundo_nombre || undefined,
    apellido: dbData.apellido || '',
    email: dbData.email || undefined,
    telefono: dbData.telefono || undefined,
    sexo: dbData.sexo || undefined,
    fechaNacimiento: dbData.fecha_nacimiento || undefined,
    direccion: dbData.direccion || undefined,
    ciudad: dbData.ciudad || undefined,
    departamento: dbData.departamento || undefined,
    salarioBase: Number(dbData.salario_base || 0),
    tipoContrato: dbData.tipo_contrato || 'indefinido',
    fechaIngreso: dbData.fecha_ingreso || new Date().toISOString().split('T')[0],
    periodicidadPago: dbData.periodicidad_pago || 'mensual',
    cargo: dbData.cargo || undefined,
    codigoCIIU: dbData.codigo_ciiu || undefined,
    nivelRiesgoARL: dbData.nivel_riesgo_arl || undefined,
    estado: dbData.estado || 'activo',
    centroCostos: dbData.centro_costos || undefined,
    fechaFirmaContrato: dbData.fecha_firma_contrato || undefined,
    fechaFinalizacionContrato: dbData.fecha_finalizacion_contrato || undefined,
    tipoJornada: dbData.tipo_jornada || 'completa',
    diasTrabajo: Number(dbData.dias_trabajo) || 30,
    horasTrabajo: Number(dbData.horas_trabajo) || 8,
    beneficiosExtralegales: Boolean(dbData.beneficios_extralegales),
    clausulasEspeciales: dbData.clausulas_especiales || undefined,
    banco: dbData.banco || undefined,
    tipoCuenta: dbData.tipo_cuenta || 'ahorros',
    numeroCuenta: dbData.numero_cuenta || undefined,
    titularCuenta: dbData.titular_cuenta || undefined,
    formaPago: dbData.forma_pago || 'dispersion',
    eps: dbData.eps || undefined,
    afp: dbData.afp || undefined,
    arl: dbData.arl || undefined,
    cajaCompensacion: dbData.caja_compensacion || undefined,
    tipoCotizanteId: dbData.tipo_cotizante_id || undefined,
    subtipoCotizanteId: dbData.subtipo_cotizante_id || undefined,
    regimenSalud: dbData.regimen_salud || 'contributivo',
    estadoAfiliacion: dbData.estado_afiliacion || 'pendiente',
    custom_fields: dbData.custom_fields || {},
    createdAt: dbData.created_at,
    updatedAt: dbData.updated_at
  };
};

export const mapUnifiedToDatabase = (unified: EmployeeUnified) => {
  return {
    company_id: unified.company_id || unified.empresaId,
    cedula: unified.cedula,
    tipo_documento: unified.tipoDocumento,
    nombre: unified.nombre,
    segundo_nombre: unified.segundoNombre || null,
    apellido: unified.apellido,
    email: unified.email || null,
    telefono: unified.telefono || null,
    sexo: unified.sexo || null,
    fecha_nacimiento: unified.fechaNacimiento || null,
    direccion: unified.direccion || null,
    ciudad: unified.ciudad || null,
    departamento: unified.departamento || null,
    salario_base: unified.salarioBase,
    tipo_contrato: unified.tipoContrato,
    fecha_ingreso: unified.fechaIngreso,
    periodicidad_pago: unified.periodicidadPago,
    cargo: unified.cargo || null,
    codigo_ciiu: unified.codigoCIIU || null,
    nivel_riesgo_arl: unified.nivelRiesgoARL || null,
    estado: unified.estado,
    centro_costos: unified.centroCostos || null,
    fecha_firma_contrato: unified.fechaFirmaContrato || null,
    fecha_finalizacion_contrato: unified.fechaFinalizacionContrato || null,
    tipo_jornada: unified.tipoJornada,
    dias_trabajo: unified.diasTrabajo || 30,
    horas_trabajo: unified.horasTrabajo || 8,
    beneficios_extralegales: unified.beneficiosExtralegales || false,
    clausulas_especiales: unified.clausulasEspeciales || null,
    banco: unified.banco || null,
    tipo_cuenta: unified.tipoCuenta,
    numero_cuenta: unified.numeroCuenta || null,
    titular_cuenta: unified.titularCuenta || null,
    forma_pago: unified.formaPago,
    eps: unified.eps || null,
    afp: unified.afp || null,
    arl: unified.arl || null,
    caja_compensacion: unified.cajaCompensacion || null,
    tipo_cotizante_id: unified.tipoCotizanteId || null,
    subtipo_cotizante_id: unified.subtipoCotizanteId || null,
    regimen_salud: unified.regimenSalud,
    estado_afiliacion: unified.estadoAfiliacion,
    custom_fields: unified.custom_fields || {}
  };
};
