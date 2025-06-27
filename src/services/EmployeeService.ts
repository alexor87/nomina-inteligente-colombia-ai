
import { supabase } from '@/integrations/supabase/client';
import { Employee } from '@/types';
import { CompanyConfigurationService } from '@/services/CompanyConfigurationService';

export class EmployeeService {
  private static mapDatabaseToEmployee(dbEmployee: any): Employee {
    return {
      id: dbEmployee.id,
      empresaId: dbEmployee.company_id,
      cedula: dbEmployee.cedula,
      tipoDocumento: dbEmployee.tipo_documento || 'CC',
      nombre: dbEmployee.nombre,
      segundoNombre: dbEmployee.segundo_nombre,
      apellido: dbEmployee.apellido,
      email: dbEmployee.email,
      telefono: dbEmployee.telefono,
      salarioBase: Number(dbEmployee.salario_base) || 0,
      tipoContrato: dbEmployee.tipo_contrato || 'indefinido',
      fechaIngreso: dbEmployee.fecha_ingreso,
      estado: dbEmployee.estado || 'activo',
      eps: dbEmployee.eps,
      afp: dbEmployee.afp,
      arl: dbEmployee.arl,
      cajaCompensacion: dbEmployee.caja_compensacion,
      cargo: dbEmployee.cargo,
      estadoAfiliacion: dbEmployee.estado_afiliacion || 'pendiente',
      nivelRiesgoARL: dbEmployee.nivel_riesgo_arl,
      banco: dbEmployee.banco,
      tipoCuenta: dbEmployee.tipo_cuenta || 'ahorros',
      numeroCuenta: dbEmployee.numero_cuenta,
      titularCuenta: dbEmployee.titular_cuenta,
      sexo: dbEmployee.sexo,
      fechaNacimiento: dbEmployee.fecha_nacimiento,
      direccion: dbEmployee.direccion,
      ciudad: dbEmployee.ciudad,
      departamento: dbEmployee.departamento,
      periodicidadPago: dbEmployee.periodicidad_pago || 'mensual',
      codigoCIIU: dbEmployee.codigo_ciiu,
      centroCostos: dbEmployee.centro_costos,
      fechaFirmaContrato: dbEmployee.fecha_firma_contrato,
      fechaFinalizacionContrato: dbEmployee.fecha_finalizacion_contrato,
      tipoJornada: dbEmployee.tipo_jornada,
      diasTrabajo: dbEmployee.dias_trabajo,
      horasTrabajo: dbEmployee.horas_trabajo,
      beneficiosExtralegales: dbEmployee.beneficios_extralegales,
      clausulasEspeciales: dbEmployee.clausulas_especiales,
      formaPago: dbEmployee.forma_pago,
      regimenSalud: dbEmployee.regimen_salud,
      tipoCotizanteId: dbEmployee.tipo_cotizante_id,
      subtipoCotizanteId: dbEmployee.subtipo_cotizante_id,
      createdAt: dbEmployee.created_at,
      updatedAt: dbEmployee.updated_at,
      // Legacy fields
      avatar: dbEmployee.avatar,
      centrosocial: dbEmployee.centro_costos,
      ultimaLiquidacion: dbEmployee.ultima_liquidacion,
      contratoVencimiento: dbEmployee.fecha_finalizacion_contrato
    };
  }

  private static mapEmployeeToDatabase(employee: Partial<Employee>) {
    return {
      company_id: employee.empresaId,
      cedula: employee.cedula,
      tipo_documento: employee.tipoDocumento,
      nombre: employee.nombre,
      segundo_nombre: employee.segundoNombre,
      apellido: employee.apellido,
      email: employee.email,
      telefono: employee.telefono,
      salario_base: employee.salarioBase,
      tipo_contrato: employee.tipoContrato,
      fecha_ingreso: employee.fechaIngreso,
      estado: employee.estado,
      eps: employee.eps,
      afp: employee.afp,
      arl: employee.arl,
      caja_compensacion: employee.cajaCompensacion,
      cargo: employee.cargo,
      estado_afiliacion: employee.estadoAfiliacion,
      nivel_riesgo_arl: employee.nivelRiesgoARL,
      banco: employee.banco,
      tipo_cuenta: employee.tipoCuenta,
      numero_cuenta: employee.numeroCuenta,
      titular_cuenta: employee.titularCuenta,
      sexo: employee.sexo,
      fecha_nacimiento: employee.fechaNacimiento,
      direccion: employee.direccion,
      ciudad: employee.ciudad,
      departamento: employee.departamento,
      periodicidad_pago: employee.periodicidadPago,
      codigo_ciiu: employee.codigoCIIU,
      centro_costos: employee.centroCostos,
      fecha_firma_contrato: employee.fechaFirmaContrato,
      fecha_finalizacion_contrato: employee.fechaFinalizacionContrato,
      tipo_jornada: employee.tipoJornada,
      dias_trabajo: employee.diasTrabajo,
      horas_trabajo: employee.horasTrabajo,
      beneficios_extralegales: employee.beneficiosExtralegales,
      clausulas_especiales: employee.clausulasEspeciales,
      forma_pago: employee.formaPago,
      regimen_salud: employee.regimenSalud,
      tipo_cotizante_id: employee.tipoCotizanteId,
      subtipo_cotizante_id: employee.subtipoCotizanteId
    };
  }

