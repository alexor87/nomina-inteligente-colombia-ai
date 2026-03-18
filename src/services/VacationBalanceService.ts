
import { supabase } from '@/integrations/supabase/client';

export interface VacationBalanceData {
  employee_id: string;
  company_id: string;
  initial_balance: number;
  accumulated_days?: number;
}

export class VacationBalanceService {
  static async createBalance(data: VacationBalanceData) {
    const { data: result, error } = await supabase
      .from('employee_vacation_balances')
      .insert({
        employee_id: data.employee_id,
        company_id: data.company_id,
        initial_balance: data.initial_balance,
        accumulated_days: data.accumulated_days || data.initial_balance,
      })
      .select()
      .single();

    if (error) throw error;
    return result;
  }

  static async updateBalance(employeeId: string, companyId: string, data: Partial<VacationBalanceData>) {
    const { data: result, error } = await supabase
      .from('employee_vacation_balances')
      .update({
        ...data,
        updated_at: new Date().toISOString()
      })
      .eq('employee_id', employeeId)
      .eq('company_id', companyId)
      .select()
      .single();

    if (error) throw error;
    return result;
  }

  static async getBalance(employeeId: string, companyId: string) {
    const { data, error } = await supabase
      .from('employee_vacation_balances')
      .select('*')
      .eq('employee_id', employeeId)
      .eq('company_id', companyId)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  static async deleteBalance(employeeId: string, companyId: string) {
    const { error } = await supabase
      .from('employee_vacation_balances')
      .delete()
      .eq('employee_id', employeeId)
      .eq('company_id', companyId);

    if (error) throw error;
  }
}
