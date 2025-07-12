
import { supabase } from '@/integrations/supabase/client';

export class PayrollDeletionService {
  /**
   * Elimina un empleado directamente de la base de datos para un período específico
   * Now also considers soft deleted employees
   */
  static async deleteEmployeeFromPeriod(
    periodId: string, 
    employeeId: string, 
    companyId: string
  ): Promise<void> {
    console.log('🗑️ PayrollDeletionService - Deleting employee from period:', {
      periodId, 
      employeeId, 
      companyId
    });

    try {
      // Check if employee is soft deleted
      const { data: employee } = await supabase
        .from('employees')
        .select('estado')
        .eq('id', employeeId)
        .single();

      if (employee?.estado === 'eliminado') {
        console.warn('⚠️ Attempting to delete payroll for soft deleted employee:', employeeId);
      }

      // Eliminación directa en la base de datos
      const { error: deleteError } = await supabase
        .from('payrolls')
        .delete()
        .eq('company_id', companyId)
        .eq('period_id', periodId)
        .eq('employee_id', employeeId);

      if (deleteError) {
        console.error('❌ Error deleting employee from DB:', deleteError);
        throw deleteError;
      }

      console.log('✅ Employee deleted successfully from DB');
    } catch (error) {
      console.error('❌ PayrollDeletionService error:', error);
      throw error;
    }
  }

  /**
   * Valida si un empleado existe en un período antes de eliminarlo
   * Now excludes soft deleted employees from validation
   */
  static async validateEmployeeInPeriod(
    periodId: string, 
    employeeId: string, 
    companyId: string
  ): Promise<boolean> {
    try {
      // First check if employee is not soft deleted
      const { data: employee } = await supabase
        .from('employees')
        .select('estado')
        .eq('id', employeeId)
        .single();

      if (employee?.estado === 'eliminado') {
        console.log('⚠️ Employee is soft deleted, validation failed:', employeeId);
        return false;
      }

      const { data, error } = await supabase
        .from('payrolls')
        .select('id')
        .eq('company_id', companyId)
        .eq('period_id', periodId)
        .eq('employee_id', employeeId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
        throw error;
      }

      return !!data;
    } catch (error) {
      console.error('❌ Error validating employee in period:', error);
      return false;
    }
  }

  /**
   * Registra la eliminación para auditoría
   */
  static async logDeletion(
    periodId: string, 
    employeeId: string, 
    companyId: string, 
    employeeName: string
  ): Promise<void> {
    try {
      console.log('📝 Logging employee deletion:', {
        periodId, 
        employeeId, 
        employeeName
      });

      // Aquí se podría implementar una tabla de auditoría específica si es necesario
      // Por ahora solo loggeamos en consola
      
    } catch (error) {
      console.warn('⚠️ Could not log deletion (non-critical):', error);
    }
  }
}
