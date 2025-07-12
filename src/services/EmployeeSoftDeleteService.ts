
import { supabase } from '@/integrations/supabase/client';
import { EmployeeUnified, mapDatabaseToUnified } from '@/types/employee-unified';

export class EmployeeSoftDeleteService {
  /**
   * Soft delete an employee by changing their status to 'eliminado'
   */
  static async softDeleteEmployee(employeeId: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('🗑️ Soft deleting employee:', employeeId);
      
      const { error } = await supabase
        .from('employees')
        .update({ 
          estado: 'eliminado',
          updated_at: new Date().toISOString()
        })
        .eq('id', employeeId);

      if (error) {
        console.error('❌ Error soft deleting employee:', error);
        throw error;
      }

      console.log('✅ Employee soft deleted successfully:', employeeId);
      return { success: true };
    } catch (error) {
      console.error('❌ EmployeeSoftDeleteService error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Error desconocido' 
      };
    }
  }

  /**
   * Restore a soft deleted employee by changing their status to 'activo'
   */
  static async restoreEmployee(employeeId: string): Promise<{ success: boolean; data?: EmployeeUnified; error?: string }> {
    try {
      console.log('🔄 Restoring employee:', employeeId);
      
      const { data, error } = await supabase
        .from('employees')
        .update({ 
          estado: 'activo',
          updated_at: new Date().toISOString()
        })
        .eq('id', employeeId)
        .select()
        .single();

      if (error) {
        console.error('❌ Error restoring employee:', error);
        throw error;
      }

      if (!data) {
        throw new Error('No data returned from employee restoration');
      }

      const employee = mapDatabaseToUnified(data);
      console.log('✅ Employee restored successfully:', employee.nombre, employee.apellido);
      return { success: true, data: employee };
    } catch (error) {
      console.error('❌ EmployeeSoftDeleteService error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Error desconocido' 
      };
    }
  }

  /**
   * Get all soft deleted employees for recovery purposes
   */
  static async getDeletedEmployees(): Promise<{ success: boolean; data?: EmployeeUnified[]; error?: string }> {
    try {
      console.log('🔍 Fetching deleted employees');
      
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('estado', 'eliminado')
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching deleted employees:', error);
        throw error;
      }

      if (!data) {
        console.log('⚠️ No deleted employees found');
        return { success: true, data: [] };
      }

      const employees = data.map(mapDatabaseToUnified);
      
      console.log(`✅ Successfully fetched ${employees.length} deleted employees`);
      return { success: true, data: employees };
    } catch (error) {
      console.error('❌ EmployeeSoftDeleteService error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Error desconocido' 
      };
    }
  }

  /**
   * Permanently delete an employee (hard delete)
   * This should only be used in special cases and by administrators
   */
  static async permanentlyDeleteEmployee(employeeId: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('💀 Permanently deleting employee:', employeeId);
      
      // First check if employee is soft deleted
      const { data: employee } = await supabase
        .from('employees')
        .select('estado')
        .eq('id', employeeId)
        .single();

      if (employee?.estado !== 'eliminado') {
        throw new Error('Employee must be soft deleted before permanent deletion');
      }

      const { error } = await supabase
        .from('employees')
        .delete()
        .eq('id', employeeId);

      if (error) {
        console.error('❌ Error permanently deleting employee:', error);
        throw error;
      }

      console.log('✅ Employee permanently deleted:', employeeId);
      return { success: true };
    } catch (error) {
      console.error('❌ EmployeeSoftDeleteService error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Error desconocido' 
      };
    }
  }
}
