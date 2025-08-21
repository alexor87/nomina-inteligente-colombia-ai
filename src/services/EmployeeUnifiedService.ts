
import { supabase } from '@/integrations/supabase/client';
import { EmployeeUnified } from '@/types/employee-unified';

export interface UnifiedEmployeeData extends EmployeeUnified {
  // Additional properties for payroll calculations
  name?: string;
  baseSalary?: number;
  workedDays?: number;
  totalEarnings?: number;
  totalDeductions?: number;
  netPay?: number;
  transportAllowance?: number;
  healthDeduction?: number;
  pensionDeduction?: number;
  status?: 'valid' | 'error' | 'incomplete';
}

export interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export class EmployeeUnifiedService {
  static async getAll(): Promise<ServiceResponse<EmployeeUnified[]>> {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*');

      if (error) {
        console.error('Error fetching employees:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data: data || [] };
    } catch (error: any) {
      console.error('Unexpected error fetching employees:', error);
      return { success: false, error: error.message };
    }
  }

  static async getEmployeeById(id: string): Promise<ServiceResponse<EmployeeUnified>> {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error(`Error fetching employee with ID ${id}:`, error);
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error: any) {
      console.error(`Unexpected error fetching employee with ID ${id}:`, error);
      return { success: false, error: error.message };
    }
  }

  static async create(employee: Partial<EmployeeUnified>): Promise<ServiceResponse<EmployeeUnified>> {
    try {
      const { data, error } = await supabase
        .from('employees')
        .insert([employee])
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error: any) {
      console.error('Error creating employee:', error);
      return { success: false, error: error.message };
    }
  }

  static async update(id: string, updates: Partial<EmployeeUnified>): Promise<ServiceResponse<EmployeeUnified>> {
    try {
      const { data, error } = await supabase
        .from('employees')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error: any) {
      console.error(`Error updating employee with ID ${id}:`, error);
      return { success: false, error: error.message };
    }
  }

  static async delete(id: string): Promise<ServiceResponse<void>> {
    try {
      const { error } = await supabase
        .from('employees')
        .delete()
        .eq('id', id);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error: any) {
      console.error(`Error deleting employee with ID ${id}:`, error);
      return { success: false, error: error.message };
    }
  }

  static async changeStatus(id: string, status: string): Promise<ServiceResponse<void>> {
    try {
      const { error } = await supabase
        .from('employees')
        .update({ estado: status })
        .eq('id', id);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error: any) {
      console.error(`Error changing status for employee ${id}:`, error);
      return { success: false, error: error.message };
    }
  }

  static async updatePayrollRecords(periodId: string): Promise<ServiceResponse<void>> {
    try {
      console.log('Updating payroll records for period:', periodId);
      // Implementation for updating payroll records
      return { success: true };
    } catch (error: any) {
      console.error('Error updating payroll records:', error);
      return { success: false, error: error.message };
    }
  }

  static async getEmployeesForPeriod(periodId: string): Promise<ServiceResponse<UnifiedEmployeeData[]>> {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('estado', 'activo');

      if (error) {
        return { success: false, error: error.message };
      }

      // Map to UnifiedEmployeeData with payroll properties
      const employees = data.map(employee => ({
        ...employee,
        name: `${employee.nombre} ${employee.apellido}`,
        baseSalary: employee.salario_base || 0,
        workedDays: 30,
        totalEarnings: employee.salario_base || 0,
        totalDeductions: 0,
        netPay: employee.salario_base || 0,
        transportAllowance: 0,
        healthDeduction: 0,
        pensionDeduction: 0,
        status: 'valid' as const
      }));

      return { success: true, data: employees };
    } catch (error: any) {
      console.error('Error fetching employees for period:', error);
      return { success: false, error: error.message };
    }
  }

  static async getConfigurationInfo(): Promise<ServiceResponse<any>> {
    try {
      const config = {
        salarioMinimo: 1300000,
        auxilioTransporte: 162000,
        maxTransportAllowanceLimit: 2600000
      };
      return { success: true, data: config };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}