  static async getAllEmployees(): Promise<Employee[]> {
    try {
      const companyId = await CompanyConfigurationService.getCurrentUserCompanyId();
      if (!companyId) {
        console.warn('No company ID found for current user');
        return [];
      }

      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching employees:', error);
        throw new Error(`Error al obtener empleados: ${error.message}`);
      }

      return (data || []).map(this.mapDatabaseToEmployee);
    } catch (error) {
      console.error('Error in getAllEmployees:', error);
      throw error;
    }
  }

  static async getEmployees(): Promise<Employee[]> {
    return this.getAllEmployees();
  }

  static async getEmployeeById(id: string): Promise<Employee | null> {
    try {
      const companyId = await CompanyConfigurationService.getCurrentUserCompanyId();
      if (!companyId) {
        console.warn('No company ID found for current user');
        return null;
      }

      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('id', id)
        .eq('company_id', companyId)
        .single();

      if (error) {
        console.error('Error fetching employee:', error);
        throw new Error(`Error al obtener empleado: ${error.message}`);
      }

      return this.mapDatabaseToEmployee(data);
    } catch (error) {
      console.error('Error in getEmployeeById:', error);
      throw error;
    }
  }

  static async create(employeeData: Partial<Employee>): Promise<Employee> {
    try {
      const companyId = await CompanyConfigurationService.getCurrentUserCompanyId();
      if (!companyId) {
        throw new Error('No se pudo obtener el ID de la empresa');
      }

      const dbData = this.mapEmployeeToDatabase({
        ...employeeData,
        empresaId: companyId
      });

      const { data, error } = await supabase
        .from('employees')
        .insert(dbData)
        .select()
        .single();

      if (error) {
        console.error('Error creating employee:', error);
        throw new Error(`Error al crear empleado: ${error.message}`);
      }

      return this.mapDatabaseToEmployee(data);
    } catch (error) {
      console.error('Error in create:', error);
      throw error;
    }
  }

  static async createEmployee(employeeData: Partial<Employee>): Promise<Employee> {
    return this.create(employeeData);
  }

  static async update(id: string, employeeData: Partial<Employee>): Promise<Employee> {
    try {
      const companyId = await CompanyConfigurationService.getCurrentUserCompanyId();
      if (!companyId) {
        throw new Error('No se pudo obtener el ID de la empresa');
      }

      const dbData = this.mapEmployeeToDatabase(employeeData);

      const { data, error } = await supabase
        .from('employees')
        .update(dbData)
        .eq('id', id)
        .eq('company_id', companyId)
        .select()
        .single();

      if (error) {
        console.error('Error updating employee:', error);
        throw new Error(`Error al actualizar empleado: ${error.message}`);
      }

      return this.mapDatabaseToEmployee(data);
    } catch (error) {
      console.error('Error in update:', error);
      throw error;
    }
  }

  static async updateEmployee(id: string, employeeData: Partial<Employee>): Promise<Employee> {
    return this.update(id, employeeData);
  }

  static async delete(id: string): Promise<void> {
    try {
      const companyId = await CompanyConfigurationService.getCurrentUserCompanyId();
      if (!companyId) {
        throw new Error('No se pudo obtener el ID de la empresa');
      }

      const { error } = await supabase
        .from('employees')
        .delete()
        .eq('id', id)
        .eq('company_id', companyId);

      if (error) {
        console.error('Error deleting employee:', error);
        throw new Error(`Error al eliminar empleado: ${error.message}`);
      }
    } catch (error) {
      console.error('Error in delete:', error);
      throw error;
    }
  }

  static async deleteEmployee(id: string): Promise<void> {
    return this.delete(id);
  }

  static async changeStatus(id: string, newStatus: 'activo' | 'inactivo' | 'vacaciones' | 'incapacidad'): Promise<Employee> {
    try {
      return await this.update(id, { estado: newStatus });
    } catch (error) {
      console.error('Error changing employee status:', error);
      throw error;
    }
  }

  static async changeEmployeeStatus(id: string, newStatus: string): Promise<Employee> {
    return this.changeStatus(id, newStatus as 'activo' | 'inactivo' | 'vacaciones' | 'incapacidad');
  }
}
