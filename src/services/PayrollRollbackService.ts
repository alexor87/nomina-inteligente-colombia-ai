import { supabase } from '@/integrations/supabase/client';
import { PayrollVersionService } from './PayrollVersionService';

export interface RollbackValidation {
  canRollback: boolean;
  reason?: string;
  affectedEmployees: number;
  impactSummary: {
    employeesChanged: number;
    totalValueDifference: number;
    hasVouchers: boolean;
  };
}

export interface RollbackImpact {
  employeeChanges: Array<{
    employeeId: string;
    employeeName: string;
    currentValue: number;
    newValue: number;
    difference: number;
  }>;
  totalImpact: {
    grossPayDifference: number;
    netPayDifference: number;
    affectedCount: number;
  };
}

export class PayrollRollbackService {
  /**
   * Validate if rollback to specific version is possible
   */
  static async canRollbackToVersion(versionId: string, periodId: string): Promise<RollbackValidation> {
    try {
      console.log('🔍 Validating rollback to version:', versionId);
      
      // Get target version data
      const targetVersion = await PayrollVersionService.getVersionData(versionId);
      if (!targetVersion) {
        return {
          canRollback: false,
          reason: 'Versión no encontrada',
          affectedEmployees: 0,
          impactSummary: { employeesChanged: 0, totalValueDifference: 0, hasVouchers: false }
        };
      }

      // Check if period is closed
      const { data: period, error: periodError } = await supabase
        .from('payroll_periods_real')
        .select('estado')
        .eq('id', periodId)
        .single();

      if (periodError || !period) {
        return {
          canRollback: false,
          reason: 'Período no encontrado',
          affectedEmployees: 0,
          impactSummary: { employeesChanged: 0, totalValueDifference: 0, hasVouchers: false }
        };
      }

      if (period.estado !== 'cerrado') {
        return {
          canRollback: false,
          reason: 'Solo se puede restaurar períodos cerrados',
          affectedEmployees: 0,
          impactSummary: { employeesChanged: 0, totalValueDifference: 0, hasVouchers: false }
        };
      }

      // Check for existing vouchers
      const { data: vouchers, error: voucherError } = await supabase
        .from('payroll_vouchers')
        .select('id')
        .eq('periodo', targetVersion.snapshot_data?.period || '')
        .limit(1);

      const hasVouchers = !voucherError && vouchers && vouchers.length > 0;

      // Calculate impact
      const currentPayrolls = await this.getCurrentPayrollData(periodId);
      const targetPayrolls = targetVersion.snapshot_data?.payrolls || [];
      
      const affectedEmployees = this.calculateAffectedEmployees(currentPayrolls, targetPayrolls);
      const totalValueDifference = this.calculateTotalValueDifference(currentPayrolls, targetPayrolls);

      return {
        canRollback: true,
        affectedEmployees: affectedEmployees,
        impactSummary: {
          employeesChanged: affectedEmployees,
          totalValueDifference,
          hasVouchers
        }
      };
    } catch (error) {
      console.error('❌ Error validating rollback:', error);
      return {
        canRollback: false,
        reason: 'Error al validar rollback',
        affectedEmployees: 0,
        impactSummary: { employeesChanged: 0, totalValueDifference: 0, hasVouchers: false }
      };
    }
  }

  /**
   * Get detailed rollback impact analysis
   */
  static async getRollbackImpact(versionId: string, periodId: string): Promise<RollbackImpact> {
    try {
      const targetVersion = await PayrollVersionService.getVersionData(versionId);
      if (!targetVersion) {
        throw new Error('Versión no encontrada');
      }

      const currentPayrolls = await this.getCurrentPayrollData(periodId);
      const targetPayrolls = targetVersion.snapshot_data?.payrolls || [];

      const employeeChanges = this.calculateDetailedChanges(currentPayrolls, targetPayrolls);
      
      const totalImpact = {
        grossPayDifference: employeeChanges.reduce((sum, change) => sum + change.difference, 0),
        netPayDifference: employeeChanges.reduce((sum, change) => sum + change.difference, 0), // Simplified
        affectedCount: employeeChanges.length
      };

      return {
        employeeChanges,
        totalImpact
      };
    } catch (error) {
      console.error('❌ Error calculating rollback impact:', error);
      throw error;
    }
  }

