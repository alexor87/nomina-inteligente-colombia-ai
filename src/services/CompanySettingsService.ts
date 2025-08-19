
import { supabase } from '@/integrations/supabase/client';
import { CompanySettings, CompanySettingsFormData } from '@/types/company-settings';

export class CompanySettingsService {
  static async getCompanySettings(companyId: string): Promise<CompanySettings | null> {
    try {
      const { data, error } = await supabase
        .from('company_settings')
        .select('*')
        .eq('company_id', companyId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error fetching company settings:', error);
      throw error;
    }
  }

  static async upsertCompanySettings(
    companyId: string, 
    settings: CompanySettingsFormData
  ): Promise<CompanySettings> {
    try {
      const { data, error } = await supabase
        .from('company_settings')
        .upsert({
          company_id: companyId,
          ...settings,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating company settings:', error);
      throw error;
    }
  }

  static getDefaultSettings(): CompanySettingsFormData {
    return {
      periodicity: 'mensual',
      custom_period_days: 30,
      provision_mode: 'on_liquidation'
    };
  }
}
