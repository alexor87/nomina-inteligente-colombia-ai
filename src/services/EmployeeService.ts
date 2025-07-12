
import { supabase } from '@/integrations/supabase/client';
import { EmployeeUnified, mapDatabaseToUnified, mapUnifiedToDatabase } from '@/types/employee-unified';
import { EmployeeDataMapper } from './EmployeeDataMapper';

export class EmployeeService {
  /**
   * Get all employees for the current company
   */
  static async getEmployees(): Promise<{ success: boolean; data?: EmployeeUnified[]; error?: string }> {
    try {
      console.log('🔄 EmployeeService: Fetching employees');
      
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ EmployeeService: Error fetching employees:', error);
        throw error;
      }

      if (!data) {
        console.log('⚠️ EmployeeService: No employees found');
        return { success: true, data: [] };
      }

      // Map database records to EmployeeUnified format
      const employees = data.map(mapDatabaseToUnified);
      
      console.log(`✅ EmployeeService: Successfully fetched ${employees.length} employees`);
      return { success: true, data: employees };
    } catch (error) {
      console.error('❌ EmployeeService: Error in getEmployees:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Error desconocido' 
      };
    }
  }

  /**
   * Get employee by ID
   */
  static async getEmployeeById(id: string): Promise<EmployeeUnified | null> {
    try {
      console.log('🔄 EmployeeService: Fetching employee by ID:', id);
      
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('❌ EmployeeService: Error fetching employee:', error);
        throw error;
      }

      if (!data) {
        console.log('⚠️ EmployeeService: Employee not found:', id);
        return null;
      }

      const employee = mapDatabaseToUnified(data);
      console.log('✅ EmployeeService: Successfully fetched employee:', employee.nombre, employee.apellido);
      return employee;
    } catch (error) {
      console.error('❌ EmployeeService: Error in getEmployeeById:', error);
      return null;
    }
  }

  /**
   * Create new employee
   */
  static async createEmployee(employeeData: Omit<EmployeeUnified, 'id' | 'createdAt' | 'updatedAt'>): Promise<{ success: boolean; data?: EmployeeUnified; error?: string }> {
    try {
      console.log('🔄 EmployeeService: Creating employee:', employeeData.nombre, employeeData.apellido);
      
      // ✅ FIXED: Ensure required fields are present before mapping
      const requiredData = {
        ...employeeData,
        company_id: employeeData.company_id || '',
        // Ensure all required fields have values
        nombre: employeeData.nombre || '',
        apellido: employeeData.apellido || '',
        cedula: employeeData.cedula || '',
        salarioBase: employeeData.salarioBase || 0,
        fechaIngreso: employeeData.fechaIngreso || new Date().toISOString().split('T')[0]
      };

      // Map to database format
      const dbData = mapUnifiedToDatabase(requiredData);

      const { data, error } = await supabase
        .from('employees')
        .insert([dbData]) // ✅ FIXED: Wrap in array for insert
        .select()
        .single();

      if (error) {
        console.error('❌ EmployeeService: Error creating employee:', error);
        throw error;
      }

      if (!data) {
        throw new Error('No data returned from employee creation');
      }

      const employee = mapDatabaseToUnified(data);
      console.log('✅ EmployeeService: Successfully created employee:', employee.nombre, employee.apellido);
      return { success: true, data: employee };
    } catch (error) {
      console.error('❌ EmployeeService: Error in createEmployee:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Error desconocido' 
      };
    }
  }

  /**
   * Update employee
   */
  static async updateEmployee(id: string, updates: Partial<EmployeeUnified>): Promise<{ success: boolean; data?: EmployeeUnified; error?: string }> {
    try {
      console.log('🔄 EmployeeService: Updating employee:', id);
      
      // ✅ FIXED: Ensure company_id is handled correctly
      const updateData = {
        ...updates,
        company_id: updates.company_id || updates.empresaId || ''
      };

      // Map to database format, but only the fields that are being updated
      const dbUpdates = mapUnifiedToDatabase(updateData);

      // Remove fields that shouldn't be updated
      delete dbUpdates.id; // ID shouldn't change
      
      const { data, error } = await supabase
        .from('employees')
        .update(dbUpdates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('❌ EmployeeService: Error updating employee:', error);
        throw error;
      }

      if (!data) {
        throw new Error('No data returned from employee update');
      }

      const employee = mapDatabaseToUnified(data);
      console.log('✅ EmployeeService: Successfully updated employee:', employee.nombre, employee.apellido);
      return { success: true, data: employee };
    } catch (error) {
      console.error('❌ EmployeeService: Error in updateEmployee:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Error desconocido' 
      };
    }
  }

  /**
   * Delete employee
   */
  static async deleteEmployee(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('🔄 EmployeeService: Deleting employee:', id);
      
      const { error } = await supabase
        .from('employees')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('❌ EmployeeService: Error deleting employee:', error);
        throw error;
      }

      console.log('✅ EmployeeService: Successfully deleted employee:', id);
      return { success: true };
    } catch (error) {
      console.error('❌ EmployeeService: Error in deleteEmployee:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Error desconocido' 
      };
    }
  }
}
