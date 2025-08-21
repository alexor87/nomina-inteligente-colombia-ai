
import { supabase } from '@/integrations/supabase/client';
import { EmployeeUnified } from '@/types/employee-unified';
import { ServiceResponse } from '@/types';

export class EmployeeUnifiedService {
  static async getAll(): Promise<ServiceResponse<EmployeeUnified[]>> {
    try {
      const { data: rows, error } = await supabase
        .from('employees')
        .select('*');

      if (error) {
        console.error('Error fetching employees:', error);
        return { success: false, message: error.message, data: [] };
      }

      const mappedArray = (rows ?? []).map(row => ({
        id: row.id,
        company_id: row.company_id,
        cedula: row.cedula,
        tipoDocumento: row.tipo_documento,
        nombre: row.nombre,
        segundoNombre: row.segundo_nombre,
        apellido: row.apellido,
        email: row.email,
        telefono: row.telefono,
        sexo: row.sexo,
        fechaNacimiento: row.fecha_nacimiento,
        direccion: row.direccion,
        ciudad: row.ciudad,
        departamento: row.departamento,
        salarioBase: row.salario_base,
        tipoContrato: row.tipo_contrato,
        fechaIngreso: row.fecha_ingreso,
        periodicidadPago: row.periodicidad_pago,
        cargo: row.cargo,
        codigoCIIU: row.codigo_ciiu,
        nivelRiesgoARL: row.nivel_riesgo_arl,
        estado: row.estado,
        centroCostos: row.centro_costos,
        fechaFirmaContrato: row.fecha_firma_contrato,
        fechaFinalizacionContrato: row.fecha_finalizacion_contrato,
        tipoJornada: row.tipo_jornada,
        diasTrabajo: row.dias_trabajo,
        horasTrabajo: row.horas_trabajo,
        beneficiosExtralegales: row.beneficios_extralegales,
        clausulasEspeciales: row.clausulas_especiales,
        banco: row.banco,
        tipoCuenta: row.tipo_cuenta,
        numeroCuenta: row.numero_cuenta,
        titularCuenta: row.titular_cuenta,
        formaPago: row.forma_pago,
        eps: row.eps,
        afp: row.afp,
        arl: row.arl,
        cajaCompensacion: row.caja_compensacion,
        tipoCotizanteId: row.tipo_cotizante_id,
        subtipoCotizanteId: row.subtipo_cotizante_id,
        custom_fields: row.custom_fields
      }));

      return { success: true, data: mappedArray as any[] };
    } catch (error: any) {
      console.error('Unexpected error fetching employees:', error);
      return { success: false, message: error.message, data: [] };
    }
  }

  static async getById(id: string): Promise<ServiceResponse<EmployeeUnified | null>> {
    try {
      const { data: [row], error } = await supabase
        .from('employees')
        .select('*')
        .eq('id', id);

      if (error) {
        console.error('Error fetching employee by ID:', error);
        return { success: false, message: error.message, data: null };
      }

      if (!row) {
        return { success: true, data: null, message: 'Employee not found' };
      }

      const unifiedOneResult = {
        id: row.id,
        company_id: row.company_id,
        cedula: row.cedula,
        tipoDocumento: row.tipo_documento,
        nombre: row.nombre,
        segundoNombre: row.segundo_nombre,
        apellido: row.apellido,
        email: row.email,
        telefono: row.telefono,
        sexo: row.sexo,
        fechaNacimiento: row.fecha_nacimiento,
        direccion: row.direccion,
        ciudad: row.ciudad,
        departamento: row.departamento,
        salarioBase: row.salario_base,
        tipoContrato: row.tipo_contrato,
        fechaIngreso: row.fecha_ingreso,
        periodicidadPago: row.periodicidad_pago,
        cargo: row.cargo,
        codigoCIIU: row.codigo_ciiu,
        nivelRiesgoARL: row.nivel_riesgo_arl,
        estado: row.estado,
        centroCostos: row.centro_costos,
        fechaFirmaContrato: row.fecha_firma_contrato,
        fechaFinalizacionContrato: row.fecha_finalizacion_contrato,
        tipoJornada: row.tipo_jornada,
        diasTrabajo: row.dias_trabajo,
        horasTrabajo: row.horas_trabajo,
        beneficiosExtralegales: row.beneficios_extralegales,
        clausulasEspeciales: row.clausulas_especiales,
        banco: row.banco,
        tipoCuenta: row.tipo_cuenta,
        numeroCuenta: row.numero_cuenta,
        titularCuenta: row.titular_cuenta,
        formaPago: row.forma_pago,
        eps: row.eps,
        afp: row.afp,
        arl: row.arl,
        cajaCompensacion: row.caja_compensacion,
        tipoCotizanteId: row.tipo_cotizante_id,
        subtipoCotizanteId: row.subtipo_cotizante_id,
        custom_fields: row.custom_fields
      };
      return { success: true, data: unifiedOneResult as any, message: 'Employee found' };
    } catch (error: any) {
      console.error('Unexpected error fetching employee by ID:', error);
      return { success: false, message: error.message, data: null };
    }
  }

