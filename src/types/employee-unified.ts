
// Updated EmployeeUnified type to match EmployeeValidationEnhancedSchema
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
  sexo?: 'M' | 'F' | 'O';
  fechaNacimiento?: string;
  direccion?: string;
  ciudad?: string;
  departamento?: string;
  
  // Labor Information
  salarioBase: number;
  tipoContrato: 'indefinido' | 'fijo' | 'obra' | 'aprendizaje';
  fechaIngreso: string;
  periodicidadPago: 'quincenal' | 'mensual';
  cargo?: string;
  codigoCIIU?: string;
  nivelRiesgoARL?: '1' | '2' | '3' | '4' | '5';
  estado: 'activo' | 'inactivo' | 'vacaciones' | 'incapacidad';
  centroCostos?: string;
  
  // Contract Details
  fechaFirmaContrato?: string;
  fechaFinalizacionContrato?: string;
  tipoJornada: 'completa' | 'parcial' | 'horas';
  diasTrabajo: number;
  horasTrabajo: number;
  beneficiosExtralegales: boolean;
  clausulasEspeciales?: string;
  
  // Banking Information
  banco?: string;
  tipoCuenta: 'ahorros' | 'corriente';
  numeroCuenta?: string;
  titularCuenta?: string;
  formaPago: 'dispersion' | 'manual';
  
  // Affiliations
  eps?: string;
  afp?: string;
  arl?: string;
  cajaCompensacion?: string;
  tipoCotizanteId?: string;
  subtipoCotizanteId?: string;
  regimenSalud: 'contributivo' | 'subsidiado';
  estadoAfiliacion: 'completa' | 'pendiente' | 'inconsistente';
  
  // Custom fields
  custom_fields?: Record<string, any>;
  customFields?: Record<string, any>;
  
  // Timestamps
  createdAt?: string;
  updatedAt?: string;
}

// Helper functions for mapping between database and unified format
export const mapDatabaseToUnified = (dbData: any): EmployeeUnified => {
  const convertARLLevel = (level?: string): '1' | '2' | '3' | '4' | '5' | undefined => {
    if (!level) return undefined;
    const romanToNumber: { [key: string]: '1' | '2' | '3' | '4' | '5' } = {
      'I': '1',
      'II': '2',
      'III': '3',
      'IV': '4',
      'V': '5'
    };
    return romanToNumber[level] || level as '1' | '2' | '3' | '4' | '5';
  };

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
    nivelRiesgoARL: convertARLLevel(dbData.nivel_riesgo_arl),
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

export const mapUnifiedToDatabase = (employeeData: EmployeeUnified) => {
  const convertARLLevel = (level?: string) => {
    if (!level) return null;
    const numberToRoman: { [key: string]: string } = {
      '1': 'I',
      '2': 'II',
      '3': 'III',
      '4': 'IV',
      '5': 'V'
    };
    return numberToRoman[level] || level;
  };

  return {
    company_id: employeeData.company_id || employeeData.empresaId,
    cedula: employeeData.cedula,
    tipo_documento: employeeData.tipoDocumento,
    nombre: employeeData.nombre,
    segundo_nombre: employeeData.segundoNombre || null,
    apellido: employeeData.apellido,
    email: employeeData.email || null,
    telefono: employeeData.telefono || null,
    sexo: employeeData.sexo || null,
    fecha_nacimiento: employeeData.fechaNacimiento || null,
    direccion: employeeData.direccion || null,
    ciudad: employeeData.ciudad || null,
    departamento: employeeData.departamento || null,
    salario_base: employeeData.salarioBase,
    tipo_contrato: employeeData.tipoContrato,
    fecha_ingreso: employeeData.fechaIngreso,
    periodicidad_pago: employeeData.periodicidadPago,
    cargo: employeeData.cargo || null,
    codigo_ciiu: employeeData.codigoCIIU || null,
    nivel_riesgo_arl: convertARLLevel(employeeData.nivelRiesgoARL),
    estado: employeeData.estado,
    centro_costos: employeeData.centroCostos || null,
    fecha_firma_contrato: employeeData.fechaFirmaContrato || null,
    fecha_finalizacion_contrato: employeeData.fechaFinalizacionContrato || null,
    tipo_jornada: employeeData.tipoJornada,
    dias_trabajo: employeeData.diasTrabajo,
    horas_trabajo: employeeData.horasTrabajo,
    beneficios_extralegales: employeeData.beneficiosExtralegales,
    clausulas_especiales: employeeData.clausulasEspeciales || null,
    banco: employeeData.banco || null,
    tipo_cuenta: employeeData.tipoCuenta,
    numero_cuenta: employeeData.numeroCuenta || null,
    titular_cuenta: employeeData.titularCuenta || null,
    forma_pago: employeeData.formaPago,
    eps: employeeData.eps || null,
    afp: employeeData.afp || null,
    arl: employeeData.arl || null,
    caja_compensacion: employeeData.cajaCompensacion || null,
    tipo_cotizante_id: employeeData.tipoCotizanteId || null,
    subtipo_cotizante_id: employeeData.subtipoCotizanteId || null,
    regimen_salud: employeeData.regimenSalud,
    estado_afiliacion: employeeData.estadoAfiliacion,
    custom_fields: employeeData.custom_fields || {}
  };
};
