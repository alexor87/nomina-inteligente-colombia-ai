
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

export class EmployeeUnifiedService {
  static async getAll(): Promise<{ data: EmployeeUnified[] | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*');

      if (error) {
        console.error('Error fetching employees:', error);
        return { data: null, error };
      }

      return { data, error: null };
    } catch (error: any) {
      console.error('Unexpected error fetching employees:', error);
      return { data: null, error: { message: error.message } };
    }
  }

  static async getEmployeeById(id: string): Promise<{ success: boolean; data: EmployeeUnified | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error(`Error fetching employee with ID ${id}:`, error);
        return { success: false, data: null, error: error.message };
      }

      return { success: true, data, error: null };
    } catch (error: any) {
      console.error(`Unexpected error fetching employee with ID ${id}:`, error);
      return { success: false, data: null, error: error.message };
    }
  }

  static async create(employee: Partial<EmployeeUnified>): Promise<EmployeeUnified> {
    try {
      const { data, error } = await supabase
        .from('employees')
        .insert([employee])
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data;
    } catch (error: any) {
      console.error('Error creating employee:', error);
      throw error;
    }
  }

  static async update(id: string, updates: Partial<EmployeeUnified>): Promise<EmployeeUnified> {
    try {
      const { data, error } = await supabase
        .from('employees')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data;
    } catch (error: any) {
      console.error(`Error updating employee with ID ${id}:`, error);
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
      console.error(`Error deleting employee with ID ${id}:`, error);
      throw error;
    }
  }

  static async updatePayrollRecords(periodId: string): Promise<void> {
    try {
      console.log('Updating payroll records for period:', periodId);
      // Implementation for updating payroll records
      return;
    } catch (error: any) {
      console.error('Error updating payroll records:', error);
      throw error;
    }
  }

  static async getEmployeesForPeriod(periodId: string): Promise<UnifiedEmployeeData[]> {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('estado', 'activo');

      if (error) {
        throw new Error(error.message);
      }

      // Map to UnifiedEmployeeData with payroll properties
      return data.map(employee => ({
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
    } catch (error: any) {
      console.error('Error fetching employees for period:', error);
      throw error;
    }
  }

  static getConfigurationInfo() {
    return {
      salarioMinimo: 1300000,
      auxilioTransporte: 162000,
      maxTransportAllowanceLimit: 2600000
    };
  }

  static async changeStatus(id: string, status: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('employees')
        .update({ estado: status })
        .eq('id', id);

      if (error) {
        throw new Error(error.message);
      }
    } catch (error: any) {
      console.error(`Error changing status for employee ${id}:`, error);
      throw error;
    }
  }
}
