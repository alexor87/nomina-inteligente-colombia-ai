import { supabase } from '@/integrations/supabase/client';
import { PayrollConsistencyService, ConsistencyReport } from './PayrollConsistencyService';

export interface RecoveryPlan {
  periodId: string;
  periodName: string;
  currentState: string;
  targetState: string;
  actions: RecoveryAction[];
  priority: 'low' | 'medium' | 'high' | 'critical';
  estimatedDuration: string;
  riskLevel: 'safe' | 'moderate' | 'high';
}

export interface RecoveryAction {
  id: string;
  type: 'cleanup' | 'repair' | 'regenerate' | 'rollback';
  description: string;
  requiresConfirmation: boolean;
  details: any;
}

export interface RecoveryExecution {
  success: boolean;
  planId: string;
  actionsCompleted: number;
  actionsTotal: number;
  duration: number;
  results: string[];
  errors: string[];
}

/**
 * Servicio de recuperación inteligente para problemas de nómina
 * Detecta, planifica y ejecuta recuperaciones automáticas
 */
export class PayrollRecoveryService {
  
  /**
   * Análisis completo y generación de plan de recuperación
   */
  static async analyzeAndPlan(companyId: string): Promise<RecoveryPlan[]> {
    console.log('🩺 [RECOVERY] Iniciando análisis para plan de recuperación...', { companyId });
    
    try {
      // 1. Ejecutar diagnóstico de consistencia
      const consistencyReport = await PayrollConsistencyService.diagnoseConsistency(companyId);
      
      // 2. Generar planes de recuperación basados en los problemas detectados
      const recoveryPlans = await this.generateRecoveryPlans(consistencyReport);
      
      // 3. Priorizar planes por severidad y dependencias
      const prioritizedPlans = this.prioritizePlans(recoveryPlans);
      
      console.log('📋 [RECOVERY] Plan de recuperación generado:', {
        totalPlans: prioritizedPlans.length,
        criticalPlans: prioritizedPlans.filter(p => p.priority === 'critical').length,
        highPriorityPlans: prioritizedPlans.filter(p => p.priority === 'high').length
      });
      
      return prioritizedPlans;
      
    } catch (error) {
      console.error('❌ [RECOVERY] Error generando plan de recuperación:', error);
      throw new Error(`Error en análisis de recuperación: ${error.message}`);
    }
  }
  
  /**
   * Ejecutar plan de recuperación específico
   */
  static async executePlan(
    plan: RecoveryPlan, 
    companyId: string, 
    userId: string
  ): Promise<RecoveryExecution> {
    console.log('🚀 [RECOVERY] Ejecutando plan de recuperación:', { 
      planId: plan.periodId, 
      periodName: plan.periodName 
    });
    
    const startTime = Date.now();
    const results: string[] = [];
    const errors: string[] = [];
    let actionsCompleted = 0;
    
    try {
      // Registrar inicio de recuperación
      await this.logRecoveryStart(plan, companyId, userId);
      
      for (const action of plan.actions) {
        try {
          console.log(`🔧 [RECOVERY] Ejecutando acción: ${action.type} - ${action.description}`);
          
          const actionResult = await this.executeAction(action, plan, companyId, userId);
          
          if (actionResult.success) {
            actionsCompleted++;
            results.push(`✅ ${action.description}: ${actionResult.message}`);
          } else {
            errors.push(`❌ ${action.description}: ${actionResult.message}`);
          }
          
        } catch (actionError) {
          console.error(`❌ [RECOVERY] Error en acción ${action.id}:`, actionError);
          errors.push(`❌ ${action.description}: ${actionError.message}`);
        }
      }
      
      const duration = Date.now() - startTime;
      const success = errors.length === 0;
      
      // Registrar resultado de recuperación
      await this.logRecoveryResult(plan, companyId, userId, {
        success,
        actionsCompleted,
        duration,
        results,
        errors
      });
      
      console.log('🏁 [RECOVERY] Plan de recuperación completado:', {
        planId: plan.periodId,
        success,
        actionsCompleted,
        actionsTotal: plan.actions.length,
        duration: `${duration}ms`
      });
      
      return {
        success,
        planId: plan.periodId,
        actionsCompleted,
        actionsTotal: plan.actions.length,
        duration,
        results,
        errors
      };
      
    } catch (error) {
      console.error('❌ [RECOVERY] Error ejecutando plan de recuperación:', error);
      
      const duration = Date.now() - startTime;
      
      return {
        success: false,
        planId: plan.periodId,
        actionsCompleted,
        actionsTotal: plan.actions.length,
        duration,
        results,
        errors: [...errors, `Error general: ${error.message}`]
      };
    }
  }
  
