
import { Employee, EmployeeWithStatus } from '@/types';

export class EmployeeTransformationService {
  static transformToEmployee(employee: any): Employee {
    console.log('🔄 Transforming employee:', employee);
    
    return {
      id: employee.id,
      cedula: employee.cedula,
      tipoDocumento: (employee.tipoDocumento || employee.tipo_documento || 'CC') as 'CC' | 'TI' | 'CE' | 'PA' | 'RC' | 'NIT' | 'PEP' | 'PPT', // ✅ FIXED: Type casting
      nombre: employee.nombre,
      segundoNombre: employee.segundoNombre || employee.segundo_nombre,
      apellido: employee.apellido,
      email: employee.email,
      telefono: employee.telefono,
      salarioBase: Number(employee.salarioBase || employee.salario_base || 0),
      tipoContrato: (employee.tipoContrato || employee.tipo_contrato || 'indefinido') as 'indefinido' | 'fijo' | 'obra' | 'aprendizaje', // ✅ FIXED: Type casting
      fechaIngreso: employee.fechaIngreso || employee.fecha_ingreso,
      estado: (employee.estado || 'activo') as 'activo' | 'inactivo' | 'vacaciones' | 'incapacidad' | 'eliminado', // ✅ FIXED: Type casting
      eps: employee.eps,
      afp: employee.afp,
      arl: employee.arl,
      cajaCompensacion: employee.cajaCompensacion || employee.caja_compensacion,
      cargo: employee.cargo,
      nivelRiesgoARL: (employee.nivelRiesgoARL || employee.nivel_riesgo_arl) as 'I' | 'II' | 'III' | 'IV' | 'V' | undefined, // ✅ FIXED: Type casting
      periodicidadPago: (employee.periodicidadPago || employee.periodicidad_pago || 'mensual') as 'quincenal' | 'mensual', // ✅ FIXED: Type casting
      banco: employee.banco,
      tipoCuenta: (employee.tipoCuenta || employee.tipo_cuenta || 'ahorros') as 'ahorros' | 'corriente', // ✅ FIXED: Type casting
      numeroCuenta: employee.numeroCuenta || employee.numero_cuenta,
      titularCuenta: employee.titularCuenta || employee.titular_cuenta,
      formaPago: (employee.formaPago || employee.forma_pago || 'dispersion') as 'dispersion' | 'manual', // ✅ FIXED: Type casting
      tipoJornada: (employee.tipoJornada || employee.tipo_jornada || 'completa') as 'completa' | 'parcial' | 'horas', // ✅ FIXED: Type casting
      diasTrabajo: Number(employee.diasTrabajo || employee.dias_trabajo || 30),
      horasTrabajo: Number(employee.horasTrabajo || employee.horas_trabajo || 8),
      fechaNacimiento: employee.fechaNacimiento || employee.fecha_nacimiento,
      sexo: (employee.sexo) as 'M' | 'F' | undefined, // ✅ FIXED: Type casting
      direccion: employee.direccion,
      ciudad: employee.ciudad,
      departamento: employee.departamento,
      centroCostos: employee.centroCostos || employee.centro_costos,
      fechaFirmaContrato: employee.fechaFirmaContrato || employee.fecha_firma_contrato,
      fechaFinalizacionContrato: employee.fechaFinalizacionContrato || employee.fecha_finalizacion_contrato,
      beneficiosExtralegales: Boolean(employee.beneficiosExtralegales || employee.beneficios_extralegales),
      clausulasEspeciales: employee.clausulasEspeciales || employee.clausulas_especiales,
      codigoCIIU: employee.codigoCIIU || employee.codigo_ciiu, // ✅ FIXED: Use correct property name for Employee type
      tipoCotizanteId: employee.tipoCotizanteId || employee.tipo_cotizante_id,
      subtipoCotizanteId: employee.subtipoCotizanteId || employee.subtipo_cotizante_id,
      regimenSalud: (employee.regimenSalud || employee.regimen_salud || 'contributivo') as 'contributivo' | 'subsidiado', // ✅ FIXED: Type casting
      estadoAfiliacion: (employee.estadoAfiliacion || employee.estado_afiliacion || 'pendiente') as 'completa' | 'pendiente' | 'inconsistente', // ✅ FIXED: Type casting
      custom_fields: employee.customFields || employee.custom_fields || {}, // ✅ FIXED: Use correct property name
      empresaId: employee.empresaId || employee.company_id,
      company_id: employee.company_id,
      contratoVencimiento: employee.contratoVencimiento
    };
  }

