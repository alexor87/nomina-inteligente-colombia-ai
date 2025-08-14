
import { EmployeeWithStatus } from '@/types/employee-extended';

export class EmployeeTransformationService {
  static transformEmployeeData(rawData: any[]): EmployeeWithStatus[] {
    return rawData.map((emp: any): EmployeeWithStatus => {
      console.log('🔄 Transforming employee:', emp.nombre, emp.apellido);
      
      const transformed = {
        id: emp.id,
        cedula: emp.cedula,
        tipoDocumento: emp.tipo_documento || 'CC',
        nombre: emp.nombre,
        segundoNombre: emp.segundo_nombre || undefined,
        apellido: emp.apellido,
        email: emp.email || '',
        telefono: emp.telefono,
        salarioBase: Number(emp.salario_base) || 0,
        tipoContrato: emp.tipo_contrato || 'indefinido',
        fechaIngreso: emp.fecha_ingreso,
        estado: emp.estado || 'activo',
        eps: emp.eps,
        afp: emp.afp,
        arl: emp.arl,
        cajaCompensacion: emp.caja_compensacion,
        cargo: emp.cargo,
        empresaId: emp.company_id,
        estadoAfiliacion: emp.estado_afiliacion || 'pendiente',
        nivelRiesgoARL: emp.nivel_riesgo_arl,
        createdAt: emp.created_at,
        updatedAt: emp.updated_at,
        // Banking information
        banco: emp.banco,
        tipoCuenta: emp.tipo_cuenta || 'ahorros',
        numeroCuenta: emp.numero_cuenta,
        titularCuenta: emp.titular_cuenta,
        // Extended personal information
        sexo: emp.sexo,
        fechaNacimiento: emp.fecha_nacimiento,
        direccion: emp.direccion,
        ciudad: emp.ciudad,
        departamento: emp.departamento,
        // Labor information extended
        periodicidadPago: emp.periodicidad_pago || 'mensual',
        codigoCIIU: emp.codigo_ciiu,
        centroCostos: emp.centro_costos,
        // Contract details
        fechaFirmaContrato: emp.fecha_firma_contrato,
        fechaFinalizacionContrato: emp.fecha_finalizacion_contrato,
        tipoJornada: emp.tipo_jornada,
        diasTrabajo: emp.dias_trabajo,
        horasTrabajo: emp.horas_trabajo,
        beneficiosExtralegales: emp.beneficios_extralegales,
        clausulasEspeciales: emp.clausulas_especiales,
        formaPago: emp.forma_pago,
        regimenSalud: emp.regimen_salud,
        // Types de cotizante
        tipoCotizanteId: emp.tipo_cotizante_id,
        subtipoCotizanteId: emp.subtipo_cotizante_id,
        // Legacy fields for compatibility
        avatar: emp.avatar,
        centrosocial: emp.centro_costos,
        ultimaLiquidacion: emp.ultima_liquidacion,
        contratoVencimiento: emp.contrato_vencimiento
      };

      return transformed;
    });
  }
}
