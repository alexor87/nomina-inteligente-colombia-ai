
import { supabase } from '@/integrations/supabase/client';
import { Employee } from '@/types';
import { CompanyConfigurationService } from '@/services/CompanyConfigurationService';

export class EmployeeService {
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

      return data || [];
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

      return data;
    } catch (error) {
      console.error('Error in getEmployeeById:', error);
      throw error;
    }
  }

  static async createEmployee(employeeData: Partial<Employee>): Promise<Employee> {
    try {
      const companyId = await CompanyConfigurationService.getCurrentUserCompanyId();
      if (!companyId) {
        throw new Error('No se pudo obtener el ID de la empresa');
      }

      const { data, error } = await supabase
        .from('employees')
        .insert({
          ...employeeData,
          company_id: companyId
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating employee:', error);
        throw new Error(`Error al crear empleado: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Error in createEmployee:', error);
      throw error;
    }
  }

  static async updateEmployee(id: string, employeeData: Partial<Employee>): Promise<Employee> {
    try {
      const companyId = await CompanyConfigurationService.getCurrentUserCompanyId();
      if (!companyId) {
        throw new Error('No se pudo obtener el ID de la empresa');
      }

      const { data, error } = await supabase
        .from('employees')
        .update(employeeData)
        .eq('id', id)
        .eq('company_id', companyId)
        .select()
        .single();

      if (error) {
        console.error('Error updating employee:', error);
        throw new Error(`Error al actualizar empleado: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Error in updateEmployee:', error);
      throw error;
    }
  }

  static async deleteEmployee(id: string): Promise<void> {
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
      console.error('Error in deleteEmployee:', error);
      throw error;
    }
  }

  static async changeEmployeeStatus(id: string, newStatus: string): Promise<Employee> {
    try {
      return await this.updateEmployee(id, { estado: newStatus });
    } catch (error) {
      console.error('Error changing employee status:', error);
      throw error;
    }
  }
}
