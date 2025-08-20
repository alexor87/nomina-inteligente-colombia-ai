
import { supabase } from '@/integrations/supabase/client';

export interface PayrollPolicies {
  id?: string;
  company_id: string;
  ibc_mode: 'proportional' | 'fixed';
  incapacity_policy: 'standard_2d_100_rest_66' | 'from_day1_66_with_floor';
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface PayrollPoliciesFormData {
  ibc_mode: 'proportional' | 'fixed';
  incapacity_policy: 'standard_2d_100_rest_66' | 'from_day1_66_with_floor';
  notes?: string;
}

export class PayrollPoliciesService {
  static async getPayrollPolicies(companyId: string): Promise<PayrollPolicies | null> {
    try {
      const { data, error } = await supabase
        .from('company_payroll_policies')
        .select('*')
        .eq('company_id', companyId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (!data) return null;

      return {
        ...(data as any),
        ibc_mode: (data as any).ibc_mode || 'proportional',
        incapacity_policy: (data as any).incapacity_policy || 'standard_2d_100_rest_66',
      };
    } catch (error) {
      console.error('Error fetching payroll policies:', error);
      throw error;
    }
  }

  static async upsertPayrollPolicies(
    companyId: string, 
    policies: PayrollPoliciesFormData
  ): Promise<PayrollPolicies> {
    try {
      const { data, error } = await supabase
        .from('company_payroll_policies')
        .upsert({
          company_id: companyId,
          ...policies,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      return {
        ...(data as any),
        ibc_mode: (data as any).ibc_mode || policies.ibc_mode || 'proportional',
        incapacity_policy: (data as any).incapacity_policy || policies.incapacity_policy || 'standard_2d_100_rest_66',
      };
    } catch (error) {
      console.error('Error updating payroll policies:', error);
      throw error;
    }
  }

  static getDefaultPolicies(): PayrollPoliciesFormData {
    return {
      ibc_mode: 'proportional',
      incapacity_policy: 'standard_2d_100_rest_66',
      notes: ''
    };
  }
}
