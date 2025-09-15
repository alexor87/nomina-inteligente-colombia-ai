import { supabase } from '@/integrations/supabase/client';

export interface AuditEntry {
  action: string;
  old_values: any;
  new_values: any;
  user_email: string;
  created_at: string;
}

export interface PeriodAuditSummary {
  employee_name: string;
  novedad_type: string;
  action: string;
  value_change: number;
  user_email: string;
  created_at: string;
}

export class PayrollAuditEnhancedService {
  /**
   * Get audit history for a specific novedad
   */
  static async getNovedadAuditHistory(novedadId: string): Promise<AuditEntry[]> {
    try {
      const { data, error } = await supabase.rpc('get_novedad_audit_history', {
        p_novedad_id: novedadId
      });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching novedad audit history:', error);
      throw error;
    }
  }

  /**
   * Get period audit summary with all changes using the new RPC with embedded employee identity
   */
  static async getPeriodAuditSummary(periodId: string): Promise<PeriodAuditSummary[]> {
    try {
      const { data, error } = await supabase.rpc('get_period_audit_summary', {
        p_period_id: periodId
      });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching period audit summary:', error);
      throw error;
    }
  }

  /**
   * Log manual audit action with business context
   */
  static async logManualAction(
    novedadId: string,
    action: string,
    context: {
      reason?: string;
      source?: 'adjustment' | 'correction' | 'liquidation';
      metadata?: Record<string, any>;
    }
  ): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get company_id from current user
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (!profile?.company_id) return;

      await supabase.from('payroll_novedades_audit').insert({
        novedad_id: novedadId,
        company_id: profile.company_id,
        action: `MANUAL_${action.toUpperCase()}`,
        old_values: null,
        new_values: {
          context,
          timestamp: new Date().toISOString(),
          user_agent: navigator.userAgent,
          source: context.source || 'manual'
        },
        user_id: user.id
      });

      console.log(`📝 Manual audit logged: ${action} for novedad ${novedadId}`);
    } catch (error) {
      console.warn('⚠️ Could not log manual audit action:', error);
    }
  }

  /**
   * Get readable action description
   */
  static getActionDescription(action: string): string {
    const actionMap: Record<string, string> = {
      'CREATE': 'Creado',
      'UPDATE': 'Modificado',
      'DELETE': 'Eliminado',
      'MANUAL_ADJUSTMENT': 'Ajuste manual',
      'MANUAL_CORRECTION': 'Corrección manual',
      'MANUAL_LIQUIDATION': 'Liquidación manual'
    };

    return actionMap[action] || action;
  }

  /**
   * Compare old and new values for display
   */
  static getValueChanges(oldValues: any, newValues: any): Array<{
    field: string;
    oldValue: any;
    newValue: any;
    changed: boolean;
  }> {
    if (!oldValues || !newValues) return [];

    const importantFields = ['valor', 'dias', 'horas', 'tipo_novedad', 'observacion'];
    const changes: Array<{
      field: string;
      oldValue: any;
      newValue: any;
      changed: boolean;
    }> = [];

    importantFields.forEach(field => {
      const oldVal = oldValues[field];
      const newVal = newValues[field];
      const changed = oldVal !== newVal;

      changes.push({
        field,
        oldValue: oldVal,
        newValue: newVal,
        changed
      });
    });

    return changes.filter(change => change.changed);
  }

  /**
   * Format field names for display
   */
  static getFieldDisplayName(field: string): string {
    const fieldMap: Record<string, string> = {
      'valor': 'Valor',
      'dias': 'Días',
      'horas': 'Horas',
      'tipo_novedad': 'Tipo de novedad',
      'observacion': 'Observación',
      'fecha_inicio': 'Fecha inicio',
      'fecha_fin': 'Fecha fin'
    };

    return fieldMap[field] || field;
  }

  /**
   * Format value for display
   */
  static formatValueForDisplay(field: string, value: any): string {
    if (value === null || value === undefined) return 'N/A';

    switch (field) {
      case 'valor':
        return new Intl.NumberFormat('es-CO', {
          style: 'currency',
          currency: 'COP'
        }).format(value);
      case 'dias':
      case 'horas':
        return `${value} ${field}`;
      default:
        return String(value);
    }
  }
}