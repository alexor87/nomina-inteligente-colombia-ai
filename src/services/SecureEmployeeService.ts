import { supabase } from '@/lib/supabaseClient';
import { EmployeeDataWithBanking } from './EmployeeCRUDService';
import { EmployeeUnified } from '@/types/employee-unified';

export class SecureEmployeeService {
  static async create(employeeData: EmployeeDataWithBanking): Promise<EmployeeUnified> {
    try {
      console.log('🔒 SecureEmployeeService: Creating employee', employeeData);

      const { data, error } = await supabase
        .from('employees')
        .insert([employeeData])
        .select()
        .single();

      if (error) {
        console.error('❌ Error creating employee:', error);
        throw new Error(`Error al crear empleado: ${error.message}`);
      }

      console.log('✅ Employee created successfully', data);
      return data as EmployeeUnified;
    } catch (error) {
      console.error('❌ SecureEmployeeService: Error creating employee:', error);
      throw error;
    }
  }

  static async getEmployeeById(employeeId: string): Promise<{ data: EmployeeUnified | null; error: any; success: boolean }> {
    try {
      console.log('🔒 SecureEmployeeService: Getting employee by ID', employeeId);

      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('id', employeeId)
        .single();

      if (error) {
        console.error('❌ Error getting employee:', error);
        return { data: null, error: error, success: false };
      }

      console.log('✅ Employee retrieved successfully', data);
      return { data: data as EmployeeUnified, error: null, success: true };
    } catch (error) {
      console.error('❌ SecureEmployeeService: Error getting employee:', error);
      return { data: null, error: error, success: false };
    }
  }

  static async update(employeeId: string, updates: Partial<EmployeeUnified>): Promise<EmployeeUnified> {
    try {
      console.log('🔒 SecureEmployeeService: Updating employee', { employeeId, updates });

      const { data, error } = await supabase
        .from('employees')
        .update(updates)
        .eq('id', employeeId)
        .select()
        .single();

      if (error) {
        console.error('❌ Error updating employee:', error);
        throw new Error(`Error al actualizar empleado: ${error.message}`);
      }

      console.log('✅ Employee updated successfully', data);
      return data as EmployeeUnified;
    } catch (error) {
      console.error('❌ SecureEmployeeService: Error updating employee:', error);
      throw error;
    }
  }

  static async delete(employeeId: string): Promise<void> {
    try {
      console.log('🔒 SecureEmployeeService: Deleting employee', employeeId);

      const { error } = await supabase
        .from('employees')
        .delete()
        .eq('id', employeeId);

      if (error) {
        console.error('❌ Error deleting employee:', error);
        throw new Error(`Error al eliminar empleado: ${error.message}`);
      }

      console.log('✅ Employee deleted successfully');
    } catch (error) {
      console.error('❌ SecureEmployeeService: Error deleting employee:', error);
      throw error;
    }
  }

  static async changeStatus(
    employeeId: string, 
    newStatus: 'activo' | 'inactivo' | 'vacaciones' | 'incapacidad'
  ): Promise<void> {
    try {
      console.log('🔄 SecureEmployeeService: Changing employee status', {
        employeeId,
        newStatus
      });

      const { error } = await supabase
        .from('employees')
        .update({ estado: newStatus })
        .eq('id', employeeId);

      if (error) {
        console.error('❌ Error changing employee status:', error);
        throw new Error(`Error al cambiar estado: ${error.message}`);
      }

      console.log('✅ Employee status changed successfully');
    } catch (error) {
      console.error('❌ SecureEmployeeService: Error changing status:', error);
      throw error;
    }
  }
}
