/**
 * Servicio de Detección Proactiva de Problemas
 * Escanea el sistema y detecta problemas potenciales antes de que se conviertan en críticos
 */

import { supabase } from '@/integrations/supabase/client';
import {
  ProactiveAlert,
  ProactiveDetectionResult,
  AlertSeverity,
  AlertCategory,
  AlertType
} from '@/types/proactive-detection';

export class ProactiveDetectionService {
  /**
   * Ejecuta el escaneo completo de detección proactiva
   */
  static async runDetection(companyId: string): Promise<ProactiveDetectionResult> {
    const alerts: ProactiveAlert[] = [];

    try {
      // Ejecutar todas las detecciones en paralelo
      const [
        incompleteEmployeesAlerts,
        missingAffiliationsAlerts,
        uncalculatedPeriodsAlerts,
        pendingNovedadesAlerts,
        expiringContractsAlerts,
        highVacationBalanceAlerts,
        deadlineAlerts
      ] = await Promise.all([
        this.detectIncompleteEmployees(companyId),
        this.detectMissingAffiliations(companyId),
        this.detectUncalculatedPeriods(companyId),
        this.detectPendingNovedades(companyId),
        this.detectExpiringContracts(companyId),
        this.detectHighVacationBalances(companyId),
        this.detectUpcomingDeadlines(companyId)
      ]);

      alerts.push(
        ...incompleteEmployeesAlerts,
        ...missingAffiliationsAlerts,
        ...uncalculatedPeriodsAlerts,
        ...pendingNovedadesAlerts,
        ...expiringContractsAlerts,
        ...highVacationBalanceAlerts,
        ...deadlineAlerts
      );

      // Calcular resumen
      const summary = {
        total: alerts.length,
        critical: alerts.filter(a => a.severity === AlertSeverity.CRITICAL).length,
        high: alerts.filter(a => a.severity === AlertSeverity.HIGH).length,
        medium: alerts.filter(a => a.severity === AlertSeverity.MEDIUM).length,
        low: alerts.filter(a => a.severity === AlertSeverity.LOW).length
      };

      return {
        alerts,
        summary,
        scanTimestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error en detección proactiva:', error);
      throw error;
    }
  }

  /**
   * Detecta empleados con datos incompletos
   */
  private static async detectIncompleteEmployees(companyId: string): Promise<ProactiveAlert[]> {
    const alerts: ProactiveAlert[] = [];

    const { data: employees, error } = await supabase
      .from('employees')
      .select('id, nombre, apellido, eps, afp, arl, banco, numero_cuenta')
      .eq('company_id', companyId)
      .eq('estado', 'activo');

    if (error || !employees) return alerts;

    const incompleteEmployees = employees.filter(emp => 
      !emp.eps || !emp.afp || !emp.arl || !emp.banco || !emp.numero_cuenta
    );

    if (incompleteEmployees.length > 0) {
      alerts.push({
        id: `incomplete-data-${Date.now()}`,
        type: AlertType.INCOMPLETE_EMPLOYEE_DATA,
        category: AlertCategory.EMPLOYEE_DATA,
        severity: AlertSeverity.MEDIUM,
        title: 'Empleados con datos incompletos',
        description: `${incompleteEmployees.length} empleado(s) tienen información faltante (EPS, AFP, ARL, datos bancarios)`,
        affectedEntities: {
          employees: incompleteEmployees.map(e => e.id),
          count: incompleteEmployees.length
        },
        recommendation: 'Completa la información de los empleados para evitar problemas en el cálculo de nómina y pagos.',
        actionRequired: true,
        detectedAt: new Date().toISOString(),
        metadata: {
          employeeNames: incompleteEmployees.map(e => `${e.nombre} ${e.apellido}`)
        }
      });
    }

    return alerts;
  }

  /**
   * Detecta empleados con afiliaciones faltantes o incompletas
   */
  private static async detectMissingAffiliations(companyId: string): Promise<ProactiveAlert[]> {
    const alerts: ProactiveAlert[] = [];

    const { data: employees, error } = await supabase
      .from('employees')
      .select('id, nombre, apellido, estado_afiliacion')
      .eq('company_id', companyId)
      .eq('estado', 'activo')
      .neq('estado_afiliacion', 'completa');

    if (error || !employees) return alerts;

    if (employees.length > 0) {
      alerts.push({
        id: `missing-affiliations-${Date.now()}`,
        type: AlertType.MISSING_AFFILIATIONS,
        category: AlertCategory.AFFILIATIONS,
        severity: AlertSeverity.HIGH,
        title: 'Afiliaciones incompletas',
        description: `${employees.length} empleado(s) tienen afiliaciones pendientes o inconsistentes`,
        affectedEntities: {
          employees: employees.map(e => e.id),
          count: employees.length
        },
        recommendation: 'Verifica y completa las afiliaciones a seguridad social para cumplir con las obligaciones legales.',
        actionRequired: true,
        detectedAt: new Date().toISOString(),
        metadata: {
          employeeNames: employees.map(e => `${e.nombre} ${e.apellido}`)
        }
      });
    }

    return alerts;
  }

  /**
   * Detecta períodos de nómina sin calcular próximos a vencer
   */
  private static async detectUncalculatedPeriods(companyId: string): Promise<ProactiveAlert[]> {
    const alerts: ProactiveAlert[] = [];

    const today = new Date();
    const thirtyDaysFromNow = new Date(today);
    thirtyDaysFromNow.setDate(today.getDate() + 30);

    const { data: periods, error } = await supabase
      .from('payroll_periods_real')
      .select('id, periodo, fecha_fin, estado')
      .eq('company_id', companyId)
      .in('estado', ['borrador', 'abierto'])
      .lte('fecha_fin', thirtyDaysFromNow.toISOString().split('T')[0]);

    if (error || !periods) return alerts;

    if (periods.length > 0) {
      const daysUntilClosest = Math.ceil(
        (new Date(periods[0].fecha_fin).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );

      alerts.push({
        id: `uncalculated-periods-${Date.now()}`,
        type: AlertType.PAYROLL_PERIOD_NOT_CALCULATED,
        category: AlertCategory.PAYROLL,
        severity: daysUntilClosest <= 7 ? AlertSeverity.CRITICAL : AlertSeverity.HIGH,
        title: 'Períodos de nómina sin calcular',
        description: `${periods.length} período(s) de nómina sin calcular próximos a vencer`,
        affectedEntities: {
          periods: periods.map(p => p.id),
          count: periods.length
        },
        recommendation: 'Calcula la nómina lo antes posible para evitar retrasos en los pagos.',
        actionRequired: true,
        dueDate: periods[0].fecha_fin,
        detectedAt: new Date().toISOString(),
        metadata: {
          periodNames: periods.map(p => p.periodo),
          daysUntilClosest
        }
      });
    }

    return alerts;
  }

  /**
   * Detecta novedades pendientes sin aplicar
   */
  private static async detectPendingNovedades(companyId: string): Promise<ProactiveAlert[]> {
    const alerts: ProactiveAlert[] = [];

    const { data: pendingAdjustments, error } = await supabase
      .from('pending_payroll_adjustments')
      .select('id, employee_name, tipo_novedad, period_id')
      .eq('company_id', companyId);

    if (error || !pendingAdjustments) return alerts;

    if (pendingAdjustments.length > 0) {
      alerts.push({
        id: `pending-novedades-${Date.now()}`,
        type: AlertType.PENDING_NOVEDADES,
        category: AlertCategory.PAYROLL,
        severity: AlertSeverity.MEDIUM,
        title: 'Novedades pendientes',
        description: `${pendingAdjustments.length} novedad(es) pendiente(s) de aplicar`,
        affectedEntities: {
          count: pendingAdjustments.length
        },
        recommendation: 'Revisa y aplica las novedades pendientes antes de calcular la nómina.',
        actionRequired: true,
        detectedAt: new Date().toISOString(),
        metadata: {
          adjustments: pendingAdjustments.map(a => ({
            employee: a.employee_name,
            type: a.tipo_novedad
          }))
        }
      });
    }

    return alerts;
  }

  /**
   * Detecta contratos próximos a vencer
   */
  private static async detectExpiringContracts(companyId: string): Promise<ProactiveAlert[]> {
    const alerts: ProactiveAlert[] = [];

    const today = new Date();
    const sixtyDaysFromNow = new Date(today);
    sixtyDaysFromNow.setDate(today.getDate() + 60);

    const { data: employees, error } = await supabase
      .from('employees')
      .select('id, nombre, apellido, fecha_finalizacion_contrato, tipo_contrato')
      .eq('company_id', companyId)
      .eq('estado', 'activo')
      .not('fecha_finalizacion_contrato', 'is', null)
      .lte('fecha_finalizacion_contrato', sixtyDaysFromNow.toISOString().split('T')[0]);

    if (error || !employees) return alerts;

    if (employees.length > 0) {
      const thirtyDaysOrLess = employees.filter(e => {
        const daysUntilExpiry = Math.ceil(
          (new Date(e.fecha_finalizacion_contrato!).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        );
        return daysUntilExpiry <= 30;
      });

      alerts.push({
        id: `expiring-contracts-${Date.now()}`,
        type: AlertType.CONTRACT_EXPIRING_SOON,
        category: AlertCategory.DEADLINES,
        severity: thirtyDaysOrLess.length > 0 ? AlertSeverity.HIGH : AlertSeverity.MEDIUM,
        title: 'Contratos próximos a vencer',
        description: `${employees.length} contrato(s) vence(n) en los próximos 60 días`,
        affectedEntities: {
          employees: employees.map(e => e.id),
          count: employees.length
        },
        recommendation: 'Revisa los contratos próximos a vencer y planifica las renovaciones o liquidaciones necesarias.',
        actionRequired: true,
        detectedAt: new Date().toISOString(),
        metadata: {
          employeeDetails: employees.map(e => ({
            name: `${e.nombre} ${e.apellido}`,
            expiryDate: e.fecha_finalizacion_contrato,
            contractType: e.tipo_contrato
          }))
        }
      });
    }

    return alerts;
  }

  /**
   * Detecta empleados con saldo de vacaciones alto
   */
  private static async detectHighVacationBalances(companyId: string): Promise<ProactiveAlert[]> {
    const alerts: ProactiveAlert[] = [];

    const { data: balances, error } = await supabase
      .from('employee_vacation_balances')
      .select(`
        id,
        employee_id,
        accumulated_days,
        employees (
          nombre,
          apellido
        )
      `)
      .eq('company_id', companyId)
      .gte('accumulated_days', 15); // Más de 15 días acumulados

    if (error || !balances) return alerts;

    if (balances.length > 0) {
      alerts.push({
        id: `high-vacation-balance-${Date.now()}`,
        type: AlertType.VACATION_BALANCE_HIGH,
        category: AlertCategory.BENEFITS,
        severity: AlertSeverity.LOW,
        title: 'Saldos de vacaciones altos',
        description: `${balances.length} empleado(s) tienen más de 15 días de vacaciones acumuladas`,
        affectedEntities: {
          employees: balances.map(b => b.employee_id),
          count: balances.length
        },
        recommendation: 'Considera programar las vacaciones de estos empleados para evitar acumulaciones excesivas.',
        actionRequired: false,
        detectedAt: new Date().toISOString(),
        metadata: {
          employeeBalances: balances.map(b => ({
            name: `${b.employees?.nombre} ${b.employees?.apellido}`,
            days: b.accumulated_days
          }))
        }
      });
    }

    return alerts;
  }

  /**
   * Detecta fechas límite próximas (pago seguridad social, etc.)
   */
  private static async detectUpcomingDeadlines(companyId: string): Promise<ProactiveAlert[]> {
    const alerts: ProactiveAlert[] = [];
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    // Fecha límite de pago seguridad social (10 del mes siguiente)
    const nextDeadline = new Date(currentYear, currentMonth + 1, 10);
    const daysUntilDeadline = Math.ceil(
      (nextDeadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysUntilDeadline <= 15 && daysUntilDeadline > 0) {
      alerts.push({
        id: `social-security-deadline-${Date.now()}`,
        type: AlertType.SOCIAL_SECURITY_DUE,
        category: AlertCategory.DEADLINES,
        severity: daysUntilDeadline <= 5 ? AlertSeverity.CRITICAL : AlertSeverity.HIGH,
        title: 'Pago de seguridad social próximo',
        description: `La fecha límite para pagar la seguridad social es en ${daysUntilDeadline} día(s)`,
        affectedEntities: {
          count: 1
        },
        recommendation: 'Asegúrate de realizar el pago de la seguridad social antes de la fecha límite para evitar sanciones.',
        actionRequired: true,
        dueDate: nextDeadline.toISOString().split('T')[0],
        detectedAt: new Date().toISOString(),
        metadata: {
          daysUntilDeadline,
          deadline: nextDeadline.toISOString().split('T')[0]
        }
      });
    }

    return alerts;
  }
}
