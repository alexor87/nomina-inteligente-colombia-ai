import { supabase } from '@/integrations/supabase/client';

export interface ConsistencyIssue {
  type: 'state_mismatch' | 'missing_vouchers' | 'orphaned_payrolls' | 'incomplete_liquidation';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  periodId: string;
  periodName: string;
  autoRepairable: boolean;
  repairAction?: string;
  details: any;
}

export interface ConsistencyReport {
  overallHealth: 'healthy' | 'minor_issues' | 'major_issues' | 'critical';
  totalIssues: number;
  criticalIssues: number;
  issues: ConsistencyIssue[];
  timestamp: string;
}

export interface RepairResult {
  success: boolean;
  issuesRepaired: number;
  issuesRemaining: number;
  details: string[];
  errors: string[];
}

export class PayrollConsistencyService {
  /**
   * Diagnóstico completo de consistencia del sistema
   */
  static async diagnoseConsistency(companyId: string): Promise<ConsistencyReport> {
    console.log('🏥 [CONSISTENCY] Iniciando diagnóstico completo...', { companyId });
    
    try {
      const issues: ConsistencyIssue[] = [];
      
      // 1. Detectar períodos con estados inconsistentes
      const stateMismatchIssues = await this.detectStateMismatchIssues(companyId);
      issues.push(...stateMismatchIssues);
      
      // 2. Detectar períodos cerrados sin vouchers
      const missingVoucherIssues = await this.detectMissingVoucherIssues(companyId);
      issues.push(...missingVoucherIssues);
      
      // 3. Detectar payrolls huérfanos
      const orphanedPayrollIssues = await this.detectOrphanedPayrollIssues(companyId);
      issues.push(...orphanedPayrollIssues);
      
      // 4. Detectar liquidaciones incompletas
      const incompleteLiquidationIssues = await this.detectIncompleteLiquidationIssues(companyId);
      issues.push(...incompleteLiquidationIssues);
      
      const criticalIssues = issues.filter(i => i.severity === 'critical').length;
      const totalIssues = issues.length;
      
      let overallHealth: ConsistencyReport['overallHealth'] = 'healthy';
      if (criticalIssues > 0) overallHealth = 'critical';
      else if (totalIssues > 5) overallHealth = 'major_issues';
      else if (totalIssues > 0) overallHealth = 'minor_issues';
      
      console.log('📊 [CONSISTENCY] Diagnóstico completado:', {
        overallHealth,
        totalIssues,
        criticalIssues
      });
      
      return {
        overallHealth,
        totalIssues,
        criticalIssues,
        issues,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('❌ [CONSISTENCY] Error en diagnóstico:', error);
      throw new Error(`Error en diagnóstico de consistencia: ${error.message}`);
    }
  }
  
  /**
   * Detectar períodos con estados inconsistentes (cerrado pero payrolls en borrador)
   */
  private static async detectStateMismatchIssues(companyId: string): Promise<ConsistencyIssue[]> {
    const issues: ConsistencyIssue[] = [];
    
    try {
      // Buscar períodos cerrados con payrolls en borrador
      const { data: inconsistentPeriods } = await supabase
        .from('payroll_periods_real')
        .select(`
          id,
          periodo,
          estado,
          payrolls!inner(id, estado)
        `)
        .eq('company_id', companyId)
        .eq('estado', 'cerrado')
        .eq('payrolls.estado', 'borrador');
      
      if (inconsistentPeriods) {
        for (const period of inconsistentPeriods) {
          issues.push({
            type: 'state_mismatch',
            severity: 'critical',
            description: `Período cerrado pero con payrolls en borrador`,
            periodId: period.id,
            periodName: period.periodo,
            autoRepairable: true,
            repairAction: 'Sincronizar estado de payrolls con período',
            details: {
              periodState: period.estado,
              payrollsInDraft: period.payrolls?.length || 0
            }
          });
        }
      }
      
    } catch (error) {
      console.error('Error detectando inconsistencias de estado:', error);
    }
    
    return issues;
  }
  
  /**
   * Detectar períodos cerrados sin vouchers generados
   */
  private static async detectMissingVoucherIssues(companyId: string): Promise<ConsistencyIssue[]> {
    const issues: ConsistencyIssue[] = [];
    
    try {
      // Buscar períodos cerrados sin vouchers
      const { data: periodsWithoutVouchers } = await supabase
        .from('payroll_periods_real')
        .select(`
          id,
          periodo,
          empleados_count,
          payroll_vouchers(id)
        `)
        .eq('company_id', companyId)
        .eq('estado', 'cerrado');
      
      if (periodsWithoutVouchers) {
        for (const period of periodsWithoutVouchers) {
          const voucherCount = period.payroll_vouchers?.length || 0;
          const expectedVouchers = period.empleados_count || 0;
          
          if (expectedVouchers > 0 && voucherCount === 0) {
            issues.push({
              type: 'missing_vouchers',
              severity: 'high',
              description: `Período cerrado sin vouchers generados`,
              periodId: period.id,
              periodName: period.periodo,
              autoRepairable: true,
              repairAction: 'Generar vouchers faltantes',
              details: {
                expectedVouchers,
                actualVouchers: voucherCount
              }
            });
          } else if (voucherCount < expectedVouchers) {
            issues.push({
              type: 'missing_vouchers',
              severity: 'medium',
              description: `Vouchers incompletos`,
              periodId: period.id,
              periodName: period.periodo,
              autoRepairable: true,
              repairAction: 'Completar vouchers faltantes',
              details: {
                expectedVouchers,
                actualVouchers: voucherCount,
                missingVouchers: expectedVouchers - voucherCount
              }
            });
          }
        }
      }
      
    } catch (error) {
      console.error('Error detectando vouchers faltantes:', error);
    }
    
    return issues;
  }
  
  /**
   * Detectar payrolls huérfanos (sin período asociado)
   */
  private static async detectOrphanedPayrollIssues(companyId: string): Promise<ConsistencyIssue[]> {
    const issues: ConsistencyIssue[] = [];
    
    try {
      // Buscar payrolls sin period_id o con period_id inválido
      const { data: orphanedPayrolls } = await supabase
        .from('payrolls')
        .select('id, periodo, period_id')
        .eq('company_id', companyId)
        .is('period_id', null);
      
      if (orphanedPayrolls && orphanedPayrolls.length > 0) {
        // Agrupar por período
        const periodGroups = orphanedPayrolls.reduce((acc, payroll) => {
          const periodo = payroll.periodo || 'Sin período';
          if (!acc[periodo]) acc[periodo] = [];
          acc[periodo].push(payroll);
          return acc;
        }, {} as Record<string, any[]>);
        
        for (const [periodo, payrolls] of Object.entries(periodGroups)) {
          issues.push({
            type: 'orphaned_payrolls',
            severity: 'medium',
            description: `Payrolls sin período asociado`,
            periodId: 'orphaned',
            periodName: periodo,
            autoRepairable: true,
            repairAction: 'Asociar con período correcto',
            details: {
              orphanedCount: payrolls.length,
              payrollIds: payrolls.map(p => p.id)
            }
          });
        }
      }
      
    } catch (error) {
      console.error('Error detectando payrolls huérfanos:', error);
    }
    
    return issues;
  }
  
  /**
   * Detectar liquidaciones incompletas
   */
  private static async detectIncompleteLiquidationIssues(companyId: string): Promise<ConsistencyIssue[]> {
    const issues: ConsistencyIssue[] = [];
    
    try {
      // Buscar períodos en proceso por más de 24 horas
      const { data: stalePeriods } = await supabase
        .from('payroll_periods_real')
        .select('id, periodo, last_activity_at, estado')
        .eq('company_id', companyId)
        .eq('estado', 'en_proceso')
        .lt('last_activity_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
      
      if (stalePeriods) {
        for (const period of stalePeriods) {
          const hoursStale = Math.floor(
            (Date.now() - new Date(period.last_activity_at).getTime()) / (1000 * 60 * 60)
          );
          
          issues.push({
            type: 'incomplete_liquidation',
            severity: hoursStale > 72 ? 'high' : 'medium',
            description: `Liquidación abandonada hace ${hoursStale} horas`,
            periodId: period.id,
            periodName: period.periodo,
            autoRepairable: true,
            repairAction: 'Restablecer estado a borrador',
            details: {
              hoursStale,
              lastActivity: period.last_activity_at
            }
          });
        }
      }
      
    } catch (error) {
      console.error('Error detectando liquidaciones incompletas:', error);
    }
    
    return issues;
  }
  
  /**
   * Reparación automática de problemas detectados
   */
  static async autoRepairIssues(companyId: string, issues: ConsistencyIssue[]): Promise<RepairResult> {
    console.log('🔧 [REPAIR] Iniciando reparación automática...', { companyId, issueCount: issues.length });
    
    const repairableIssues = issues.filter(i => i.autoRepairable);
    const details: string[] = [];
    const errors: string[] = [];
    let issuesRepaired = 0;
    
    try {
      for (const issue of repairableIssues) {
        try {
          switch (issue.type) {
            case 'state_mismatch':
              await this.repairStateMismatch(issue);
              issuesRepaired++;
              details.push(`✅ Corregido: ${issue.description} en ${issue.periodName}`);
              break;
              
            case 'missing_vouchers':
              await this.repairMissingVouchers(issue);
              issuesRepaired++;
              details.push(`✅ Generados vouchers para: ${issue.periodName}`);
              break;
              
            case 'orphaned_payrolls':
              await this.repairOrphanedPayrolls(issue, companyId);
              issuesRepaired++;
              details.push(`✅ Asociados payrolls huérfanos: ${issue.periodName}`);
              break;
              
            case 'incomplete_liquidation':
              await this.repairIncompleteLiquidation(issue);
              issuesRepaired++;
              details.push(`✅ Restablecido período abandonado: ${issue.periodName}`);
              break;
          }
        } catch (error) {
          console.error(`Error reparando ${issue.type}:`, error);
          errors.push(`❌ No se pudo reparar ${issue.description}: ${error.message}`);
        }
      }
      
      const issuesRemaining = issues.length - issuesRepaired;
      
      console.log('🏁 [REPAIR] Reparación completada:', {
        issuesRepaired,
        issuesRemaining,
        errors: errors.length
      });
      
      return {
        success: errors.length === 0,
        issuesRepaired,
        issuesRemaining,
        details,
        errors
      };
      
    } catch (error) {
      console.error('❌ [REPAIR] Error en reparación automática:', error);
      return {
        success: false,
        issuesRepaired,
        issuesRemaining: issues.length - issuesRepaired,
        details,
        errors: [...errors, `Error general: ${error.message}`]
      };
    }
  }
  
  // Métodos de reparación específicos
  private static async repairStateMismatch(issue: ConsistencyIssue) {
    // Actualizar payrolls a estado procesada para períodos cerrados
    await supabase
      .from('payrolls')
      .update({ estado: 'procesada' })
      .eq('period_id', issue.periodId)
      .eq('estado', 'borrador');
  }
  
  private static async repairMissingVouchers(issue: ConsistencyIssue) {
    // Generar vouchers faltantes
    const { data: payrolls } = await supabase
      .from('payrolls')
      .select(`
        id, employee_id, periodo, neto_pagado, company_id,
        employees(nombre, apellido, email)
      `)
      .eq('period_id', issue.periodId);
    
    if (payrolls) {
      for (const payroll of payrolls) {
        // Verificar si ya existe voucher
        const { data: existingVoucher } = await supabase
          .from('payroll_vouchers')
          .select('id')
          .eq('payroll_id', payroll.id)
          .single();
        
        if (!existingVoucher) {
          await supabase
            .from('payroll_vouchers')
            .insert({
              company_id: payroll.company_id,
              employee_id: payroll.employee_id,
              payroll_id: payroll.id,
              periodo: payroll.periodo,
              start_date: new Date().toISOString().split('T')[0],
              end_date: new Date().toISOString().split('T')[0],
              net_pay: payroll.neto_pagado || 0,
              voucher_status: 'pendiente'
            });
        }
      }
    }
  }
  
  private static async repairOrphanedPayrolls(issue: ConsistencyIssue, companyId: string) {
    // Buscar período correspondiente por nombre
    const { data: period } = await supabase
      .from('payroll_periods_real')
      .select('id')
      .eq('company_id', companyId)
      .eq('periodo', issue.periodName)
      .single();
    
    if (period) {
      await supabase
        .from('payrolls')
        .update({ period_id: period.id })
        .in('id', issue.details.payrollIds);
    }
  }
  
  private static async repairIncompleteLiquidation(issue: ConsistencyIssue) {
    // Restablecer período a borrador
    await supabase
      .from('payroll_periods_real')
      .update({ 
        estado: 'borrador',
        last_activity_at: new Date().toISOString()
      })
      .eq('id', issue.periodId);
  }
}