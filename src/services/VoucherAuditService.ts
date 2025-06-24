
import { supabase } from '@/integrations/supabase/client';

export class VoucherAuditService {
  static async logAction(
    voucherId: string, 
    companyId: string,
    action: 'generated' | 'downloaded' | 'sent_email' | 'regenerated' | 'viewed',
    method?: string, 
    recipient?: string
  ): Promise<void> {
    try {
      await supabase
        .from('voucher_audit_log')
        .insert({
          company_id: companyId,
          voucher_id: voucherId,
          user_id: 'system', // TODO: obtener usuario actual
          action,
          method,
          recipient_email: recipient,
          success: true
        });
    } catch (error) {
      console.error('Error logging voucher action:', error);
    }
  }
}