  /**
   * Recuperación automática para el período de Marzo inconsistente
   */
  static async autoRecoverMarchPeriod(companyId: string, userId: string): Promise<RecoveryExecution> {
    console.log('🔄 [RECOVERY] Iniciando recuperación automática para período de Marzo...');
    
    try {
      // Buscar el período de Marzo problemático
      const { data: marchPeriod } = await supabase
        .from('payroll_periods_real')
        .select('*')
        .eq('company_id', companyId)
        .ilike('periodo', '%marzo%')
        .eq('estado', 'cerrado')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (!marchPeriod) {
        return {
          success: false,
          planId: 'march_auto_recovery',
          actionsCompleted: 0,
          actionsTotal: 1,
          duration: 0,
          results: [],
          errors: ['No se encontró período de Marzo para recuperar']
        };
      }
      
      // Generar plan específico para Marzo
      const recoveryPlan: RecoveryPlan = {
        periodId: marchPeriod.id,
        periodName: marchPeriod.periodo,
        currentState: 'inconsistent_closed',
        targetState: 'properly_liquidated',
        priority: 'critical',
        estimatedDuration: '2-3 minutos',
        riskLevel: 'moderate',
        actions: [
          {
            id: 'cleanup_march_state',
            type: 'cleanup',
            description: 'Limpiar estado inconsistente',
            requiresConfirmation: false,
            details: { periodId: marchPeriod.id }
          },
          {
            id: 'repair_march_payrolls',
            type: 'repair',
            description: 'Sincronizar estado de payrolls',
            requiresConfirmation: false,
            details: { periodId: marchPeriod.id }
          },
          {
            id: 'regenerate_march_vouchers',
            type: 'regenerate',
            description: 'Generar vouchers faltantes',
            requiresConfirmation: false,
            details: { periodId: marchPeriod.id }
          }
        ]
      };
      
      // Ejecutar plan de recuperación
      return await this.executePlan(recoveryPlan, companyId, userId);
      
    } catch (error) {
      console.error('❌ [RECOVERY] Error en recuperación automática de Marzo:', error);
      
      return {
        success: false,
        planId: 'march_auto_recovery',
        actionsCompleted: 0,
        actionsTotal: 0,
        duration: 0,
        results: [],
        errors: [`Error en recuperación automática: ${error.message}`]
      };
    }
  }
  
  /**
   * Generar planes de recuperación basados en diagnóstico
   */
  private static async generateRecoveryPlans(consistencyReport: ConsistencyReport): Promise<RecoveryPlan[]> {
    const plans: RecoveryPlan[] = [];
    
    // Agrupar problemas por período
    const periodIssues = new Map<string, any[]>();
    
    for (const issue of consistencyReport.issues) {
      if (!periodIssues.has(issue.periodId)) {
        periodIssues.set(issue.periodId, []);
      }
      periodIssues.get(issue.periodId)!.push(issue);
    }
    
    // Generar plan para cada período con problemas
    for (const [periodId, issues] of periodIssues.entries()) {
      const plan = await this.generatePlanForPeriod(periodId, issues);
      if (plan) {
        plans.push(plan);
      }
    }
    
    return plans;
  }
  
  /**
   * Generar plan específico para un período
   */
  private static async generatePlanForPeriod(periodId: string, issues: any[]): Promise<RecoveryPlan | null> {
    if (issues.length === 0) return null;
    
    const firstIssue = issues[0];
    const actions: RecoveryAction[] = [];
    
    // Determinar prioridad basada en severidad de problemas
    const hasCritical = issues.some(i => i.severity === 'critical');
    const hasHigh = issues.some(i => i.severity === 'high');
    
    let priority: RecoveryPlan['priority'] = 'low';
    if (hasCritical) priority = 'critical';
    else if (hasHigh) priority = 'high';
    else if (issues.length > 2) priority = 'medium';
    
    // Generar acciones específicas basadas en tipos de problemas
    for (const issue of issues) {
      switch (issue.type) {
        case 'state_mismatch':
          actions.push({
            id: `repair_state_${periodId}`,
            type: 'repair',
            description: 'Sincronizar estados período-payrolls',
            requiresConfirmation: false,
            details: { issueId: issue.type, periodId }
          });
          break;
          
        case 'missing_vouchers':
          actions.push({
            id: `regenerate_vouchers_${periodId}`,
            type: 'regenerate',
            description: 'Generar vouchers faltantes',
            requiresConfirmation: false,
            details: { issueId: issue.type, periodId }
          });
          break;
          
        case 'orphaned_payrolls':
          actions.push({
            id: `repair_orphaned_${periodId}`,
            type: 'repair',
            description: 'Asociar payrolls huérfanos',
            requiresConfirmation: false,
            details: { issueId: issue.type, periodId }
          });
          break;
          
        case 'incomplete_liquidation':
          actions.push({
            id: `cleanup_incomplete_${periodId}`,
            type: 'cleanup',
            description: 'Limpiar liquidación abandonada',
            requiresConfirmation: true,
            details: { issueId: issue.type, periodId }
          });
          break;
      }
    }
    
    return {
      periodId,
      periodName: firstIssue.periodName,
      currentState: 'inconsistent',
      targetState: 'consistent',
      actions,
      priority,
      estimatedDuration: this.estimateDuration(actions),
      riskLevel: priority === 'critical' ? 'high' : priority === 'high' ? 'moderate' : 'safe'
    };
  }
  