  static transformToEmployeeWithStatus(employee: any): EmployeeWithStatus {
    console.log('🔄 Transforming employee to EmployeeWithStatus:', employee);
    
    return {
      id: employee.id,
      cedula: employee.cedula,
      tipoDocumento: (employee.tipoDocumento || employee.tipo_documento || 'CC') as 'CC' | 'TI' | 'CE' | 'PA' | 'RC' | 'NIT' | 'PEP' | 'PPT',
      nombre: employee.nombre,
      segundoNombre: employee.segundoNombre || employee.segundo_nombre,
      apellido: employee.apellido,
      email: employee.email,
      telefono: employee.telefono,
      salarioBase: Number(employee.salarioBase || employee.salario_base || 0),
      tipoContrato: (employee.tipoContrato || employee.tipo_contrato || 'indefinido') as 'indefinido' | 'fijo' | 'obra' | 'aprendizaje',
      fechaIngreso: employee.fechaIngreso || employee.fecha_ingreso,
      estado: (employee.estado || 'activo') as 'activo' | 'inactivo' | 'vacaciones' | 'incapacidad' | 'eliminado',
      eps: employee.eps,
      afp: employee.afp,
      arl: employee.arl,
      cajaCompensacion: employee.cajaCompensacion || employee.caja_compensacion,
      cargo: employee.cargo,
      nivelRiesgoARL: (employee.nivelRiesgoARL || employee.nivel_riesgo_arl) as 'I' | 'II' | 'III' | 'IV' | 'V' | undefined,
      periodicidadPago: (employee.periodicidadPago || employee.periodicidad_pago || 'mensual') as 'quincenal' | 'mensual',
      banco: employee.banco,
      tipoCuenta: (employee.tipoCuenta || employee.tipo_cuenta || 'ahorros') as 'ahorros' | 'corriente',
      numeroCuenta: employee.numeroCuenta || employee.numero_cuenta,
      titularCuenta: employee.titularCuenta || employee.titular_cuenta,
      formaPago: (employee.formaPago || employee.forma_pago || 'dispersion') as 'dispersion' | 'manual',
      tipoJornada: (employee.tipoJornada || employee.tipo_jornada || 'completa') as 'completa' | 'parcial' | 'horas',
      diasTrabajo: Number(employee.diasTrabajo || employee.dias_trabajo || 30),
      horasTrabajo: Number(employee.horasTrabajo || employee.horas_trabajo || 8),
      fechaNacimiento: employee.fechaNacimiento || employee.fecha_nacimiento,
      sexo: (employee.sexo) as 'M' | 'F' | undefined,
      direccion: employee.direccion,
      ciudad: employee.ciudad,
      departamento: employee.departamento,
      centroCostos: employee.centroCostos || employee.centro_costos,
      fechaFirmaContrato: employee.fechaFirmaContrato || employee.fecha_firma_contrato,
      fechaFinalizacionContrato: employee.fechaFinalizacionContrato || employee.fecha_finalizacion_contrato,
      beneficiosExtralegales: Boolean(employee.beneficiosExtralegales || employee.beneficios_extralegales),
      clausulasEspeciales: employee.clausulasEspeciales || employee.clausulas_especiales,
      codigoCIIU: employee.codigoCIIU || employee.codigo_ciiu,
      tipoCotizanteId: employee.tipoCotizanteId || employee.tipo_cotizante_id,
      subtipoCotizanteId: employee.subtipoCotizanteId || employee.subtipo_cotizante_id,
      regimenSalud: (employee.regimenSalud || employee.regimen_salud || 'contributivo') as 'contributivo' | 'subsidiado',
      estadoAfiliacion: (employee.estadoAfiliacion || employee.estado_afiliacion || 'pendiente') as 'completa' | 'pendiente' | 'inconsistente',
      custom_fields: employee.customFields || employee.custom_fields || {},
      contratoVencimiento: employee.contratoVencimiento,
      
      // ✅ FIXED: Ensure company_id is present
      company_id: employee.company_id || employee.empresaId || '',
      empresaId: employee.empresaId || employee.company_id || '',
      
      // Status fields
      hasExpiredContract: false,
      hasPendingDocuments: false,
      hasIncompleteAffiliations: false,
      statusFlags: []
    };
  }

  // Add other transformation methods as needed
}
