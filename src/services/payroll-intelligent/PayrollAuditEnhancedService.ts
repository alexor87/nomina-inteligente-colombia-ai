
import { supabase } from '@/integrations/supabase/client';
import { PayrollPeriodService } from '../PayrollPeriodService';

export interface AuditLogEntry {
  action: string;
  entity_type: 'period' | 'employee' | 'calculation' | 'validation' | 'system';
  entity_id?: string;
  details: Record<string, any>;
  performance_metrics?: {
    duration_ms: number;
    memory_usage?: number;
    records_processed?: number;
  };
  user_context?: {
    ip_address?: string;
    user_agent?: string;
    session_id?: string;
  };
}

export class PayrollAuditEnhancedService {
  private static startTime = Date.now();
  private static actionCounter = 0;

  // Registrar acciones con contexto enriquecido
  static async logEnhancedAction(entry: AuditLogEntry): Promise<void> {
    try {
      const companyId = await PayrollPeriodService.getCurrentUserCompanyId();
      if (!companyId) return;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      this.actionCounter++;
      const timestamp = new Date().toISOString();
      const sessionDuration = Date.now() - this.startTime;

      // Log enriquecido para análisis
      const enrichedLog = {
        company_id: companyId,
        user_email: user.email || '',
        type: 'payroll_intelligent',
        action: `${entry.entity_type}_${entry.action}`,
        created_at: timestamp,
        // Detalles específicos como JSON string para almacenamiento
        metadata: JSON.stringify({
          ...entry.details,
          entity_id: entry.entity_id,
          session_info: {
            action_sequence: this.actionCounter,
            session_duration_ms: sessionDuration,
            timestamp: timestamp
          },
          performance: entry.performance_metrics,
          user_context: entry.user_context
        })
      };

      await supabase.from('dashboard_activity').insert(enrichedLog);

      // Log detallado en consola para desarrollo
      console.log(`🔍 [${entry.entity_type.toUpperCase()}] ${entry.action}:`, {
        entityId: entry.entity_id,
        details: entry.details,
        performance: entry.performance_metrics,
        sequence: this.actionCounter
      });

    } catch (error) {
      console.warn('⚠️ No se pudo registrar la acción en logs:', error);
    }
  }

  // Seguimiento de rendimiento para operaciones costosas
  static async trackPerformance<T>(
    operation: string,
    entityType: AuditLogEntry['entity_type'],
    asyncFunction: () => Promise<T>,
    entityId?: string
  ): Promise<T> {
    const startTime = performance.now();
    const startMemory = (performance as any).memory?.usedJSHeapSize;

    try {
      const result = await asyncFunction();
      const endTime = performance.now();
      const endMemory = (performance as any).memory?.usedJSHeapSize;

      await this.logEnhancedAction({
        action: operation,
        entity_type: entityType,
        entity_id: entityId,
        details: {
          operation_status: 'success',
          result_summary: Array.isArray(result) ? `${result.length} records` : 'completed'
        },
        performance_metrics: {
          duration_ms: Math.round(endTime - startTime),
          memory_usage: endMemory && startMemory ? endMemory - startMemory : undefined,
          records_processed: Array.isArray(result) ? result.length : 1
        }
      });

      return result;
    } catch (error) {
      const endTime = performance.now();
      
      await this.logEnhancedAction({
        action: operation,
        entity_type: entityType,
        entity_id: entityId,
        details: {
          operation_status: 'error',
          error_message: error instanceof Error ? error.message : 'Unknown error',
          error_type: error instanceof Error ? error.constructor.name : 'Unknown'
        },
        performance_metrics: {
          duration_ms: Math.round(endTime - startTime)
        }
      });

      throw error;
    }
  }

  // Logs específicos para operaciones de liquidación
  static async logPeriodCreation(periodId: string, periodData: any, validationResults: any[]): Promise<void> {
    await this.logEnhancedAction({
      action: 'create',
      entity_type: 'period',
      entity_id: periodId,
      details: {
        period_type: periodData.tipo_periodo,
        start_date: periodData.fecha_inicio,
        end_date: periodData.fecha_fin,
        validation_results: validationResults.map(v => ({
          type: v.type,
          message: v.message,
          count: v.count
        }))
      }
    });
  }

  static async logEmployeeBatchProcessing(employeeCount: number, processingTime: number, errors: any[]): Promise<void> {
    await this.logEnhancedAction({
      action: 'batch_process',
      entity_type: 'employee',
      details: {
        total_employees: employeeCount,
        errors_count: errors.length,
        success_rate: ((employeeCount - errors.length) / employeeCount * 100).toFixed(2) + '%',
        error_summary: errors.slice(0, 5) // Solo primeros 5 errores
      },
      performance_metrics: {
        duration_ms: processingTime,
        records_processed: employeeCount
      }
    });
  }

  static async logSystemOptimization(optimizationType: string, metrics: Record<string, any>): Promise<void> {
    await this.logEnhancedAction({
      action: 'optimize',
      entity_type: 'system',
      details: {
        optimization_type: optimizationType,
        metrics: metrics,
        timestamp: new Date().toISOString()
      },
      performance_metrics: {
        duration_ms: metrics.duration_ms,
        records_processed: metrics.records_processed
      }
    });
  }

  // Generar resumen de sesión
  static async generateSessionSummary(): Promise<void> {
    const sessionDuration = Date.now() - this.startTime;
    
    await this.logEnhancedAction({
      action: 'session_summary',
      entity_type: 'system',
      details: {
        total_actions: this.actionCounter,
        session_duration_ms: sessionDuration,
        actions_per_minute: Math.round((this.actionCounter / (sessionDuration / 60000)) * 100) / 100,
        session_end: new Date().toISOString()
      }
    });
  }
}
