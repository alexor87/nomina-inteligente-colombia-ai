import { Employee, EmployeeWithStatus } from '@/types';

export class EmployeeTransformationService {
  static transformToEmployee(employee: any): Employee {
    console.log('🔄 Transforming employee:', employee);
    
    return {
      id: employee.id,
      cedula: employee.cedula,
      tipoDocumento: employee.tipoDocumento || employee.tipo_documento || 'CC',
      nombre: employee.nombre,
      segundoNombre: employee.segundoNombre || employee.segundo_nombre,
      apellido: employee.apellido,
      email: employee.email,
      telefono: employee.telefono,
      salarioBase: Number(employee.salarioBase || employee.salario_base || 0),
      tipoContrato: employee.tipoContrato || employee.tipo_contrato || 'indefinido',
      fechaIngreso: employee.fechaIngreso || employee.fecha_ingreso,
      estado: employee.estado || 'activo',
      eps: employee.eps,
      afp: employee.afp,
      arl: employee.arl,
      cajaCompensacion: employee.cajaCompensacion || employee.caja_compensacion,
      cargo: employee.cargo,
      nivelRiesgoARL: employee.nivelRiesgoARL || employee.nivel_riesgo_arl,
      periodicidadPago: employee.periodicidadPago || employee.periodicidad_pago || 'mensual',
      banco: employee.banco,
      tipoCuenta: employee.tipoCuenta || employee.tipo_cuenta || 'ahorros',
      numeroCuenta: employee.numeroCuenta || employee.numero_cuenta,
      titularCuenta: employee.titularCuenta || employee.titular_cuenta,
      formaPago: employee.formaPago || employee.forma_pago || 'dispersion',
      tipoJornada: employee.tipoJornada || employee.tipo_jornada || 'completa',
      diasTrabajo: Number(employee.diasTrabajo || employee.dias_trabajo || 30),
      horasTrabajo: Number(employee.horasTrabajo || employee.horas_trabajo || 8),
      fechaNacimiento: employee.fechaNacimiento || employee.fecha_nacimiento,
      sexo: employee.sexo,
      direccion: employee.direccion,
      ciudad: employee.ciudad,
      departamento: employee.departamento,
      centroCostos: employee.centroCostos || employee.centro_costos,
      fechaFirmaContrato: employee.fechaFirmaContrato || employee.fecha_firma_contrato,
      fechaFinalizacionContrato: employee.fechaFinalizacionContrato || employee.fecha_finalizacion_contrato,
      beneficiosExtralegales: Boolean(employee.beneficiosExtralegales || employee.beneficios_extralegales),
      clausulasEspeciales: employee.clausulasEspeciales || employee.clausulas_especiales,
      codigoCiiu: employee.codigoCiiu || employee.codigo_ciiu,
      tipoCotizanteId: employee.tipoCotizanteId || employee.tipo_cotizante_id,
      subtipoCotizanteId: employee.subtipoCotizanteId || employee.subtipo_cotizante_id,
      regimenSalud: employee.regimenSalud || employee.regimen_salud || 'contributivo',
      estadoAfiliacion: employee.estadoAfiliacion || employee.estado_afiliacion || 'pendiente',
      customFields: employee.customFields || employee.custom_fields || {},
      empresaId: employee.empresaId,
      company_id: employee.company_id,
      contratoVencimiento: employee.contratoVencimiento
    };
  }

  static transformToEmployeeWithStatus(employee: any): EmployeeWithStatus {
    console.log('🔄 Transforming employee to EmployeeWithStatus:', employee);
    
    return {
      id: employee.id,
      cedula: employee.cedula,
      tipoDocumento: employee.tipoDocumento || employee.tipo_documento || 'CC',
      nombre: employee.nombre,
      segundoNombre: employee.segundoNombre || employee.segundo_nombre,
      apellido: employee.apellido,
      email: employee.email,
      telefono: employee.telefono,
      salarioBase: Number(employee.salarioBase || employee.salario_base || 0),
      tipoContrato: employee.tipoContrato || employee.tipo_contrato || 'indefinido',
      fechaIngreso: employee.fechaIngreso || employee.fecha_ingreso,
      estado: employee.estado || 'activo',
      eps: employee.eps,
      afp: employee.afp,
      arl: employee.arl,
      cajaCompensacion: employee.cajaCompensacion || employee.caja_compensacion,
      cargo: employee.cargo,
      nivelRiesgoARL: employee.nivelRiesgoARL || employee.nivel_riesgo_arl,
      periodicidadPago: employee.periodicidadPago || employee.periodicidad_pago || 'mensual',
      banco: employee.banco,
      tipoCuenta: employee.tipoCuenta || employee.tipo_cuenta || 'ahorros',
      numeroCuenta: employee.numeroCuenta || employee.numero_cuenta,
      titularCuenta: employee.titularCuenta || employee.titular_cuenta,
      formaPago: employee.formaPago || employee.forma_pago || 'dispersion',
      tipoJornada: employee.tipoJornada || employee.tipo_jornada || 'completa',
      diasTrabajo: Number(employee.diasTrabajo || employee.dias_trabajo || 30),
      horasTrabajo: Number(employee.horasTrabajo || employee.horas_trabajo || 8),
      fechaNacimiento: employee.fechaNacimiento || employee.fecha_nacimiento,
      sexo: employee.sexo,
      direccion: employee.direccion,
      ciudad: employee.ciudad,
      departamento: employee.departamento,
      centroCostos: employee.centroCostos || employee.centro_costos,
      fechaFirmaContrato: employee.fechaFirmaContrato || employee.fecha_firma_contrato,
      fechaFinalizacionContrato: employee.fechaFinalizacionContrato || employee.fecha_finalizacion_contrato,
      beneficiosExtralegales: Boolean(employee.beneficiosExtralegales || employee.beneficios_extralegales),
      clausulasEspeciales: employee.clausulasEspeciales || employee.clausulas_especiales,
      codigoCiiu: employee.codigoCiiu || employee.codigo_ciiu,
      tipoCotizanteId: employee.tipoCotizanteId || employee.tipo_cotizante_id,
      subtipoCotizanteId: employee.subtipoCotizanteId || employee.subtipo_cotizante_id,
      regimenSalud: employee.regimenSalud || employee.regimen_salud || 'contributivo',
      estadoAfiliacion: employee.estadoAfiliacion || employee.estado_afiliacion || 'pendiente',
      customFields: employee.customFields || employee.custom_fields || {},
      contratoVencimiento: employee.contratoVencimiento,
      
      // ✅ FIXED: Ensure company_id is present
      company_id: employee.company_id || employee.empresaId || '',
      
      // Status fields
      hasExpiredContract: false,
      hasPendingDocuments: false,
      hasIncompleteAffiliations: false,
      statusFlags: []
    };
  }

  // Add other transformation methods as needed
}
