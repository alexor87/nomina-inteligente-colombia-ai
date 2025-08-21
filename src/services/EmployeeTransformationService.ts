
import { EmployeeWithStatus } from '@/types/employee-extended';

export class EmployeeTransformationService {
  static transformEmployeeData(rawEmployees: any[]): EmployeeWithStatus[] {
    return rawEmployees.map(employee => {
      return {
        // Core identification
        id: employee.id,
        company_id: employee.company_id || employee.empresaId, // Added missing company_id
        cedula: employee.cedula,
        tipoDocumento: employee.tipo_documento || employee.tipoDocumento,
        
        // Personal information
        nombre: employee.nombre,
        segundoNombre: employee.segundo_nombre || employee.segundoNombre,
        apellido: employee.apellido,
        email: employee.email,
        telefono: employee.telefono,
        sexo: employee.sexo,
        fechaNacimiento: employee.fecha_nacimiento || employee.fechaNacimiento,
        direccion: employee.direccion,
        ciudad: employee.ciudad,
        departamento: employee.departamento,
        
        // Employment information
        cargo: employee.cargo,
        salarioBase: Number(employee.salario_base || employee.salarioBase || 0),
        tipoContrato: employee.tipo_contrato || employee.tipoContrato,
        fechaIngreso: employee.fecha_ingreso || employee.fechaIngreso,
        estado: employee.estado,
        periodicidadPago: employee.periodicidad_pago || employee.periodicidadPago,
        codigoCIIU: employee.codigo_ciiu || employee.codigoCIIU,
        centroCostos: employee.centro_costos || employee.centroCostos,
        centrosocial: employee.centrosocial,
        
        // Contract details
        fechaFirmaContrato: employee.fecha_firma_contrato || employee.fechaFirmaContrato,
        fechaFinalizacionContrato: employee.fecha_finalizacion_contrato || employee.fechaFinalizacionContrato,
        contratoVencimiento: employee.contratoVencimiento,
        tipoJornada: employee.tipo_jornada || employee.tipoJornada,
        diasTrabajo: Number(employee.dias_trabajo || employee.diasTrabajo || 30),
        horasTrabajo: Number(employee.horas_trabajo || employee.horasTrabajo || 8),
        beneficiosExtralegales: Boolean(employee.beneficios_extralegales || employee.beneficiosExtralegales),
        clausulasEspeciales: employee.clausulas_especiales || employee.clausulasEspeciales,
        
        // Affiliations
        eps: employee.eps,
        afp: employee.afp,
        arl: employee.arl,
        cajaCompensacion: employee.caja_compensacion || employee.cajaCompensacion,
        estadoAfiliacion: employee.estado_afiliacion || employee.estadoAfiliacion || 'pendiente',
        nivelRiesgoARL: employee.nivel_riesgo_arl || employee.nivelRiesgoARL,
        regimenSalud: employee.regimen_salud || employee.regimenSalud,
        
        // Banking information
        banco: employee.banco,
        tipoCuenta: employee.tipo_cuenta || employee.tipoCuenta,
        numeroCuenta: employee.numero_cuenta || employee.numeroCuenta,
        titularCuenta: employee.titular_cuenta || employee.titularCuenta,
        formaPago: employee.forma_pago || employee.formaPago,
        
        // Types de cotizante
        tipoCotizanteId: employee.tipo_cotizante_id || employee.tipoCotizanteId,
        subtipoCotizanteId: employee.subtipo_cotizante_id || employee.subtipoCotizanteId,
        
        // Audit fields
        empresaId: employee.company_id || employee.empresaId,
        createdAt: employee.created_at || employee.createdAt,
        updatedAt: employee.updated_at || employee.updatedAt,
        ultimaLiquidacion: employee.ultimaLiquidacion,
        
        // Custom fields
        custom_fields: employee.custom_fields || {},
        
        // Avatar for UI
        avatar: employee.avatar
      };
    });
  }
}
