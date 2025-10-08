/**
 * Handler para Detección Proactiva de Problemas
 * Detecta y alerta sobre problemas antes de que se conviertan en críticos
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

interface ProactiveDetectionRequest {
  companyId: string;
  userId: string;
}

export async function handleProactiveDetection(
  request: ProactiveDetectionRequest,
  supabaseClient: ReturnType<typeof createClient>
): Promise<any> {
  console.log('🔍 [PROACTIVE] Iniciando detección proactiva para companyId:', request.companyId);

  try {
    const alerts: any[] = [];

    // Ejecutar todas las detecciones en paralelo
    const [
      incompleteEmployees,
      missingAffiliations,
      uncalculatedPeriods,
      pendingNovedades,
      expiringContracts,
      highVacationBalances,
      deadlineAlerts
    ] = await Promise.all([
      detectIncompleteEmployees(supabaseClient, request.companyId),
      detectMissingAffiliations(supabaseClient, request.companyId),
      detectUncalculatedPeriods(supabaseClient, request.companyId),
      detectPendingNovedades(supabaseClient, request.companyId),
      detectExpiringContracts(supabaseClient, request.companyId),
      detectHighVacationBalances(supabaseClient, request.companyId),
      detectUpcomingDeadlines(supabaseClient, request.companyId)
    ]);

    alerts.push(
      ...incompleteEmployees,
      ...missingAffiliations,
      ...uncalculatedPeriods,
      ...pendingNovedades,
      ...expiringContracts,
      ...highVacationBalances,
      ...deadlineAlerts
    );

    // Calcular resumen
    const summary = {
      total: alerts.length,
      critical: alerts.filter((a: any) => a.severity === 'critical').length,
      high: alerts.filter((a: any) => a.severity === 'high').length,
      medium: alerts.filter((a: any) => a.severity === 'medium').length,
      low: alerts.filter((a: any) => a.severity === 'low').length
    };

    const result = {
      alerts,
      summary,
      scanTimestamp: new Date().toISOString()
    };

    console.log('✅ [PROACTIVE] Detección completada:', summary);

    // Generar mensaje contextual de Maya
    const message = generateProactiveMessage(result);

    return {
      success: true,
      message,
      detection: result
    };
  } catch (error) {
    console.error('❌ [PROACTIVE] Error en detección:', error);
    throw error;
  }
}

/**
 * Detecta empleados con datos incompletos
 */
async function detectIncompleteEmployees(
  supabase: ReturnType<typeof createClient>,
  companyId: string
): Promise<any[]> {
  const { data: employees, error } = await supabase
    .from('employees')
    .select('id, nombre, apellido, eps, afp, arl, banco, numero_cuenta')
    .eq('company_id', companyId)
    .eq('estado', 'activo');

  if (error || !employees) return [];

  const incomplete = employees.filter(emp => 
    !emp.eps || !emp.afp || !emp.arl || !emp.banco || !emp.numero_cuenta
  );

  if (incomplete.length === 0) return [];

  return [{
    id: `incomplete-data-${Date.now()}`,
    type: 'incomplete_employee_data',
    category: 'employee_data',
    severity: 'medium',
    title: 'Empleados con datos incompletos',
    description: `${incomplete.length} empleado(s) tienen información faltante (EPS, AFP, ARL, datos bancarios)`,
    affectedEntities: {
      employees: incomplete.map(e => e.id),
      count: incomplete.length
    },
    recommendation: 'Completa la información de los empleados para evitar problemas en el cálculo de nómina y pagos.',
    actionRequired: true,
    detectedAt: new Date().toISOString(),
    metadata: {
      employeeNames: incomplete.map(e => `${e.nombre} ${e.apellido}`)
    }
  }];
}

/**
 * Detecta empleados con afiliaciones faltantes
 */
async function detectMissingAffiliations(
  supabase: ReturnType<typeof createClient>,
  companyId: string
): Promise<any[]> {
  const { data: employees, error } = await supabase
    .from('employees')
    .select('id, nombre, apellido, estado_afiliacion')
    .eq('company_id', companyId)
    .eq('estado', 'activo')
    .neq('estado_afiliacion', 'completa');

  if (error || !employees || employees.length === 0) return [];

  return [{
    id: `missing-affiliations-${Date.now()}`,
    type: 'missing_affiliations',
    category: 'affiliations',
    severity: 'high',
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
  }];
}

/**
 * Detecta períodos sin calcular próximos a vencer
 */
