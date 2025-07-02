
import { supabase } from '@/integrations/supabase/client';
import { UNIFIED_PAYROLL_STATES } from '@/constants/payrollStatesUnified';

export interface DataIntegrityReport {
  timestamp: string;
  companyId: string;
  totalPeriods: number;
  duplicatePeriods: number;
  orphanedPayrolls: number;
  missingPeriodIds: number;
  stateConsistencyIssues: number;
  recommendations: string[];
}

export class PayrollDataIntegrityService {
  static async generateIntegrityReport(companyId: string): Promise<DataIntegrityReport> {
    try {
      console.log('🔍 GENERANDO REPORTE DE INTEGRIDAD para empresa:', companyId);
      
      // Check for duplicate periods
      const { data: duplicates } = await supabase
        .from('payroll_periods_real')
        .select('periodo, count(*)')
        .eq('company_id', companyId)
        .group('periodo')
        .having('count(*) > 1');

      // Check for orphaned payrolls (payrolls without corresponding period)
      const { data: orphanedPayrolls } = await supabase
        .from('payrolls')
        .select('id, periodo')
        .eq('company_id', companyId)
        .is('period_id', null);

      // Check for missing period_id in payrolls
      const { data: missingPeriodIds } = await supabase
        .from('payrolls')
        .select('id')
        .eq('company_id', companyId)
        .is('period_id', null);

      // Check for state consistency issues
      const { data: invalidStates } = await supabase
        .from('payroll_periods_real')
        .select('id, estado')
        .eq('company_id', companyId)
        .not('estado', 'in', `(${Object.values(UNIFIED_PAYROLL_STATES).map(s => `'${s}'`).join(',')})`);

      // Get total periods count
      const { count: totalPeriods } = await supabase
        .from('payroll_periods_real')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId);

      const recommendations: string[] = [];
      
      if (duplicates && duplicates.length > 0) {
        recommendations.push('Eliminar períodos duplicados encontrados');
      }
      
      if (orphanedPayrolls && orphanedPayrolls.length > 0) {
        recommendations.push('Crear períodos faltantes para nóminas huérfanas');
      }
      
      if (missingPeriodIds && missingPeriodIds.length > 0) {
        recommendations.push('Actualizar period_id en registros de nómina');
      }
      
      if (invalidStates && invalidStates.length > 0) {
        recommendations.push('Normalizar estados no reconocidos');
      }

      if (recommendations.length === 0) {
        recommendations.push('✅ Los datos están íntegros y sincronizados');
      }

      const report: DataIntegrityReport = {
        timestamp: new Date().toISOString(),
        companyId,
        totalPeriods: totalPeriods || 0,
        duplicatePeriods: duplicates ? duplicates.length : 0,
        orphanedPayrolls: orphanedPayrolls ? orphanedPayrolls.length : 0,
        missingPeriodIds: missingPeriodIds ? missingPeriodIds.length : 0,
        stateConsistencyIssues: invalidStates ? invalidStates.length : 0,
        recommendations
      };

      console.log('📊 REPORTE DE INTEGRIDAD GENERADO:', report);
      return report;

    } catch (error) {
      console.error('❌ Error generando reporte de integridad:', error);
      throw error;
    }
  }

  static async runAutomaticCleanup(companyId: string): Promise<{ success: boolean; message: string }> {
    try {
      console.log('🧹 EJECUTANDO LIMPIEZA AUTOMÁTICA...');
      
      // Update missing period_ids
      const { error: updateError } = await supabase.rpc('sync_payroll_periods');
      
      if (updateError) {
        throw updateError;
      }

      console.log('✅ Limpieza automática completada');
      return {
        success: true,
        message: 'Limpieza automática ejecutada exitosamente'
      };

    } catch (error) {
      console.error('❌ Error en limpieza automática:', error);
      return {
        success: false,
        message: `Error en limpieza: ${error}`
      };
    }
  }

  static async validatePeriodConsistency(companyId: string, periodo: string): Promise<boolean> {
    try {
      // Check if period exists in both tables
      const { data: periodReal } = await supabase
        .from('payroll_periods_real')
        .select('id')
        .eq('company_id', companyId)
        .eq('periodo', periodo)
        .single();

      const { data: payrollsExist } = await supabase
        .from('payrolls')
        .select('id')
        .eq('company_id', companyId)
        .eq('periodo', periodo)
        .limit(1);

      // Both should exist for consistency
      return !!(periodReal && payrollsExist && payrollsExist.length > 0);

    } catch (error) {
      console.error('❌ Error validando consistencia de período:', error);
      return false;
    }
  }
}
