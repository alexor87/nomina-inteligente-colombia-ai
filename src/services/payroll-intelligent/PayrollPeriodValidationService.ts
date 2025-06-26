
import { supabase } from '@/integrations/supabase/client';
import { PayrollPeriodService, PayrollPeriod } from '../PayrollPeriodService';

export class PayrollPeriodValidationService {
  // Validar que no haya periodos superpuestos
  static async validateNonOverlappingPeriod(
    startDate: string, 
    endDate: string, 
    excludePeriodId?: string
  ): Promise<{ isValid: boolean; conflictPeriod?: PayrollPeriod }> {
    try {
      const companyId = await PayrollPeriodService.getCurrentUserCompanyId();
      if (!companyId) return { isValid: false };

      const query = supabase
        .from('payroll_periods')
        .select('*')
        .eq('company_id', companyId)
        .or(`fecha_inicio.lte.${endDate},fecha_fin.gte.${startDate}`);

      if (excludePeriodId) {
        query.neq('id', excludePeriodId);
      }

      const { data, error } = await query;

      if (error) throw error;

      if (data && data.length > 0) {
        return { 
          isValid: false, 
          conflictPeriod: data[0] as PayrollPeriod 
        };
      }

      return { isValid: true };
    } catch (error) {
      console.error('❌ Error validando superposición de periodos:', error);
      return { isValid: false };
    }
  }
}
