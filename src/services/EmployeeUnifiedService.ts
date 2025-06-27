
import { supabase } from '@/integrations/supabase/client';
import { Employee } from '@/types';
import { CompanyConfigurationService } from '@/services/CompanyConfigurationService';

interface EmployeeDataWithExtended extends Omit<Employee, 'id' | 'createdAt' | 'updatedAt'> {
  segundoNombre?: string;
  banco?: string;
  tipoCuenta?: 'ahorros' | 'corriente';
  numeroCuenta?: string;
  titularCuenta?: string;
  tipoCotizanteId?: string | null;
  subtipoCotizanteId?: string | null;
}

export class EmployeeUnifiedService {
  private static mapDatabaseToEmployee(dbEmployee: any): Employee {
    console.log('🔄 Mapping database employee to frontend format:', dbEmployee.id);
    
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

  private static mapEmployeeToDatabase(employee: Partial<EmployeeDataWithExtended>) {
    console.log('🔄 Mapping frontend employee to database format:', employee);
    
    // Helper function to handle text fields - convert empty strings to null
    const cleanTextField = (value: any) => {
      if (value === '' || value === undefined) return null;
      return value ? String(value).trim() : null;
    };

    // Helper function to handle UUID fields - convert empty strings to null
    const cleanUuidField = (value: any) => {
      if (!value || value === '') return null;
      return value;
    };

    const mapped = {
      company_id: employee.empresaId,
      cedula: employee.cedula,
      tipo_documento: employee.tipoDocumento,
      nombre: employee.nombre,
      segundo_nombre: cleanTextField(employee.segundoNombre),
      apellido: employee.apellido,
      email: cleanTextField(employee.email),
      telefono: cleanTextField(employee.telefono),
      salario_base: employee.salarioBase,
      tipo_contrato: employee.tipoContrato,
      fecha_ingreso: employee.fechaIngreso,
      estado: employee.estado,
      eps: cleanTextField(employee.eps),
      afp: cleanTextField(employee.afp),
      arl: cleanTextField(employee.arl),
      caja_compensacion: cleanTextField(employee.cajaCompensacion),
      cargo: cleanTextField(employee.cargo),
      estado_afiliacion: employee.estadoAfiliacion,
      nivel_riesgo_arl: employee.nivelRiesgoARL,
      banco: cleanTextField(employee.banco),
      tipo_cuenta: employee.tipoCuenta,
      numero_cuenta: cleanTextField(employee.numeroCuenta),
      titular_cuenta: cleanTextField(employee.titularCuenta),
      sexo: employee.sexo,
      fecha_nacimiento: employee.fechaNacimiento,
      direccion: cleanTextField(employee.direccion),
      ciudad: cleanTextField(employee.ciudad),
      departamento: employee.departamento,
      periodicidad_pago: employee.periodicidadPago,
      codigo_ciiu: cleanTextField(employee.codigoCIIU),
      centro_costos: cleanTextField(employee.centroCostos),
      fecha_firma_contrato: employee.fechaFirmaContrato,
      fecha_finalizacion_contrato: employee.fechaFinalizacionContrato,
      tipo_jornada: employee.tipoJornada,
      dias_trabajo: employee.diasTrabajo,
      horas_trabajo: employee.horasTrabajo,
      beneficios_extralegales: employee.beneficiosExtralegales,
      clausulas_especiales: cleanTextField(employee.clausulasEspeciales),
      forma_pago: employee.formaPago,
      regimen_salud: employee.regimenSalud,
      // CRITICAL: Handle new optional fields properly
      tipo_cotizante_id: cleanUuidField(employee.tipoCotizanteId),
      subtipo_cotizante_id: cleanUuidField(employee.subtipoCotizanteId)
    };

    console.log('✅ Mapped employee data:', {
      ...mapped,
      tipo_cotizante_id: mapped.tipo_cotizante_id,
      subtipo_cotizante_id: mapped.subtipo_cotizante_id
    });

    return mapped;
  }

  static async getAllEmployees(): Promise<Employee[]> {
    try {
      console.log('🔍 Getting all employees...');
      const companyId = await CompanyConfigurationService.getCurrentUserCompanyId();
      if (!companyId) {
        console.warn('⚠️ No company ID found for current user');
        return [];
      }

      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching employees:', error);
        throw new Error(`Error al obtener empleados: ${error.message}`);
      }

      console.log('✅ Fetched employees:', data?.length || 0);
      return (data || []).map(this.mapDatabaseToEmployee);
    } catch (error) {
      console.error('❌ Error in getAllEmployees:', error);
      throw error;
    }
  }

