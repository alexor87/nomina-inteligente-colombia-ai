import { supabase } from '@/integrations/supabase/client';
import { PayrollEmployee } from '@/types/payroll';

export class PayrollLiquidationNewService {
  static async getEmployeesForPeriod(periodId: string): Promise<PayrollEmployee[]> {
    try {
      const { data, error } = await supabase
        .from('payroll_employees')
        .select('*')
        .eq('period_id', periodId);

      if (error) {
        console.error('Error fetching employees for period:', error);
        return [];
      }

      return data.map(empData => this.createPayrollEmployee(empData));
    } catch (error) {
      console.error('Error in getEmployeesForPeriod:', error);
      return [];
    }
  }

  static async saveEmployeeLiquidation(employee: PayrollEmployee, periodId: string): Promise<PayrollEmployee | null> {
    try {
      const { data, error } = await supabase
        .from('payroll_employees')
        .upsert({
          ...employee,
          period_id: periodId,
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' })
        .select('*')
        .single();

      if (error) {
        console.error('Error saving employee liquidation:', error);
        return null;
      }

      return this.createPayrollEmployee(data);
    } catch (error) {
      console.error('Error in saveEmployeeLiquidation:', error);
      return null;
    }
  }

  static async deleteEmployeeLiquidation(employeeId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('payroll_employees')
        .delete()
        .eq('id', employeeId);

      if (error) {
        console.error('Error deleting employee liquidation:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in deleteEmployeeLiquidation:', error);
      return false;
    }
  }

  static async calculateEmployeeBonuses(employeeId: string): Promise<number> {
    try {
      // Implement the logic to calculate bonuses for an employee
      // This could involve fetching data from different tables and applying specific rules
      // For now, let's assume a fixed bonus amount
      return 1000;
    } catch (error) {
      console.error('Error calculating employee bonuses:', error);
      return 0;
    }
  }

  static async updateEmployeeStatus(employeeId: string, status: 'valid' | 'error'): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('payroll_employees')
        .update({ status })
        .eq('id', employeeId);

      if (error) {
        console.error('Error updating employee status:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in updateEmployeeStatus:', error);
      return false;
    }
  }

  private static createPayrollEmployee(empData: any): PayrollEmployee {
    return {
      id: empData.id || 'unknown',
      name: typeof empData.name === 'string' ? empData.name : 'Empleado Desconocido',
      position: empData.position || 'Sin cargo',
      baseSalary: Number(empData.baseSalary || 0),
      workedDays: Number(empData.workedDays || 15),
      extraHours: Number(empData.extraHours || 0),
      disabilities: Number(empData.disabilities || 0),
      bonuses: Number(empData.bonuses || 0),
      absences: Number(empData.absences || 0),
      grossPay: Number(empData.grossPay || 0),
      deductions: Number(empData.deductions || 0),
      netPay: Number(empData.netPay || 0),
      transportAllowance: Number(empData.transportAllowance || 0),
      employerContributions: Number(empData.employerContributions || 0),
      eps: empData.eps || 'No asignada',
      afp: empData.afp || 'No asignada',
      status: (empData.status === 'error' ? 'error' : 'valid') as 'valid' | 'error',
      errors: Array.isArray(empData.errors) ? empData.errors : [],
      healthDeduction: Number(empData.healthDeduction || 0),
      pensionDeduction: Number(empData.pensionDeduction || 0),
      ibc: Number(empData.ibc || empData.grossPay || 0),
      effectiveWorkedDays: Number(empData.effectiveWorkedDays || empData.workedDays || 15),
      incapacityDays: Number(empData.incapacityDays || 0),
      incapacityValue: Number(empData.incapacityValue || 0),
      legalBasis: empData.legalBasis || 'Cálculo estándar'
    };
  }
}
