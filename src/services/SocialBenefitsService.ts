
import { supabase } from '@/integrations/supabase/client';
import type { CalculateBenefitPayload, BenefitCalculationResponse } from '@/types/social-benefits';

export class SocialBenefitsService {
  static async calculatePreview(payload: Omit<CalculateBenefitPayload, 'save'>): Promise<BenefitCalculationResponse> {
    console.log('📐 SocialBenefitsService.calculatePreview payload:', payload);
    
    // ✅ CORREGIDO: Usar provision-social-benefits para coherencia
    const { data, error } = await supabase.functions.invoke<BenefitCalculationResponse>('provision-social-benefits', {
      body: { 
        period_id: payload.periodId,
        preview_mode: true // Indicar que es solo preview
      }
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
    
    // ✅ CORREGIDO: Usar provision-social-benefits para coherencia
    const { data, error } = await supabase.functions.invoke<BenefitCalculationResponse>('provision-social-benefits', {
      body: { 
        period_id: payload.periodId,
        notes: payload.notes
      }
    });
    
    if (error) {
      console.error('❌ calculateAndSave error:', error);
      return { success: false, error: error.message || 'invoke_error' };
    }
    console.log('✅ calculateAndSave result:', data);
    return data!;
  }
}