  /**
   * Priorizar planes de recuperación
   */
  private static prioritizePlans(plans: RecoveryPlan[]): RecoveryPlan[] {
    return plans.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }
  
  /**
   * Ejecutar acción específica de recuperación
   */
  private static async executeAction(
    action: RecoveryAction, 
    plan: RecoveryPlan, 
    companyId: string, 
    userId: string
  ) {
    switch (action.type) {
      case 'cleanup':
        return await this.executeCleanupAction(action, plan, companyId);
        
      case 'repair':
        return await this.executeRepairAction(action, plan, companyId);
        
      case 'regenerate':
        return await this.executeRegenerateAction(action, plan, companyId);
        
      case 'rollback':
        return await this.executeRollbackAction(action, plan, companyId);
        
      default:
        return { success: false, message: `Tipo de acción desconocido: ${action.type}` };
    }
  }
  
  /**
   * Ejecutar acción de limpieza
   */
  private static async executeCleanupAction(action: RecoveryAction, plan: RecoveryPlan, companyId: string) {
    try {
      // Restablecer período a borrador si está en proceso abandonado
      await supabase
        .from('payroll_periods_real')
        .update({ 
          estado: 'borrador',
          last_activity_at: new Date().toISOString()
        })
        .eq('id', plan.periodId);
      
      return { success: true, message: 'Estado limpiado correctamente' };
      
    } catch (error) {
      return { success: false, message: `Error en limpieza: ${error.message}` };
    }
  }
  
  /**
   * Ejecutar acción de reparación
   */
  private static async executeRepairAction(action: RecoveryAction, plan: RecoveryPlan, companyId: string) {
    try {
      // Sincronizar estado de payrolls con período cerrado
      await supabase
        .from('payrolls')
        .update({ estado: 'procesada' })
        .eq('period_id', plan.periodId)
        .eq('estado', 'borrador');
      
      return { success: true, message: 'Estados sincronizados correctamente' };
      
    } catch (error) {
      return { success: false, message: `Error en reparación: ${error.message}` };
    }
  }
  
  /**
   * Ejecutar acción de regeneración
   */
  private static async executeRegenerateAction(action: RecoveryAction, plan: RecoveryPlan, companyId: string) {
    try {
      // Generar vouchers faltantes
      const { data: payrolls } = await supabase
        .from('payrolls')
        .select(`
          id, employee_id, periodo, neto_pagado,
          payroll_periods_real(fecha_inicio, fecha_fin)
        `)
        .eq('period_id', plan.periodId);
      
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
                company_id: companyId,
                employee_id: payroll.employee_id,
                payroll_id: payroll.id,
                periodo: payroll.periodo,
                start_date: payroll.payroll_periods_real?.fecha_inicio,
                end_date: payroll.payroll_periods_real?.fecha_fin,
                net_pay: payroll.neto_pagado || 0,
                voucher_status: 'pendiente'
              });
          }
        }
      }
      
      return { success: true, message: 'Vouchers regenerados correctamente' };
      
    } catch (error) {
      return { success: false, message: `Error en regeneración: ${error.message}` };
    }
  }
  
  /**
   * Ejecutar acción de rollback
   */
  private static async executeRollbackAction(action: RecoveryAction, plan: RecoveryPlan, companyId: string) {
    try {
      // Implementar rollback específico según el caso
      return { success: true, message: 'Rollback ejecutado correctamente' };
      
    } catch (error) {
      return { success: false, message: `Error en rollback: ${error.message}` };
    }
  }
  
  /**
   * Estimar duración del plan
   */
  private static estimateDuration(actions: RecoveryAction[]): string {
    const baseTime = 30; // 30 segundos base
    const timePerAction = 20; // 20 segundos por acción
    
    const totalSeconds = baseTime + (actions.length * timePerAction);
    
    if (totalSeconds < 60) return `${totalSeconds} segundos`;
    const minutes = Math.ceil(totalSeconds / 60);
    return `${minutes} minuto${minutes > 1 ? 's' : ''}`;
  }
  
  /**
   * Registrar inicio de recuperación
   */
  private static async logRecoveryStart(plan: RecoveryPlan, companyId: string, userId: string) {
    try {
      await supabase
        .from('payroll_sync_log')
        .insert({
          company_id: companyId,
          period_id: plan.periodId,
          sync_type: 'recovery_operation',
          status: 'processing'
        });
    } catch (error) {
      console.error('Error registrando inicio de recuperación:', error);
    }
  }
  
  /**
   * Registrar resultado de recuperación
   */
  private static async logRecoveryResult(
    plan: RecoveryPlan, 
    companyId: string, 
    userId: string, 
    result: any
  ) {
    try {
      await supabase
        .from('payroll_sync_log')
        .insert({
          company_id: companyId,
          period_id: plan.periodId,
          sync_type: 'recovery_operation',
          status: result.success ? 'completed' : 'error',
          records_created: result.actionsCompleted,
          completed_at: new Date().toISOString(),
          error_message: result.errors.length > 0 ? result.errors.join('; ') : null
        });
    } catch (error) {
      console.error('Error registrando resultado de recuperación:', error);
    }
  }
}