import { supabase } from '@/integrations/supabase/client';
import { Employee, mapDatabaseToUnified, mapUnifiedToDatabase } from '@/types/employee-unified';

export class EmployeeUnifiedService {
  static async getAll(): Promise<{ success: boolean; data?: Employee[]; error?: string }> {
    try {
      console.log('🔄 EmployeeUnifiedService: Fetching all employees');
      
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching employees:', error);
        return { success: false, error: error.message };
      }

      console.log('✅ EmployeeUnifiedService: Fetched', data?.length || 0, 'employees');
      
      return {
        success: true,
        data: (data || []).map(mapDatabaseToUnified)
      };
    } catch (error: any) {
      console.error('❌ EmployeeUnifiedService getAll error:', error);
      return { success: false, error: error.message };
    }
  }

  static async getById(id: string): Promise<{ success: boolean; data?: Employee | null; error?: string }> {
    try {
      console.log('🔄 EmployeeUnifiedService: Fetching employee by ID:', id);
      
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('❌ Error fetching employee:', error);
        return { success: false, error: error.message };
      }

      console.log('✅ EmployeeUnifiedService: Fetched employee:', data?.nombre, data?.apellido);
      
      return {
        success: true,
        data: data ? mapDatabaseToUnified(data) : null
      };
    } catch (error: any) {
      console.error('❌ EmployeeUnifiedService getById error:', error);
      return { success: false, error: error.message };
    }
  }

  static async create(employeeData: any): Promise<{ success: boolean; data?: Employee; error?: string }> {
    try {
      console.log('🔄 EmployeeUnifiedService: Creating employee with data:', employeeData);
      
      // Get current user's company ID
      const { data: companyData, error: companyError } = await supabase
        .rpc('get_current_user_company_id');

      if (companyError || !companyData) {
        console.error('❌ Error getting company ID:', companyError);
        throw new Error('No se pudo obtener la empresa del usuario');
      }

      // Prepare employee data without avatar field for database
      const dbEmployeeData = {
        ...employeeData,
        company_id: companyData,
        // Remove avatar as it's not in the database schema
        avatar: undefined
      };

      const { data, error } = await supabase
        .from('employees')
        .insert([dbEmployeeData])
        .select()
        .single();

      if (error) {
        console.error('❌ Error creating employee:', error);
        throw error;
      }

      console.log('✅ EmployeeUnifiedService: Employee created successfully:', data);
      
      return {
        success: true,
        data: mapDatabaseToUnified(data)
      };
    } catch (error: any) {
      console.error('❌ EmployeeUnifiedService create error:', error);
      return {
        success: false,
        error: error.message || 'Error creating employee'
      };
    }
  }

  static async update(id: string, employeeData: any): Promise<{ success: boolean; data?: Employee; error?: string }> {
    try {
      console.log('🔄 EmployeeUnifiedService: Updating employee:', id, 'with data:', employeeData);
      
      // Prepare employee data for database (remove avatar)
      const dbEmployeeData = {
        ...employeeData,
        avatar: undefined // Remove avatar as it's not in the database schema
      };
      
      const { data, error } = await supabase
        .from('employees')
        .update(dbEmployeeData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('❌ Error updating employee:', error);
        return { success: false, error: error.message };
      }

      console.log('✅ EmployeeUnifiedService: Employee updated successfully:', data);
      
      return {
        success: true,
        data: mapDatabaseToUnified(data)
      };
    } catch (error: any) {
      console.error('❌ EmployeeUnifiedService update error:', error);
      return {
        success: false,
        error: error.message || 'Error updating employee'
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
        console.error('❌ Error deleting employee:', error);
        return { success: false, error: error.message };
      }

      console.log('✅ EmployeeUnifiedService: Employee deleted successfully:', id);
      
      return { success: true };
    } catch (error: any) {
      console.error('❌ EmployeeUnifiedService delete error:', error);
      return { success: false, error: error.message };
    }
  }

  static async changeStatus(id: string, newStatus: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('🔄 EmployeeUnifiedService: Changing employee status:', id, 'to', newStatus);
      
      const { error } = await supabase
        .from('employees')
        .update({ estado: newStatus })
        .eq('id', id);

      if (error) {
        console.error('❌ Error changing employee status:', error);
        return { success: false, error: error.message };
      }

      console.log('✅ EmployeeUnifiedService: Employee status changed successfully');
      return { success: true };
    } catch (error: any) {
      console.error('❌ EmployeeUnifiedService changeStatus error:', error);
      return { success: false, error: error.message };
    }
  }
}
