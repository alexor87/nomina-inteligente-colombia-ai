import { EmployeeUnified } from '@/types/employee-unified';
import { EmployeeWithStatus } from '@/types/employee-extended';

export class EmployeeTransformationService {
  static transformEmployeeData(employees: any[]): EmployeeWithStatus[] {
    if (!employees) return [];

    return employees.map(employee => ({
      id: employee.id,
      cedula: employee.cedula,
      tipoDocumento: employee.tipo_documento,
      nombre: employee.nombre,
      segundoNombre: employee.segundo_nombre,
      apellido: employee.apellido,
      email: employee.email,
      telefono: employee.telefono,
      salarioBase: Number(employee.salario_base),
      tipoSalario: employee.tipo_salario || 'mensual', // Add required field
      tipoContrato: employee.tipo_contrato,
      fechaIngreso: employee.fecha_ingreso,
      estado: employee.estado,
      eps: employee.eps,
      afp: employee.afp,
      arl: employee.arl,
      cajaCompensacion: employee.caja_compensacion,
      regimenSalud: employee.regimen_salud,
      estadoAfiliacion: employee.estado_afiliacion,
      centroCostos: employee.centro_costos,
      cargo: employee.cargo,
      nivelRiesgoARL: employee.nivel_riesgo_arl,
      fechaFirmaContrato: employee.fecha_firma_contrato,
      fechaFinalizacionContrato: employee.fecha_finalizacion_contrato,
      tipoJornada: employee.tipo_jornada,
      diasTrabajo: employee.dias_trabajo,
      horasTrabajo: employee.horas_trabajo,
      beneficiosExtralegales: employee.beneficios_extralegales,
      clausulasEspeciales: employee.clausulas_especiales,
      banco: employee.banco,
      tipoCuenta: employee.tipo_cuenta,
      numeroCuenta: employee.numero_cuenta,
      titularCuenta: employee.titular_cuenta,
      formaPago: employee.forma_pago,
      tipoCotizanteId: employee.tipo_cotizante_id,
      subtipoCotizanteId: employee.subtipo_cotizante_id,
      custom_fields: employee.custom_fields,
      createdAt: employee.created_at,
      updatedAt: employee.updated_at,
      company_id: employee.company_id, // Add required field
      empresaId: employee.company_id,
      periodicidadPago: employee.periodicidad_pago,
      sexo: employee.sexo,
      fechaNacimiento: employee.fecha_nacimiento,
      direccion: employee.direccion,
      ciudad: employee.ciudad,
      departamento: employee.departamento,
      codigoCIIU: employee.codigo_ciiu,
      // UI-specific fields
      avatar: undefined,
      centrosocial: employee.centro_costos,
      ultimaLiquidacion: employee.ultima_liquidacion,
      contratoVencimiento: employee.fecha_finalizacion_contrato
    }));
  }
}
