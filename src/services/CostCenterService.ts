
import { supabase } from '@/integrations/supabase/client';
import { CostCenter, CostCenterFormData } from '@/types/cost-centers';
import { logger } from '@/lib/logger';

export class CostCenterService {
  static async getCostCenters(companyId: string): Promise<CostCenter[]> {
    try {
      const { data, error } = await supabase
        .from('cost_centers')
        .select('*')
        .eq('company_id', companyId)
        .eq('active', true)
        .order('code');

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Error loading cost centers:', error);
      return [];
    }
  }

  static async createCostCenter(companyId: string, formData: CostCenterFormData): Promise<CostCenter | null> {
    try {
      const { data, error } = await supabase
        .from('cost_centers')
        .insert({
          company_id: companyId,
          code: formData.code,
          name: formData.name,
          description: formData.description || null
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Error creating cost center:', error);
      throw error;
    }
  }

  static async updateCostCenter(id: string, formData: CostCenterFormData, companyId: string): Promise<CostCenter | null> {
    try {
      const { data, error } = await supabase
        .from('cost_centers')
        .update({
          code: formData.code,
          name: formData.name,
          description: formData.description || null
        })
        .eq('id', id)
        .eq('company_id', companyId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Error updating cost center:', error);
      throw error;
    }
  }

  static async deleteCostCenter(id: string, companyId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('cost_centers')
        .update({ active: false })
        .eq('id', id)
        .eq('company_id', companyId);

      if (error) throw error;
      return true;
    } catch (error) {
      logger.error('Error deleting cost center:', error);
      return false;
    }
  }
}