  static async getEmployeeById(id: string): Promise<Employee | null> {
    try {
      console.log('🔍 Getting employee by ID:', id);
      
      const companyId = await CompanyConfigurationService.getCurrentUserCompanyId();
      if (!companyId) {
        console.warn('⚠️ No company ID found for current user');
        return null;
      }

      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('id', id)
        .eq('company_id', companyId)
        .single();

      if (error) {
        console.error('❌ Error fetching employee:', error);
        return null;
      }

      console.log('✅ Fetched employee:', data?.nombre, data?.apellido);
      return this.mapDatabaseToEmployee(data);
    } catch (error) {
      console.error('❌ Error in getEmployeeById:', error);
      return null;
    }
  }

  static async create(employeeData: Partial<EmployeeDataWithExtended>): Promise<Employee> {
    try {
      console.log('🚀 Creating new employee...', employeeData.nombre, employeeData.apellido);
      
      const companyId = await CompanyConfigurationService.getCurrentUserCompanyId();
      if (!companyId) {
        throw new Error('No se pudo obtener el ID de la empresa');
      }

      // Check for duplicate cedula
      const { data: existingEmployee } = await supabase
        .from('employees')
        .select('id, cedula, nombre, apellido')
        .eq('company_id', companyId)
        .eq('cedula', String(employeeData.cedula || '').trim())
        .maybeSingle();

      if (existingEmployee) {
        throw new Error(`Ya existe un empleado con la cédula ${employeeData.cedula} en esta empresa: ${existingEmployee.nombre} ${existingEmployee.apellido}`);
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
        console.error('❌ Error creating employee:', error);
        throw new Error(`Error al crear empleado: ${error.message}`);
      }

      console.log('✅ Employee created successfully:', data.id);
      return this.mapDatabaseToEmployee(data);
    } catch (error) {
      console.error('❌ Error in create:', error);
      throw error;
    }
  }

  static async update(id: string, employeeData: Partial<EmployeeDataWithExtended>): Promise<Employee> {
    try {
      console.log('🔄 Updating employee:', id, employeeData);
      
      if (!id) {
        throw new Error('ID de empleado es requerido para actualizar');
      }

      const companyId = await CompanyConfigurationService.getCurrentUserCompanyId();
      if (!companyId) {
        throw new Error('No se pudo obtener el ID de la empresa');
      }

      const dbData = this.mapEmployeeToDatabase(employeeData);
      console.log('📤 Sending update to Supabase:', dbData);

      const { data, error } = await supabase
        .from('employees')
        .update(dbData)
        .eq('id', id)
        .eq('company_id', companyId)
        .select()
        .single();

      if (error) {
        console.error('❌ Error updating employee:', error);
        throw new Error(`Error al actualizar empleado: ${error.message}`);
      }

      if (!data) {
        throw new Error('No se encontró el empleado para actualizar');
      }

      console.log('✅ Employee updated successfully:', data.id);
      return this.mapDatabaseToEmployee(data);
    } catch (error) {
      console.error('❌ Error in update:', error);
      throw error;
    }
  }

  static async delete(id: string): Promise<void> {
    try {
      console.log('🗑️ Deleting employee:', id);
      
      const companyId = await CompanyConfigurationService.getCurrentUserCompanyId();
      if (!companyId) {
        throw new Error('No se pudo obtener el ID de la empresa');
      }

      // Check if employee has payrolls
      const { data: payrolls } = await supabase
        .from('payrolls')
        .select('id')
        .eq('employee_id', id)
        .limit(1);

      if (payrolls && payrolls.length > 0) {
        throw new Error('No se puede eliminar el empleado porque tiene nóminas asociadas');
      }

      const { error } = await supabase
        .from('employees')
        .delete()
        .eq('id', id)
        .eq('company_id', companyId);

      if (error) {
        console.error('❌ Error deleting employee:', error);
        throw new Error(`Error al eliminar empleado: ${error.message}`);
      }

      console.log('✅ Employee deleted successfully');
    } catch (error) {
      console.error('❌ Error in delete:', error);
      throw error;
    }
  }

  static async changeStatus(id: string, newStatus: 'activo' | 'inactivo' | 'vacaciones' | 'incapacidad'): Promise<Employee> {
    try {
      console.log('🔄 Changing employee status:', id, newStatus);
      return await this.update(id, { estado: newStatus });
    } catch (error) {
      console.error('❌ Error changing employee status:', error);
      throw error;
    }
  }
}
