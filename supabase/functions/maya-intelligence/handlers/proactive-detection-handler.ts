// ============================================================================
// MAYA Proactive Detection Handler - Early Problem Detection System
// ============================================================================

import { BaseHandler } from './base-handler.ts';
import { Intent, HandlerResponse, RichContext, MayaLogger } from '../core/types.ts';
import { ResponseBuilder } from '../core/response-builder.ts';

interface ProactiveAlert {
  id: string;
  type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  title: string;
  description: string;
  affectedCount: number;
  dueDate?: Date;
  actionRequired: boolean;
  actions: Array<{ label: string; action: string }>;
}

export class ProactiveDetectionHandler extends BaseHandler {
  private supabaseClient: any;

  constructor(logger: MayaLogger, openaiKey?: string, supabaseClient?: any) {
    super(logger, openaiKey);
    this.supabaseClient = supabaseClient;
  }

  canHandle(intent: Intent): boolean {
    return intent.type === 'PROACTIVE_SCAN' || 
           (intent.parameters?.flowType === 'proactive_scan');
  }

  async handleIntent(intent: Intent, context?: RichContext): Promise<HandlerResponse> {
    try {
      this.logger.info('[ProactiveDetectionHandler] Starting proactive detection scan');

      const companyId = context?.companyId || '';
      
      // Run all detection checks in parallel
      const [
        incompleteEmployees,
        missingAffiliations,
        uncalculatedPeriods,
        pendingNovedades,
        expiringContracts,
        highVacationBalances,
        upcomingDeadlines
      ] = await Promise.all([
        this.detectIncompleteEmployees(companyId),
        this.detectMissingAffiliations(companyId),
        this.detectUncalculatedPeriods(companyId),
        this.detectPendingNovedades(companyId),
        this.detectExpiringContracts(companyId),
        this.detectHighVacationBalances(companyId),
        this.detectUpcomingDeadlines(companyId)
      ]);

      // Aggregate all alerts
      const allAlerts = [
        ...incompleteEmployees,
        ...missingAffiliations,
        ...uncalculatedPeriods,
        ...pendingNovedades,
        ...expiringContracts,
        ...highVacationBalances,
        ...upcomingDeadlines
      ];

      // Sort by severity
      const sortedAlerts = this.sortAlertsBySeverity(allAlerts);

      // Generate summary message
      const message = this.generateProactiveMessage(sortedAlerts);

      return this.formatProactiveResponse(message, sortedAlerts);

    } catch (error) {
      this.logger.error('[ProactiveDetectionHandler] Error in proactive detection:', error);
      return ResponseBuilder.buildErrorResponse(
        'Error al ejecutar el escaneo proactivo',
        'Intenta de nuevo más tarde'
      );
    }
  }

  private async detectIncompleteEmployees(companyId: string): Promise<ProactiveAlert[]> {
    if (!this.supabaseClient) return [];

    const { data, error } = await this.supabaseClient
      .from('employees')
      .select('id, nombre, apellido')
      .eq('company_id', companyId)
      .eq('estado', 'activo')
      .or('eps.is.null,afp.is.null,arl.is.null,banco.is.null,numero_cuenta.is.null');

    if (error || !data || data.length === 0) return [];

    return [{
      id: 'incomplete_employees',
      type: 'incomplete_data',
      severity: 'high',
      category: 'Datos de Empleados',
      title: 'Empleados con datos incompletos',
      description: `${data.length} empleado(s) tienen información faltante (EPS, AFP, ARL, datos bancarios)`,
      affectedCount: data.length,
      actionRequired: true,
      actions: [
        { label: 'Ver empleados', action: 'view_incomplete_employees' },
        { label: 'Completar datos', action: 'complete_employee_data' }
      ]
    }];
  }

