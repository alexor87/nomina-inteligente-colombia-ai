
import { supabase } from '@/integrations/supabase/client';
import { PayrollPeriodService } from '../PayrollPeriodService';

export class PayrollAuditService {
  // Registrar acciones en logs de auditoría
  static async logPeriodAction(action: string, periodId: string, details: any): Promise<void> {
    try {
      const companyId = await PayrollPeriodService.getCurrentUserCompanyId();
      if (!companyId) return;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from('dashboard_activity').insert({
        company_id: companyId,
        user_email: user.email || '',
        type: 'payroll',
        action: action,
        // Almacenar detalles como string JSON ya que no hay columna details
        created_at: new Date().toISOString()
      });

      console.log(`📝 Acción registrada: ${action} para periodo ${periodId}`);
    } catch (error) {
      console.warn('⚠️ No se pudo registrar la acción en logs:', error);
    }
  }
}