  /**
   * Execute rollback to specific version
   */
  static async rollbackToVersion(
    versionId: string, 
    periodId: string, 
    justification: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      console.log('🔄 Starting rollback to version:', versionId);

      // Validate rollback is possible
      const validation = await this.canRollbackToVersion(versionId, periodId);
      if (!validation.canRollback) {
        return {
          success: false,
          message: validation.reason || 'No se puede ejecutar el rollback'
        };
      }

      // Get target version data
      const targetVersion = await PayrollVersionService.getVersionData(versionId);
      if (!targetVersion) {
        return { success: false, message: 'Versión objetivo no encontrada' };
      }

      // Execute rollback via edge function for atomicity
      const { data, error } = await supabase.functions.invoke('rollback-payroll-version', {
        body: {
          versionId,
          periodId,
          justification,
          targetSnapshot: targetVersion.snapshot_data
        }
      });

      if (error) {
        console.error('❌ Rollback failed:', error);
        return {
          success: false,
          message: `Error en rollback: ${error.message}`
        };
      }

      console.log('✅ Rollback completed successfully');
      return {
        success: true,
        message: 'Rollback ejecutado exitosamente'
      };
    } catch (error) {
      console.error('❌ Error in rollback:', error);
      return {
        success: false,
        message: `Error ejecutando rollback: ${error instanceof Error ? error.message : 'Error desconocido'}`
      };
    }
  }

  /**
   * Create audit log for rollback operation
   */
  static async createRollbackAuditLog(
    periodId: string,
    versionId: string,
    justification: string,
    success: boolean,
    error?: string
  ): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (!profile) return;

      await supabase.from('security_audit_log').insert({
        company_id: profile.company_id,
        user_id: user.id,
        table_name: 'payroll_periods_real',
        action: success ? 'ROLLBACK_SUCCESS' : 'ROLLBACK_FAILED',
        violation_type: 'payroll_rollback',
        query_attempted: `Rollback to version ${versionId}`,
        additional_data: {
          period_id: periodId,
          version_id: versionId,
          justification,
          error,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.warn('⚠️ Could not create rollback audit log:', error);
    }
  }

  // Private helper methods
  private static async getCurrentPayrollData(periodId: string) {
    const { data, error } = await supabase
      .from('payrolls')
      .select('employee_id, neto_pagado, total_devengado')
      .eq('period_id', periodId);

    if (error) throw error;
    return data || [];
  }

  private static calculateAffectedEmployees(current: any[], target: any[]): number {
    const currentMap = new Map(current.map(p => [p.employee_id, p.neto_pagado]));
    const targetMap = new Map(target.map(p => [p.employee_id, p.neto_pagado]));
    
    let affected = 0;
    for (const [employeeId, currentValue] of currentMap) {
      const targetValue = targetMap.get(employeeId) || 0;
      if (currentValue !== targetValue) {
        affected++;
      }
    }

    return affected;
  }

  private static calculateTotalValueDifference(current: any[], target: any[]): number {
    const currentTotal = current.reduce((sum, p) => sum + (p.neto_pagado || 0), 0);
    const targetTotal = target.reduce((sum, p) => sum + (p.neto_pagado || 0), 0);
    
    return Math.abs(currentTotal - targetTotal);
  }

  private static calculateDetailedChanges(current: any[], target: any[]): Array<{
    employeeId: string;
    employeeName: string;
    currentValue: number;
    newValue: number;
    difference: number;
  }> {
    const currentMap = new Map(current.map(p => [p.employee_id, p]));
    const targetMap = new Map(target.map(p => [p.employee_id, p]));
    
    const changes: Array<{
      employeeId: string;
      employeeName: string;
      currentValue: number;
      newValue: number;
      difference: number;
    }> = [];

    // Check all employees in current payroll
    for (const [employeeId, currentPayroll] of currentMap) {
      const targetPayroll = targetMap.get(employeeId);
      const currentValue = currentPayroll.neto_pagado || 0;
      const targetValue = targetPayroll?.neto_pagado || 0;
      
      if (currentValue !== targetValue) {
        changes.push({
          employeeId,
          employeeName: currentPayroll.employee_nombre || targetPayroll?.employee_nombre || 'Empleado desconocido',
          currentValue,
          newValue: targetValue,
          difference: targetValue - currentValue
        });
      }
    }

    return changes;
  }
}