async function detectUncalculatedPeriods(
  supabase: ReturnType<typeof createClient>,
  companyId: string
): Promise<any[]> {
  const today = new Date();
  const thirtyDaysFromNow = new Date(today);
  thirtyDaysFromNow.setDate(today.getDate() + 30);

  const { data: periods, error } = await supabase
    .from('payroll_periods_real')
    .select('id, periodo, fecha_fin, estado')
    .eq('company_id', companyId)
    .in('estado', ['borrador', 'abierto'])
    .lte('fecha_fin', thirtyDaysFromNow.toISOString().split('T')[0]);

  if (error || !periods || periods.length === 0) return [];

  const daysUntilClosest = Math.ceil(
    (new Date(periods[0].fecha_fin).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  return [{
    id: `uncalculated-periods-${Date.now()}`,
    type: 'payroll_period_not_calculated',
    category: 'payroll',
    severity: daysUntilClosest <= 7 ? 'critical' : 'high',
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
  }];
}

/**
 * Detecta novedades pendientes
 */
async function detectPendingNovedades(
  supabase: ReturnType<typeof createClient>,
  companyId: string
): Promise<any[]> {
  const { data: pending, error } = await supabase
    .from('pending_payroll_adjustments')
    .select('id, employee_name, tipo_novedad, period_id')
    .eq('company_id', companyId);

  if (error || !pending || pending.length === 0) return [];

  return [{
    id: `pending-novedades-${Date.now()}`,
    type: 'pending_novedades',
    category: 'payroll',
    severity: 'medium',
    title: 'Novedades pendientes',
    description: `${pending.length} novedad(es) pendiente(s) de aplicar`,
    affectedEntities: {
      count: pending.length
    },
    recommendation: 'Revisa y aplica las novedades pendientes antes de calcular la nómina.',
    actionRequired: true,
    detectedAt: new Date().toISOString(),
    metadata: {
      adjustments: pending.map(a => ({
        employee: a.employee_name,
        type: a.tipo_novedad
      }))
    }
  }];
}

/**
 * Detecta contratos próximos a vencer
 */
async function detectExpiringContracts(
  supabase: ReturnType<typeof createClient>,
  companyId: string
): Promise<any[]> {
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

  if (error || !employees || employees.length === 0) return [];

  const thirtyDaysOrLess = employees.filter(e => {
    const daysUntilExpiry = Math.ceil(
      (new Date(e.fecha_finalizacion_contrato!).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );
    return daysUntilExpiry <= 30;
  });

  return [{
    id: `expiring-contracts-${Date.now()}`,
    type: 'contract_expiring_soon',
    category: 'deadlines',
    severity: thirtyDaysOrLess.length > 0 ? 'high' : 'medium',
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
  }];
}

/**
 * Detecta saldos de vacaciones altos
 */
async function detectHighVacationBalances(
  supabase: ReturnType<typeof createClient>,
  companyId: string
): Promise<any[]> {
  const { data: balances, error } = await supabase
    .from('employee_vacation_balances')
    .select(`
      id,
      employee_id,
      accumulated_days,
      employees:employee_id (
        nombre,
        apellido
      )
    `)
    .eq('company_id', companyId)
    .gte('accumulated_days', 15);

  if (error || !balances || balances.length === 0) return [];

  return [{
    id: `high-vacation-balance-${Date.now()}`,
    type: 'vacation_balance_high',
    category: 'benefits',
    severity: 'low',
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
        name: b.employees ? `${b.employees.nombre} ${b.employees.apellido}` : 'N/A',
        days: b.accumulated_days
      }))
    }
  }];
}

/**
 * Detecta fechas límite próximas
 */
async function detectUpcomingDeadlines(
  supabase: ReturnType<typeof createClient>,
  companyId: string
): Promise<any[]> {
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  // Fecha límite de pago seguridad social (10 del mes siguiente)
  const nextDeadline = new Date(currentYear, currentMonth + 1, 10);
  const daysUntilDeadline = Math.ceil(
    (nextDeadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysUntilDeadline <= 15 && daysUntilDeadline > 0) {
    return [{
      id: `social-security-deadline-${Date.now()}`,
      type: 'social_security_due',
      category: 'deadlines',
      severity: daysUntilDeadline <= 5 ? 'critical' : 'high',
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
    }];
  }

  return [];
}

/**
 * Genera mensaje contextual de Maya basado en las alertas
 */
function generateProactiveMessage(detection: any): string {
  const { summary, alerts } = detection;

  if (summary.total === 0) {
    return '¡Excelente! 🎉 He revisado todo el sistema y no encontré ningún problema que requiera tu atención. Todo está en orden.';
  }

  let message = `He realizado un escaneo proactivo de tu sistema y encontré **${summary.total} problema(s)** que requieren atención:\n\n`;

  if (summary.critical > 0) {
    message += `🚨 **${summary.critical} Crítico(s)**: Requieren acción inmediata\n`;
  }
  if (summary.high > 0) {
    message += `⚠️ **${summary.high} Alto(s)**: Requieren atención pronto\n`;
  }
  if (summary.medium > 0) {
    message += `📋 **${summary.medium} Medio(s)**: Requieren atención\n`;
  }
  if (summary.low > 0) {
    message += `ℹ️ **${summary.low} Bajo(s)**: Para tu conocimiento\n`;
  }

  message += '\nRevisa las alertas detalladas abajo para tomar acción. ¿En qué te puedo ayudar?';

  return message;
}