  private async detectMissingAffiliations(companyId: string): Promise<ProactiveAlert[]> {
    if (!this.supabaseClient) return [];

    const { data, error } = await this.supabaseClient
      .from('employees')
      .select('id, nombre, apellido, estado_afiliacion')
      .eq('company_id', companyId)
      .eq('estado', 'activo')
      .in('estado_afiliacion', ['pendiente', 'incompleta']);

    if (error || !data || data.length === 0) return [];

    return [{
      id: 'missing_affiliations',
      type: 'affiliations',
      severity: 'high',
      category: 'Seguridad Social',
      title: 'Afiliaciones pendientes',
      description: `${data.length} empleado(s) tienen afiliaciones a seguridad social pendientes o incompletas`,
      affectedCount: data.length,
      actionRequired: true,
      actions: [
        { label: 'Ver empleados', action: 'view_pending_affiliations' },
        { label: 'Gestionar afiliaciones', action: 'manage_affiliations' }
      ]
    }];
  }

  private async detectUncalculatedPeriods(companyId: string): Promise<ProactiveAlert[]> {
    if (!this.supabaseClient) return [];

    const today = new Date();
    const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

    const { data, error } = await this.supabaseClient
      .from('payroll_periods_real')
      .select('id, periodo, fecha_fin')
      .eq('company_id', companyId)
      .eq('estado', 'borrador')
      .lt('fecha_fin', thirtyDaysFromNow.toISOString().split('T')[0]);

    if (error || !data || data.length === 0) return [];

    return [{
      id: 'uncalculated_periods',
      type: 'payroll_pending',
      severity: 'critical',
      category: 'Nómina',
      title: 'Períodos sin calcular próximos a vencer',
      description: `${data.length} período(s) de nómina requieren cálculo antes de ${data[0]?.fecha_fin}`,
      affectedCount: data.length,
      dueDate: new Date(data[0]?.fecha_fin),
      actionRequired: true,
      actions: [
        { label: 'Ver períodos', action: 'view_pending_periods' },
        { label: 'Calcular nómina', action: 'calculate_payroll' }
      ]
    }];
  }

  private async detectPendingNovedades(companyId: string): Promise<ProactiveAlert[]> {
    if (!this.supabaseClient) return [];

    const { data, error } = await this.supabaseClient
      .from('pending_payroll_adjustments')
      .select('id, employee_name, tipo_novedad')
      .eq('company_id', companyId);

    if (error || !data || data.length === 0) return [];

    return [{
      id: 'pending_novedades',
      type: 'pending_adjustments',
      severity: 'medium',
      category: 'Ajustes de Nómina',
      title: 'Novedades pendientes de aplicar',
      description: `${data.length} novedad(es) de nómina pendientes de aplicar en el próximo cálculo`,
      affectedCount: data.length,
      actionRequired: false,
      actions: [
        { label: 'Ver novedades', action: 'view_pending_novedades' },
        { label: 'Aplicar ahora', action: 'apply_novedades' }
      ]
    }];
  }

  private async detectExpiringContracts(companyId: string): Promise<ProactiveAlert[]> {
    if (!this.supabaseClient) return [];

    const today = new Date();
    const sixtyDaysFromNow = new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000);

    const { data, error } = await this.supabaseClient
      .from('employees')
      .select('id, nombre, apellido, fecha_finalizacion_contrato')
      .eq('company_id', companyId)
      .eq('estado', 'activo')
      .not('fecha_finalizacion_contrato', 'is', null)
      .lt('fecha_finalizacion_contrato', sixtyDaysFromNow.toISOString().split('T')[0]);

    if (error || !data || data.length === 0) return [];

