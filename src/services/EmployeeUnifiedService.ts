
import { supabase } from '@/integrations/supabase/client';
import { EmployeeUnified, mapDatabaseToUnified, mapUnifiedToDatabase } from '@/types/employee-unified';

export class EmployeeUnifiedService {
  static async getAll(): Promise<{ success: boolean; data?: EmployeeUnified[]; error?: string }> {
    try {
      console.log('🔄 EmployeeUnifiedService: Fetching all employees');
      
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ EmployeeUnifiedService: Error fetching employees:', error);
        throw error;
      }

      if (!data) {
        console.log('⚠️ EmployeeUnifiedService: No employees found');
        return { success: true, data: [] };
      }

      // Map database records to EmployeeUnified format
      const employees = data.map(mapDatabaseToUnified);
      
      console.log(`✅ EmployeeUnifiedService: Successfully fetched ${employees.length} employees`);
      return { success: true, data: employees };
    } catch (error) {
      console.error('❌ EmployeeUnifiedService: Error in getAll:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Error desconocido' 
      };
    }
  }

  static async getById(id: string): Promise<{ success: boolean; data?: EmployeeUnified; error?: string }> {
    try {
      console.log('🔄 EmployeeUnifiedService: Fetching employee by ID:', id);
      
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('❌ EmployeeUnifiedService: Error fetching employee:', error);
        throw error;
      }

      if (!data) {
        console.log('⚠️ EmployeeUnifiedService: Employee not found:', id);
        return { success: false, error: 'Empleado no encontrado' };
      }

      const employee = mapDatabaseToUnified(data);
      console.log('✅ EmployeeUnifiedService: Successfully fetched employee:', employee.nombre, employee.apellido);
      return { success: true, data: employee };
    } catch (error) {
      console.error('❌ EmployeeUnifiedService: Error in getById:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Error desconocido' 
      };
    }
  }

  static async create(employeeData: Omit<EmployeeUnified, 'id' | 'createdAt' | 'updatedAt'>): Promise<{ success: boolean; data?: EmployeeUnified; error?: string }> {
    try {
      console.log('🔄 EmployeeUnifiedService: Creating employee:', employeeData.nombre, employeeData.apellido);
      
      // Map to database format
      const dbData = mapUnifiedToDatabase(employeeData);

      // ✅ FIXED: Ensure required fields for insertion
      const insertData = {
        ...dbData,
        company_id: employeeData.company_id,
        nombre: employeeData.nombre,
        apellido: employeeData.apellido,
        cedula: employeeData.cedula,
        salario_base: employeeData.salarioBase
      };

      const { data, error } = await supabase
        .from('employees')
        .insert([insertData]) // ✅ FIXED: Use array format
        .select()
        .single();

      if (error) {
        console.error('❌ EmployeeUnifiedService: Error creating employee:', error);
        throw error;
      }

      if (!data) {
        throw new Error('No data returned from employee creation');
      }

      const employee = mapDatabaseToUnified(data);
      console.log('✅ EmployeeUnifiedService: Successfully created employee:', employee.nombre, employee.apellido);
      return { success: true, data: employee };
    } catch (error) {
      console.error('❌ EmployeeUnifiedService: Error in create:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Error desconocido' 
      };
    }
  }

  static async update(id: string, updates: Partial<EmployeeUnified>): Promise<{ success: boolean; data?: EmployeeUnified; error?: string }> {
    try {
      console.log('🔄 EmployeeUnifiedService: Updating employee:', id);
      
      // Map to database format, but only the fields that are being updated
      const dbUpdates = mapUnifiedToDatabase(updates);

      // Remove fields that shouldn't be updated
      delete dbUpdates.id; // ID shouldn't change
      
      const { data, error } = await supabase
        .from('employees')
        .update(dbUpdates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('❌ EmployeeUnifiedService: Error updating employee:', error);
        throw error;
      }

      if (!data) {
        throw new Error('No data returned from employee update');
      }

      const employee = mapDatabaseToUnified(data);
      console.log('✅ EmployeeUnifiedService: Successfully updated employee:', employee.nombre, employee.apellido);
      return { success: true, data: employee };
    } catch (error) {
      console.error('❌ EmployeeUnifiedService: Error in update:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Error desconocido' 
      };
    }
  }

  static async delete(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('🔄 EmployeeUnifiedService: Deleting employee:', id);
      
      const { error } = await supabase
        .from('employees')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('❌ EmployeeUnifiedService: Error deleting employee:', error);
        throw error;
      }

      console.log('✅ EmployeeUnifiedService: Successfully deleted employee:', id);
      return { success: true };
    } catch (error) {
      console.error('❌ EmployeeUnifiedService: Error in delete:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Error desconocido' 
      };
    }
  }
}
