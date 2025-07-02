
import { EmployeeFormData } from './types';

export const getEmployeeFormDefaults = (): EmployeeFormData => {
  const today = new Date().toISOString().split('T')[0];
  
  return {
    // Personal Information
    cedula: '',
    tipoDocumento: 'CC',
    nombre: '',
    segundoNombre: '',
    apellido: '',
    email: '',
    telefono: '',
    sexo: 'M',
    fechaNacimiento: '',
    direccion: '',
    ciudad: '',
    departamento: '',
    
    // Labor Information
    salarioBase: 1300000, // Colombian minimum wage
    tipoContrato: 'indefinido',
    fechaIngreso: today,
    periodicidadPago: 'mensual',
    cargo: '',
    codigoCIIU: '',
    nivelRiesgoARL: 'I',
    estado: 'activo',
    centroCostos: '',
    
    // Contract Details
    fechaFirmaContrato: today,
    fechaFinalizacionContrato: '',
    tipoJornada: 'completa',
    diasTrabajo: 30,
    horasTrabajo: 8,
    beneficiosExtralegales: false,
    clausulasEspeciales: '',
    
    // Banking Information
    banco: '',
    tipoCuenta: 'ahorros',
    numeroCuenta: '',
    titularCuenta: '',
    formaPago: 'dispersion',
    
    // Affiliations
    eps: '',
    afp: '',
    arl: '',
    cajaCompensacion: '',
    tipoCotizanteId: '',
    subtipoCotizanteId: '',
    regimenSalud: 'contributivo',
    estadoAfiliacion: 'pendiente'
  };
};

// Helper to populate form with employee data
export const populateFormWithEmployee = (employee: any): EmployeeFormData => {
  const defaults = getEmployeeFormDefaults();
  
  return {
    ...defaults,
    cedula: employee.cedula || defaults.cedula,
    tipoDocumento: employee.tipoDocumento || employee.tipo_documento || defaults.tipoDocumento,
    nombre: employee.nombre || defaults.nombre,
    segundoNombre: employee.segundoNombre || employee.segundo_nombre || defaults.segundoNombre,
    apellido: employee.apellido || defaults.apellido,
    email: employee.email || defaults.email,
    telefono: employee.telefono || defaults.telefono,
    sexo: employee.sexo || defaults.sexo,
    fechaNacimiento: employee.fechaNacimiento || employee.fecha_nacimiento || defaults.fechaNacimiento,
    direccion: employee.direccion || defaults.direccion,
    ciudad: employee.ciudad || defaults.ciudad,
    departamento: employee.departamento || defaults.departamento,
    salarioBase: Number(employee.salarioBase || employee.salario_base || defaults.salarioBase),
    tipoContrato: employee.tipoContrato || employee.tipo_contrato || defaults.tipoContrato,
    fechaIngreso: employee.fechaIngreso || employee.fecha_ingreso || defaults.fechaIngreso,
    periodicidadPago: (employee.periodicidadPago || employee.periodicidad_pago || defaults.periodicidadPago) as 'quincenal' | 'mensual',
    cargo: employee.cargo || defaults.cargo,
    codigoCIIU: employee.codigoCIIU || employee.codigo_ciiu || defaults.codigoCIIU,
    nivelRiesgoARL: employee.nivelRiesgoARL || employee.nivel_riesgo_arl || defaults.nivelRiesgoARL,
    estado: employee.estado || defaults.estado,
    centroCostos: employee.centroCostos || employee.centro_costos || defaults.centroCostos,
    fechaFirmaContrato: employee.fechaFirmaContrato || employee.fecha_firma_contrato || defaults.fechaFirmaContrato,
    fechaFinalizacionContrato: employee.fechaFinalizacionContrato || employee.fecha_finalizacion_contrato || defaults.fechaFinalizacionContrato,
    tipoJornada: employee.tipoJornada || employee.tipo_jornada || defaults.tipoJornada,
    diasTrabajo: employee.diasTrabajo || employee.dias_trabajo || defaults.diasTrabajo,
    horasTrabajo: employee.horasTrabajo || employee.horas_trabajo || defaults.horasTrabajo,
    beneficiosExtralegales: employee.beneficiosExtralegales || employee.beneficios_extralegales || defaults.beneficiosExtralegales,
    clausulasEspeciales: employee.clausulasEspeciales || employee.clausulas_especiales || defaults.clausulasEspeciales,
    banco: employee.banco || defaults.banco,
    tipoCuenta: employee.tipoCuenta || employee.tipo_cuenta || defaults.tipoCuenta,
    numeroCuenta: employee.numeroCuenta || employee.numero_cuenta || defaults.numeroCuenta,
    titularCuenta: employee.titularCuenta || employee.titular_cuenta || defaults.titularCuenta,
    formaPago: employee.formaPago || employee.forma_pago || defaults.formaPago,
    eps: employee.eps || defaults.eps,
    afp: employee.afp || defaults.afp,
    arl: employee.arl || defaults.arl,
    cajaCompensacion: employee.cajaCompensacion || employee.caja_compensacion || defaults.cajaCompensacion,
    tipoCotizanteId: employee.tipoCotizanteId || employee.tipo_cotizante_id || defaults.tipoCotizanteId,
    subtipoCotizanteId: employee.subtipoCotizanteId || employee.subtipo_cotizante_id || defaults.subtipoCotizanteId,
    regimenSalud: employee.regimenSalud || employee.regimen_salud || defaults.regimenSalud,
    estadoAfiliacion: employee.estadoAfiliacion || employee.estado_afiliacion || defaults.estadoAfiliacion
  };
};
