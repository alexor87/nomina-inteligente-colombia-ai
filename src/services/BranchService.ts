
import { supabase } from '@/integrations/supabase/client';
import { Branch, BranchFormData } from '@/types/branches';

export class BranchService {
  static async getBranches(companyId: string): Promise<Branch[]> {
    try {
      const { data, error } = await supabase
        .from('branches')
        .select('*')
        .eq('company_id', companyId)
        .eq('active', true)
        .order('code');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error loading branches:', error);
      return [];
    }
  }

  static async createBranch(companyId: string, formData: BranchFormData): Promise<Branch | null> {
    try {
      const { data, error } = await supabase
        .from('branches')
        .insert({
          company_id: companyId,
          code: formData.code,
          name: formData.name,
          address: formData.address || null,
          city: formData.city || null,
          department: formData.department || null,
          phone: formData.phone || null,
          manager_name: formData.manager_name || null
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating branch:', error);
      throw error;
    }
  }

  static async updateBranch(id: string, formData: BranchFormData): Promise<Branch | null> {
    try {
      const { data, error } = await supabase
        .from('branches')
        .update({
          code: formData.code,
          name: formData.name,
          address: formData.address || null,
          city: formData.city || null,
          department: formData.department || null,
          phone: formData.phone || null,
          manager_name: formData.manager_name || null
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating branch:', error);
      throw error;
    }
  }

  static async deleteBranch(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('branches')
        .update({ active: false })
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting branch:', error);
      return false;
    }
  }
}
