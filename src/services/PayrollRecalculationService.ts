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

  // Re-liquidate only stale payroll records for a period (minimal and fast)
  static async reliquidateStaleForPeriod(periodId: string, justification: string = 'Auto-reliquidación por registros desactualizados'): Promise<{ success: boolean; employeesAffected: number; correctionsApplied?: number; message?: string; }> {
    try {
      console.log('🔎 Buscando empleados con payroll is_stale=true para período:', periodId);

      const { data: staleRows, error: fetchErr } = await (supabase.from('payrolls') as any)
        .select('employee_id')
        .eq('period_id', periodId)
        .eq('is_stale', true);

      if (fetchErr) {
        console.error('❌ Error consultando payrolls stale:', fetchErr);
        throw fetchErr;
      }

      const employeeIds = Array.from(new Set((staleRows || []).map(r => r.employee_id))).filter(Boolean);
      if (employeeIds.length === 0) {
        console.log('✅ No hay registros stale para re-liquidar');
        return { success: true, employeesAffected: 0, message: 'Sin registros stale' };
      }

      console.log(`♻️ Re-liquidando ${employeeIds.length} empleado(s) con registros stale...`);

      const { data: result, error: invokeErr } = await supabase.functions.invoke('reliquidate-period-adjustments', {
        body: {
          periodId,
          affectedEmployeeIds: employeeIds,
          justification,
          options: { reliquidateScope: 'affected', regenerateVouchers: false, sendEmails: false }
        }
      });

      if (invokeErr) {
        console.error('❌ Error invocando re-liquidación de stale:', invokeErr);
        throw invokeErr;
      }

      console.log('✅ Re-liquidación de stale completada:', result);
      return { success: true, employeesAffected: result?.employeesAffected ?? employeeIds.length, correctionsApplied: result?.correctionsApplied, message: result?.message };
    } catch (err: any) {
      console.error('❌ reliquidateStaleForPeriod error:', err);
      return { success: false, employeesAffected: 0, message: err?.message || 'invoke_error' };
    }
  }
}