  static async create(values: Omit<EmployeeUnified, 'id'>): Promise<ServiceResponse<EmployeeUnified | null>> {
    try {
      const { data: [newEmployee], error } = await supabase
        .from('employees')
        .insert((values as any[]))
        .select('*');

      if (error) {
        console.error('Error creating employee:', error);
        return { success: false, message: error.message, data: null };
      }

      return { success: true, data: newEmployee, message: 'Employee created successfully' };
    } catch (error: any) {
      console.error('Unexpected error creating employee:', error);
      return { success: false, message: error.message, data: null };
    }
  }

  static async update(id: string, values: Partial<EmployeeUnified>): Promise<ServiceResponse<EmployeeUnified | null>> {
    try {
      const { data: [updatedEmployee], error } = await supabase
        .from('employees')
        .update(values)
        .eq('id', id)
        .select('*');

      if (error) {
        console.error('Error updating employee:', error);
        return { success: false, message: error.message, data: null };
      }

      if (!updatedEmployee) {
        return { success: true, data: null, message: 'Employee not found' };
      }

      return { success: true, data: updatedEmployee, message: 'Employee updated successfully' };
    } catch (error: any) {
      console.error('Unexpected error updating employee:', error);
      return { success: false, message: error.message, data: null };
    }
  }

  static async delete(id: string): Promise<ServiceResponse<boolean>> {
    try {
      const { error } = await supabase
        .from('employees')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting employee:', error);
        return { success: false, message: error.message, data: false };
      }

      return { success: true, data: true, message: 'Employee deleted successfully' };
    } catch (error: any) {
      console.error('Unexpected error deleting employee:', error);
      return { success: false, message: error.message, data: false };
    }
  }

  static async getByCompanyId(companyId: string): Promise<ServiceResponse<EmployeeUnified[]>> {
    try {
      const { data: rows, error } = await supabase
        .from('employees')
        .select('*')
        .eq('company_id', companyId);

      if (error) {
        console.error('Error fetching employees by company ID:', error);
        return { success: false, message: error.message, data: [] };
      }

      const mappedArray = (rows ?? []).map(row => ({
        id: row.id,
        company_id: row.company_id,
        cedula: row.cedula,
        tipoDocumento: row.tipo_documento,
        nombre: row.nombre,
        segundoNombre: row.segundo_nombre,
        apellido: row.apellido,
        email: row.email,
        telefono: row.telefono,
        sexo: row.sexo,
        fechaNacimiento: row.fecha_nacimiento,
        direccion: row.direccion,
        ciudad: row.ciudad,
        departamento: row.departamento,
        salarioBase: row.salario_base,
        tipoContrato: row.tipo_contrato,
        fechaIngreso: row.fecha_ingreso,
        periodicidadPago: row.periodicidad_pago,
        cargo: row.cargo,
        codigoCIIU: row.codigo_ciiu,
        nivelRiesgoARL: row.nivel_riesgo_arl,
        estado: row.estado,
        centroCostos: row.centro_costos,
        fechaFirmaContrato: row.fecha_firma_contrato,
        fechaFinalizacionContrato: row.fecha_finalizacion_contrato,
        tipoJornada: row.tipo_jornada,
        diasTrabajo: row.dias_trabajo,
        horasTrabajo: row.horas_trabajo,
        beneficiosExtralegales: row.beneficios_extralegales,
        clausulasEspeciales: row.clausulas_especiales,
        banco: row.banco,
        tipoCuenta: row.tipo_cuenta,
        numeroCuenta: row.numero_cuenta,
        titularCuenta: row.titular_cuenta,
        formaPago: row.forma_pago,
        eps: row.eps,
        afp: row.afp,
        arl: row.arl,
        cajaCompensacion: row.caja_compensacion,
        tipoCotizanteId: row.tipo_cotizante_id,
        subtipoCotizanteId: row.subtipo_cotizante_id,
        custom_fields: row.custom_fields
      }));

      return { success: true, data: mappedArray as any[] };
    } catch (error: any) {
      console.error('Unexpected error fetching employees by company ID:', error);
      return { success: false, message: error.message, data: [] };
    }
  }
}