    return [{
      id: 'expiring_contracts',
      type: 'contracts',
      severity: 'high',
      category: 'Contratos',
      title: 'Contratos próximos a vencer',
      description: `${data.length} contrato(s) laborales vencen en los próximos 60 días`,
      affectedCount: data.length,
      dueDate: new Date(data[0]?.fecha_finalizacion_contrato),
      actionRequired: true,
      actions: [
        { label: 'Ver contratos', action: 'view_expiring_contracts' },
        { label: 'Gestionar renovaciones', action: 'manage_renewals' }
      ]
    }];
  }

  private async detectHighVacationBalances(companyId: string): Promise<ProactiveAlert[]> {
    if (!this.supabaseClient) return [];

    const { data, error } = await this.supabaseClient
      .from('employee_vacation_balances')
      .select('employee_id, accumulated_days')
      .eq('company_id', companyId)
      .gt('accumulated_days', 15);

    if (error || !data || data.length === 0) return [];

    return [{
      id: 'high_vacation_balances',
      type: 'vacations',
      severity: 'medium',
      category: 'Vacaciones',
      title: 'Saldos de vacaciones elevados',
      description: `${data.length} empleado(s) tienen más de 15 días de vacaciones acumuladas`,
      affectedCount: data.length,
      actionRequired: false,
      actions: [
        { label: 'Ver empleados', action: 'view_vacation_balances' },
        { label: 'Programar vacaciones', action: 'schedule_vacations' }
      ]
    }];
  }

  private async detectUpcomingDeadlines(companyId: string): Promise<ProactiveAlert[]> {
    const alerts: ProactiveAlert[] = [];
    const today = new Date();

    // Check for social security payment deadline (10th of each month)
    const nextDeadline = new Date(today.getFullYear(), today.getMonth(), 10);
    if (nextDeadline < today) {
      nextDeadline.setMonth(nextDeadline.getMonth() + 1);
    }

    const daysUntilDeadline = Math.ceil((nextDeadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilDeadline <= 7) {
      alerts.push({
        id: 'social_security_deadline',
        type: 'deadline',
        severity: daysUntilDeadline <= 3 ? 'critical' : 'high',
        category: 'Pagos Legales',
        title: 'Vencimiento de pago de seguridad social',
        description: `El pago de seguridad social vence en ${daysUntilDeadline} día(s)`,
        affectedCount: 1,
        dueDate: nextDeadline,
        actionRequired: true,
        actions: [
          { label: 'Ver detalles', action: 'view_payment_details' },
          { label: 'Preparar pago', action: 'prepare_payment' }
        ]
      });
    }

    return alerts;
  }

  private sortAlertsBySeverity(alerts: ProactiveAlert[]): ProactiveAlert[] {
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
  }

  private generateProactiveMessage(alerts: ProactiveAlert[]): string {
    if (alerts.length === 0) {
      return '✅ **Todo está en orden**\n\nNo se detectaron problemas que requieran atención inmediata. El sistema está funcionando correctamente.';
    }

    const criticalCount = alerts.filter(a => a.severity === 'critical').length;
    const highCount = alerts.filter(a => a.severity === 'high').length;
    const mediumCount = alerts.filter(a => a.severity === 'medium').length;

    let message = '🛡️ **Escaneo Proactivo Completado**\n\n';
    message += `Se detectaron **${alerts.length} alertas** que requieren tu atención:\n\n`;

    if (criticalCount > 0) {
      message += `🔴 **${criticalCount} Críticas** - Requieren acción inmediata\n`;
    }
    if (highCount > 0) {
      message += `🟠 **${highCount} Altas** - Requieren atención pronto\n`;
    }
    if (mediumCount > 0) {
      message += `🟡 **${mediumCount} Medias** - Revisa cuando sea posible\n`;
    }

    message += '\n**Resumen de problemas detectados:**\n';
    alerts.slice(0, 5).forEach((alert, index) => {
      const icon = this.getSeverityIcon(alert.severity);
      message += `${index + 1}. ${icon} ${alert.title}\n`;
    });

    if (alerts.length > 5) {
      message += `\n... y ${alerts.length - 5} más`;
    }

    return message;
  }

  private getSeverityIcon(severity: string): string {
    const icons: Record<string, string> = {
      critical: '🔴',
      high: '🟠',
      medium: '🟡',
      low: '🟢'
    };
    return icons[severity] || '⚪';
  }

  private formatProactiveResponse(message: string, alerts: ProactiveAlert[]): HandlerResponse {
    return {
      hasExecutableAction: false,
      response: message,
      emotionalState: alerts.length > 0 ? 'concerned' : 'satisfied',
      contextualActions: alerts
        .filter(a => a.actionRequired)
        .slice(0, 3)
        .map(alert => ({
          id: alert.id,
          type: alert.actions[0]?.action || 'view_alert',
          label: alert.actions[0]?.label || 'Ver detalles',
          description: alert.title,
          parameters: { alertId: alert.id, alertType: alert.type }
        })),
      metadata: {
        totalAlerts: alerts.length,
        criticalAlerts: alerts.filter(a => a.severity === 'critical').length,
        alerts: alerts,
        scanTimestamp: new Date().toISOString()
      }
    };
  }
}
