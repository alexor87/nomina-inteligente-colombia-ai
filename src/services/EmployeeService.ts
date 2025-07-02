
import { supabase } from '@/integrations/supabase/client';
import { EmployeeUnified, mapDatabaseToUnified, mapUnifiedToDatabase } from '@/types/employee-unified';

export class EmployeeService {
  static async getAllEmployees(): Promise<EmployeeUnified[]> {
    try {
      console.log('🔄 EmployeeService: Fetching all employees');
      
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching employees:', error);
        throw error;
      }

      console.log('✅ EmployeeService: Fetched', data?.length || 0, 'employees');
      
      return (data || []).map(mapDatabaseToUnified);
    } catch (error) {
      console.error('❌ EmployeeService getAllEmployees error:', error);
      throw error;
    }
  }

  static async getEmployeeById(id: string): Promise<EmployeeUnified | null> {
    try {
      console.log('🔄 EmployeeService: Fetching employee by ID:', id);
      
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          console.log('ℹ️ Employee not found:', id);
          return null;
        }
        console.error('❌ Error fetching employee:', error);
        throw error;
      }

      console.log('✅ EmployeeService: Fetched employee:', data?.nombre, data?.apellido);
      
      return mapDatabaseToUnified(data);
    } catch (error) {
      console.error('❌ EmployeeService getEmployeeById error:', error);
      throw error;
    }
  }

  static async createEmployee(employeeData: Omit<EmployeeUnified, 'id' | 'createdAt' | 'updatedAt'>): Promise<EmployeeUnified> {
    try {
      console.log('🔄 EmployeeService: Creating employee:', employeeData.nombre, employeeData.apellido);
      
      const dbData = mapUnifiedToDatabase(employeeData);
      
      const { data, error } = await supabase
        .from('employees')
        .insert([dbData])
        .select()
        .single();

      if (error) {
        console.error('❌ Error creating employee:', error);
        throw error;
      }

      console.log('✅ EmployeeService: Created employee:', data?.nombre, data?.apellido);
      
      return mapDatabaseToUnified(data);
    } catch (error) {
      console.error('❌ EmployeeService createEmployee error:', error);
      throw error;
    }
  }

  static async updateEmployee(id: string, employeeData: Partial<EmployeeUnified>): Promise<EmployeeUnified> {
    try {
      console.log('🔄 EmployeeService: Updating employee:', id);
      
      const dbData = mapUnifiedToDatabase(employeeData);
      
      const { data, error } = await supabase
        .from('employees')
        .update(dbData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('❌ Error updating employee:', error);
        throw error;
      }

      console.log('✅ EmployeeService: Updated employee:', data?.nombre, data?.apellido);
      
      return mapDatabaseToUnified(data);
    } catch (error) {
      console.error('❌ EmployeeService updateEmployee error:', error);
      throw error;
    }
  }

  static async deleteEmployee(id: string): Promise<void> {
    try {
      console.log('🔄 EmployeeService: Deleting employee:', id);
      
      const { error } = await supabase
        .from('employees')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('❌ Error deleting employee:', error);
        throw error;
      }

      console.log('✅ EmployeeService: Deleted employee:', id);
    } catch (error) {
      console.error('❌ EmployeeService deleteEmployee error:', error);
      throw error;
    }
  }

  static async changeEmployeeStatus(id: string, newStatus: string): Promise<void> {
    try {
      console.log('🔄 EmployeeService: Changing employee status:', id, 'to', newStatus);
      
      const { error } = await supabase
        .from('employees')
        .update({ estado: newStatus })
        .eq('id', id);

      if (error) {
        console.error('❌ Error changing employee status:', error);
        throw error;
      }

      console.log('✅ EmployeeService: Changed employee status successfully');
    } catch (error) {
      console.error('❌ EmployeeService changeEmployeeStatus error:', error);
      throw error;
    }
  }

  // Add backward compatibility methods
  static async create(employeeData: any): Promise<EmployeeUnified> {
    return this.createEmployee(employeeData);
  }

  static async update(id: string, employeeData: any): Promise<EmployeeUnified> {
    return this.updateEmployee(id, employeeData);
  }

  static async delete(id: string): Promise<void> {
    return this.deleteEmployee(id);
  }

  static async changeStatus(id: string, newStatus: string): Promise<void> {
    return this.changeEmployeeStatus(id, newStatus);
  }

  // Alias for backward compatibility
  static async getEmployees(): Promise<EmployeeUnified[]> {
    return this.getAllEmployees();
  }
}
