
import { supabase } from '@/integrations/supabase/client';
import { PayrollEmployee } from '@/types/payroll';

export class PayrollUnifiedService {
  static async getEmployeesForPeriod(periodId: string): Promise<PayrollEmployee[]> {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('estado', 'activo');

      if (error) {
        throw new Error(error.message);
      }

      // Map to PayrollEmployee with required properties
      return data.map(employee => ({
        id: employee.id,
        name: `${employee.nombre} ${employee.apellido}`,
        position: employee.cargo || 'Sin cargo',
        baseSalary: employee.salario_base || 0,
        workedDays: 30,
        extraHours: 0,
        disabilities: 0,
        bonuses: 0,
        absences: 0,
        eps: employee.eps || '',
        afp: employee.afp || '',
        novedades: [],
        grossPay: employee.salario_base || 0,
        deductions: 0,
        netPay: employee.salario_base || 0,
        transportAllowance: 0,
        employerContributions: 0,
        ibc: employee.salario_base || 0,
        status: 'valid' as const,
        errors: [],
        healthDeduction: 0,
        pensionDeduction: 0,
        effectiveWorkedDays: 30,
        incapacityDays: 0,
        incapacityValue: 0,
        legalBasis: '',
        cedula: employee.cedula
      }));
    } catch (error: any) {
      console.error('Error fetching employees for period:', error);
      throw error;
    }
  }

  static async addEmployeeToPeriod(employeeId: string, periodId: string): Promise<void> {
    // Implementation for adding employee to period
    console.log(`Adding employee ${employeeId} to period ${periodId}`);
  }

  static async removeEmployeeFromPeriod(employeeId: string, periodId: string): Promise<void> {
    // Implementation for removing employee from period
    console.log(`Removing employee ${employeeId} from period ${periodId}`);
  }
}
