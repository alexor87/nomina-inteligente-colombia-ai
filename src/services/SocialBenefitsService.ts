
import { supabase } from '@/integrations/supabase/client';
import type { CalculateBenefitPayload, BenefitCalculationResponse } from '@/types/social-benefits';

export class SocialBenefitsService {
  static async calculatePreview(payload: Omit<CalculateBenefitPayload, 'save'>): Promise<BenefitCalculationResponse> {
    console.log('📐 SocialBenefitsService.calculatePreview payload:', payload);
    const { data, error } = await supabase.functions.invoke<BenefitCalculationResponse>('calculate-social-benefits', {
      body: { ...payload, save: false }
    });
    if (error) {
      console.error('❌ calculatePreview error:', error);
      return { success: false, error: error.message || 'invoke_error' };
    }
    console.log('✅ calculatePreview result:', data);
    return data!;
  }

  static async calculateAndSave(payload: Omit<CalculateBenefitPayload, 'save'> & { notes?: string; periodId?: string }): Promise<BenefitCalculationResponse> {
    console.log('💾 SocialBenefitsService.calculateAndSave payload:', payload);
    const { data, error } = await supabase.functions.invoke<BenefitCalculationResponse>('calculate-social-benefits', {
      body: { ...payload, save: true }
    });
    if (error) {
      console.error('❌ calculateAndSave error:', error);
      return { success: false, error: error.message || 'invoke_error' };
    }
    console.log('✅ calculateAndSave result:', data);
    return data!;
  }
}
