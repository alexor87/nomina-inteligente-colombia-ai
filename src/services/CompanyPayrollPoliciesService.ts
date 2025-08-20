
import { supabase } from '@/integrations/supabase/client';

export interface CompanyPayrollPolicies {
  id?: string;
  company_id: string;
  ibc_mode: 'proportional' | 'full_salary';
  incapacity_policy: 'standard_2d_100_rest_66' | 'from_day1_66_with_floor';
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export class CompanyPayrollPoliciesService {
  static async getPayrollPolicies(companyId: string): Promise<CompanyPayrollPolicies | null> {
    try {
      console.log('🔄 Loading payroll policies for company:', companyId);
      
      const { data, error } = await supabase
        .from('company_payroll_policies')
        .select('*')
        .eq('company_id', companyId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (!data) {
        console.log('⚠️ No existing payroll policies found');
        return null;
      }

      console.log('✅ Loaded payroll policies:', data);
      return data as CompanyPayrollPolicies;
    } catch (error) {
      console.error('❌ Error fetching payroll policies:', error);
      throw error;
    }
  }

  static async upsertPayrollPolicies(
    companyId: string, 
    policies: Omit<CompanyPayrollPolicies, 'id' | 'company_id' | 'created_at' | 'updated_at'>
  ): Promise<CompanyPayrollPolicies> {
    try {
      console.log('💾 Upserting payroll policies for company:', companyId, policies);
      
      const { data, error } = await supabase
        .from('company_payroll_policies')
        .upsert({
          company_id: companyId,
          ...policies,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'company_id'
        })
        .select()
        .single();

      if (error) throw error;

      console.log('✅ Payroll policies saved successfully:', data);
      return data as CompanyPayrollPolicies;
    } catch (error) {
      console.error('❌ Error saving payroll policies:', error);
      throw error;
    }
  }

  static getDefaultPolicies(): Omit<CompanyPayrollPolicies, 'id' | 'company_id' | 'created_at' | 'updated_at'> {
    return {
      ibc_mode: 'proportional',
      incapacity_policy: 'standard_2d_100_rest_66',
      notes: null
    };
  }
}
