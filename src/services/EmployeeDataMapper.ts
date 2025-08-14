
import { EmployeeFormData } from '@/components/employees/form/types';
import { EmployeeUnified } from '@/types/employee-unified';

export class EmployeeDataMapper {
  /**
   * Maps form data to database format for employee creation/update
   */
  static mapFormToDatabase(formData: EmployeeFormData, companyId: string) {
    return {
      company_id: companyId,
      cedula: formData.cedula,
      tipo_documento: formData.tipoDocumento,
      nombre: formData.nombre,
      segundo_nombre: formData.segundoNombre || null,
      apellido: formData.apellido,
      email: formData.email || null,
      telefono: formData.telefono || null,
      sexo: formData.sexo || null,
      fecha_nacimiento: formData.fechaNacimiento || null,
      direccion: formData.direccion || null,
      ciudad: formData.ciudad || null,
      departamento: formData.departamento || null,
      salario_base: formData.salarioBase,
      tipo_salario: formData.tipoSalario || 'mensual', // ✅ ADDED: Map tipoSalario
      tipo_contrato: formData.tipoContrato,
      fecha_ingreso: formData.fechaIngreso,
      periodicidad_pago: formData.periodicidadPago,
      cargo: formData.cargo || null,
      codigo_ciiu: formData.codigo_ciiu || null,
      nivel_riesgo_arl: formData.nivelRiesgoARL || null,
      estado: formData.estado,
      centro_costos: formData.centroCostos || null,
      fecha_firma_contrato: formData.fechaFirmaContrato || null,
      fecha_finalizacion_contrato: formData.fechaFinalizacionContrato || null,
      tipo_jornada: formData.tipoJornada,
      dias_trabajo: formData.diasTrabajo || 30,
      horas_trabajo: formData.horasTrabajo || 8,
      beneficios_extralegales: formData.beneficiosExtralegales || false,
      clausulas_especiales: formData.clausulasEspeciales || null,
      banco: formData.banco || null,
      tipo_cuenta: formData.tipoCuenta || null,
      numero_cuenta: formData.numeroCuenta || null,
      titular_cuenta: formData.titularCuenta || null,
      forma_pago: formData.formaPago || null,
      eps: formData.eps || null,
      afp: formData.afp || null,
      arl: formData.arl || null,
      caja_compensacion: formData.cajaCompensacion || null,
      tipo_cotizante_id: formData.tipoCotizanteId || null,
      subtipo_cotizante_id: formData.subtipoCotizanteId || null,
      regimen_salud: formData.regimenSalud || null,
      estado_afiliacion: formData.estadoAfiliacion || null,
      custom_fields: formData.custom_fields || {}
    };
  }

  /**
   * Maps database data to EmployeeUnified format
   */
  static mapDatabaseToUnified(dbData: any): EmployeeUnified {
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
      tipoSalario: dbData.tipo_salario || 'mensual', // ✅ ADDED: Map tipoSalario from database
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
      tipoCuenta: dbData.tipo_cuenta || undefined,
      numeroCuenta: dbData.numero_cuenta || undefined,
      titularCuenta: dbData.titular_cuenta || undefined,
      formaPago: dbData.forma_pago || undefined,
      eps: dbData.eps || undefined,
      afp: dbData.afp || undefined,
      arl: dbData.arl || undefined,
      cajaCompensacion: dbData.caja_compensacion || undefined,
      tipoCotizanteId: dbData.tipo_cotizante_id || undefined,
      subtipoCotizanteId: dbData.subtipo_cotizante_id || undefined,
      regimenSalud: dbData.regimen_salud || undefined,
      estadoAfiliacion: dbData.estado_afiliacion || undefined,
      custom_fields: dbData.custom_fields || {},
      createdAt: dbData.created_at,
      updatedAt: dbData.updated_at
    };
  }
}
