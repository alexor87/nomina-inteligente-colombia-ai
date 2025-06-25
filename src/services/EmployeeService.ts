
import { supabase } from '@/integrations/supabase/client';
import { Employee } from '@/types';

export class EmployeeService {
  static async create(employeeData: Omit<Employee, 'id' | 'createdAt' | 'updatedAt'>): Promise<Employee> {
    try {
      console.log('Creating employee:', employeeData);

      // Get current user's company ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Usuario no autenticado');
      }

      // Check if user is superadmin
      const { data: isSuperAdmin } = await supabase.rpc('is_superadmin', {
        _user_id: user.id
      });

      let companyId = employeeData.empresaId;

      // If not superadmin and no company specified, get user's company
      if (!isSuperAdmin && !companyId) {
        const { data: userCompanies } = await supabase.rpc('get_user_companies', {
          _user_id: user.id
        });

        if (!userCompanies || userCompanies.length === 0) {
          throw new Error('No tienes acceso a ninguna empresa');
        }

        companyId = userCompanies[0].company_id;
      }

      if (!companyId) {
        throw new Error('ID de empresa requerido');
      }

      const { data, error } = await supabase
        .from('employees')
        .insert({
          company_id: companyId,
          cedula: employeeData.cedula,
          tipo_documento: employeeData.tipoDocumento || 'CC',
          nombre: employeeData.nombre,
          apellido: employeeData.apellido,
          email: employeeData.email,
          telefono: employeeData.telefono,
          salario_base: employeeData.salarioBase,
          tipo_contrato: employeeData.tipoContrato || 'indefinido',
          fecha_ingreso: employeeData.fechaIngreso,
          estado: employeeData.estado || 'activo',
          eps: employeeData.eps,
          afp: employeeData.afp,
          arl: employeeData.arl,
          caja_compensacion: employeeData.cajaCompensacion,
          cargo: employeeData.cargo,
          banco: employeeData.banco,
          tipo_cuenta: employeeData.tipoCuenta,
          numero_cuenta: employeeData.numeroCuenta,
          titular_cuenta: employeeData.titularCuenta,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating employee:', error);
        throw new Error(error.message);
      }

      return this.transformToEmployee(data);
    } catch (error: any) {
      console.error('Error in EmployeeService.create:', error);
      throw error;
    }
  }

  static async update(id: string, updates: Partial<Employee>): Promise<void> {
    try {
      const { error } = await supabase
        .from('employees')
        .update({
          cedula: updates.cedula,
          tipo_documento: updates.tipoDocumento,
          nombre: updates.nombre,
          apellido: updates.apellido,
          email: updates.email,
          telefono: updates.telefono,
          salario_base: updates.salarioBase,
          tipo_contrato: updates.tipoContrato,
          fecha_ingreso: updates.fechaIngreso,
          estado: updates.estado,
          eps: updates.eps,
          afp: updates.afp,
          arl: updates.arl,
          caja_compensacion: updates.cajaCompensacion,
          cargo: updates.cargo,
          banco: updates.banco,
          tipo_cuenta: updates.tipoCuenta,
          numero_cuenta: updates.numeroCuenta,
          titular_cuenta: updates.titularCuenta,
        })
        .eq('id', id);

      if (error) {
        throw new Error(error.message);
      }
    } catch (error: any) {
      console.error('Error updating employee:', error);
      throw error;
    }
  }

  static async delete(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('employees')
        .delete()
        .eq('id', id);

      if (error) {
        throw new Error(error.message);
      }
    } catch (error: any) {
      console.error('Error deleting employee:', error);
      throw error;
    }
  }

  static async changeStatus(id: string, newStatus: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('employees')
        .update({ estado: newStatus })
        .eq('id', id);

      if (error) {
        throw new Error(error.message);
      }
    } catch (error: any) {
      console.error('Error changing employee status:', error);
      throw error;
    }
  }

  // Note: These methods are for future functionality - the database columns don't exist yet
  static async updateCentroCosto(id: string, centroCosto: string): Promise<void> {
    try {
      // This would need a migration to add the centro_costo column
      console.log('Centro costo update requested but column does not exist yet');
      throw new Error('Funcionalidad no disponible aún - requiere migración de base de datos');
    } catch (error: any) {
      console.error('Error updating centro costo:', error);
      throw error;
    }
  }

  static async updateNivelRiesgoARL(id: string, nivelRiesgo: 'I' | 'II' | 'III' | 'IV' | 'V'): Promise<void> {
    try {
      // This would need a migration to add the nivel_riesgo_arl column
      console.log('ARL risk level update requested but column does not exist yet');
      throw new Error('Funcionalidad no disponible aún - requiere migración de base de datos');
    } catch (error: any) {
      console.error('Error updating ARL risk level:', error);
      throw error;
    }
  }

  private static transformToEmployee(data: any): Employee {
    return {
      id: data.id,
      cedula: data.cedula,
      tipoDocumento: data.tipo_documento || 'CC',
      nombre: data.nombre,
      apellido: data.apellido,
      email: data.email,
      telefono: data.telefono,
      salarioBase: data.salario_base,
      tipoContrato: data.tipo_contrato || 'indefinido',
      fechaIngreso: data.fecha_ingreso,
      estado: data.estado || 'activo',
      eps: data.eps,
      afp: data.afp,
      arl: data.arl,
      cajaCompensacion: data.caja_compensacion,
      cargo: data.cargo,
      empresaId: data.company_id,
      estadoAfiliacion: data.estado_afiliacion || 'pendiente',
      banco: data.banco,
      tipoCuenta: data.tipo_cuenta,
      numeroCuenta: data.numero_cuenta,
      titularCuenta: data.titular_cuenta,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  }
}
