import { supabase } from '@/integrations/supabase/client';

export interface RecalculationResult {
  success: boolean;
  employees_processed: number;
  period_id: string;
  error?: string;
}

export class PayrollRecalculationService {
  static async recalculateIBC(periodId: string, companyId: string): Promise<RecalculationResult> {
    try {
      console.log('🔄 Starting IBC recalculation for period:', periodId);
      
      const { data, error } = await supabase.functions.invoke('payroll-recalc-ibc', {
        body: {
          action: 'recalculate_ibc',
          data: {
            period_id: periodId,
            company_id: companyId
          }
        }
      });

      if (error) {
        console.error('❌ IBC recalculation error:', error);
        throw error;
      }

      console.log('✅ IBC recalculation completed:', data);
      return data;
    } catch (error) {
      console.error('❌ Error calling IBC recalculation:', error);
      throw error;
    }
  }

  // New: Recalculate and persist payroll values without closing the period
  static async recalculatePayrollValues(periodId: string, companyId: string): Promise<RecalculationResult> {
    try {
      console.log('🔄 Persisting recalculated payroll values for period:', periodId);

      const { data, error } = await supabase.functions.invoke('payroll-liquidation-atomic', {
        body: {
          action: 'recalculate_payroll_values',
          data: {
            period_id: periodId,
            company_id: companyId
          }
        }
      });

      if (error) {
        console.error('❌ Payroll values recalculation error:', error);
        throw error;
      }

      console.log('✅ Payroll values persisted successfully:', data);
      return data as RecalculationResult;
    } catch (error) {
      console.error('❌ Error calling payroll values recalculation:', error);
      throw error;
    }
  }
}