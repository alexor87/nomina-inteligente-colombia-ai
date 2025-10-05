// ============================================================================
// AggregationService - Consultas de Agregación y Análisis de Datos
// ============================================================================
// Fase 1: Agregaciones Básicas
// - Total de costos de nómina
// - Aportes a seguridad social
// - Empleados con mayor costo
// - Total de días de incapacidad
// - Total de horas extras

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { TemporalParams, TemporalType } from '../core/temporal-types.ts';
import { PeriodQueryBuilder } from '../core/period-query-builder.ts';
import { TemporalResolver } from '../core/temporal-resolver.ts';

export interface AggregationResult {
  message: string;
  emotionalState: string;
  data?: any;
  visualization?: {
    type: 'metric' | 'table' | 'chart';
    data: any;
  };
}

// Helper: Get current company ID
async function getCurrentCompanyId(client: any): Promise<string | null> {
  try {
    const { data: { user } } = await client.auth.getUser();
    if (!user) return null;
    const { data, error } = await client
      .from('profiles')
      .select('company_id')
      .eq('user_id', user.id)
      .single();
    if (error) {
      console.error('🔒 [AGGREGATION] Error fetching company_id:', error);
      return null;
    }
    return data?.company_id ?? null;
  } catch (e) {
    console.error('🔒 [AGGREGATION] getCurrentCompanyId failed:', e);
    return null;
  }
}

// Helper: Format currency in COP
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

// ============================================================================
// 1. TOTAL PAYROLL COST (Refactored with PeriodQueryBuilder)
// ============================================================================
export async function getTotalPayrollCost(
  client: any,
  params: TemporalParams | { month?: string; year?: number; periodId?: string }
): Promise<AggregationResult> {
  console.log('💰 [AGGREGATION] getTotalPayrollCost called with params:', params);
  
  try {
    const companyId = await getCurrentCompanyId(client);
    if (!companyId) {
      return {
        message: '❌ No pude identificar tu empresa.',
        emotionalState: 'concerned'
      };
    }
    
    // Convert legacy params if needed
    const temporalParams = TemporalResolver.isLegacyFormat(params)
      ? TemporalResolver.fromLegacy(params)
      : params as TemporalParams;
    
    // Resolve periods using centralized builder
    const resolved = await PeriodQueryBuilder.resolvePeriods(client, companyId, temporalParams);
    
    if (!resolved || resolved.periods.length === 0) {
      return {
        message: `❌ No encontré períodos cerrados para ${TemporalResolver.getDisplayName(temporalParams)}`,
        emotionalState: 'concerned'
      };
    }
    
    // Aggregate payrolls from all resolved periods
    let totalDevengado = 0;
    let totalDeducciones = 0;
    let totalNeto = 0;
    const employeeSet = new Set<string>();
    
    for (const period of resolved.periods) {
      const { data: payrolls } = await client
        .from('payrolls')
        .select('total_devengado, total_deducciones, neto_pagado, employee_id')
        .eq('company_id', companyId)
        .eq('period_id', period.id);
      
      if (payrolls) {
        payrolls.forEach((p: any) => {
          totalDevengado += p.total_devengado || 0;
          totalDeducciones += p.total_deducciones || 0;
          totalNeto += p.neto_pagado || 0;
          employeeSet.add(p.employee_id);
        });
      }
    }
    
    if (totalDevengado === 0) {
      return {
        message: `No encontré registros de nómina para ${resolved.displayName}.`,
        emotionalState: 'neutral'
      };
    }
    
    // Calculate employer contributions (approximate: 25% of devengado)
    const employerContributions = totalDevengado * 0.25;
    const totalCost = totalDevengado + employerContributions;
    
    const periodInfo = resolved.periods.length > 1 
      ? `📅 **${resolved.periods.length} períodos**: ${resolved.periods.map(p => p.periodo).join(', ')}\n`
      : '';
    
    return {
      message: `📊 **Costo Total de Nómina - ${resolved.displayName}**\n\n` +
        periodInfo +
        `👥 **${employeeSet.size}** empleados\n` +
        `💰 **Devengado**: ${formatCurrency(totalDevengado)}\n` +
        `📉 **Deducciones**: ${formatCurrency(totalDeducciones)}\n` +
        `💵 **Neto Pagado**: ${formatCurrency(totalNeto)}\n` +
        `🏢 **Aportes Patronales**: ${formatCurrency(employerContributions)}\n\n` +
        `🎯 **COSTO TOTAL**: ${formatCurrency(totalCost)}`,
      emotionalState: 'professional',
      data: {
        period: resolved.displayName,
        periodsCount: resolved.periods.length,
        employeeCount: employeeSet.size,
        totalDevengado,
        totalDeducciones,
        totalNeto,
        employerContributions,
        totalCost
      },
      visualization: {
        type: 'metric',
        data: {
          title: 'Costo Total de Nómina',
          value: totalCost,
          subtitle: resolved.displayName,
          breakdown: [
            { label: 'Devengado', value: totalDevengado },
            { label: 'Aportes Patronales', value: employerContributions },
            { label: 'Deducciones', value: totalDeducciones }
          ]
        }
      }
    };
  } catch (e) {
    console.error('❌ [AGGREGATION] getTotalPayrollCost failed:', e);
    return {
      message: `❌ Error al calcular el costo total: ${e.message}`,
      emotionalState: 'concerned'
    };
  }
}

// ============================================================================
// 2. SECURITY CONTRIBUTIONS (Refactored with PeriodQueryBuilder)
// ============================================================================
export async function getSecurityContributions(
  client: any,
  params: TemporalParams | { month?: string; year?: number; periodId?: string; monthCount?: number; quarter?: number; semester?: number; monthStart?: string; monthEnd?: string }
): Promise<AggregationResult> {
  console.log('🏥 [AGGREGATION] getSecurityContributions called with params:', params);
  
  try {
    const companyId = await getCurrentCompanyId(client);
    if (!companyId) {
      return {
        message: '❌ No pude identificar tu empresa.',
        emotionalState: 'concerned'
      };
    }
    
    // Convert legacy params if needed
    const temporalParams = TemporalResolver.isLegacyFormat(params)
      ? TemporalResolver.fromLegacy(params)
      : params as TemporalParams;
    
    // Resolve periods using centralized builder
    const resolved = await PeriodQueryBuilder.resolvePeriods(client, companyId, temporalParams);
    
    if (!resolved || resolved.periods.length === 0) {
      return {
        message: `❌ No encontré períodos cerrados para ${TemporalResolver.getDisplayName(temporalParams)}`,
        emotionalState: 'concerned'
      };
    }
    
    // Aggregate payrolls from all resolved periods
    let totalDevengado = 0;
    
    for (const period of resolved.periods) {
      const { data: payrolls } = await client
        .from('payrolls')
        .select('total_devengado')
        .eq('company_id', companyId)
        .eq('period_id', period.id);
      
      if (payrolls) {
        payrolls.forEach((p: any) => {
          totalDevengado += p.total_devengado || 0;
        });
      }
    }
    
    if (totalDevengado === 0) {
      return {
        message: `No encontré registros de nómina para ${resolved.displayName}.`,
        emotionalState: 'neutral'
      };
    }
    
    // Calculate security contributions
    // EPS: 12.5% total (8.5% empleador, 4% empleado)
    // Pensión: 16% total (12% empleador, 4% empleado)
    // ARL: ~0.522% empleador (promedio)
    
    const epsEmployee = totalDevengado * 0.04;
    const epsEmployer = totalDevengado * 0.085;
    const epsTotal = epsEmployee + epsEmployer;
    
    const pensionEmployee = totalDevengado * 0.04;
    const pensionEmployer = totalDevengado * 0.12;
    const pensionTotal = pensionEmployee + pensionEmployer;
    
    const arl = totalDevengado * 0.00522;
    const totalContributions = epsTotal + pensionTotal + arl;
    
    const periodInfo = resolved.periods.length > 1 
      ? `📅 **${resolved.periods.length} períodos procesados**\n\n`
      : '';
    
    return {
      message: `🏥 **Aportes a Seguridad Social - ${resolved.displayName}**\n\n` +
        periodInfo +
        `**EPS (Salud)**\n` +
        `👤 Empleado: ${formatCurrency(epsEmployee)} (4%)\n` +
        `🏢 Empleador: ${formatCurrency(epsEmployer)} (8.5%)\n` +
        `📊 Total EPS: ${formatCurrency(epsTotal)}\n\n` +
        `**Pensión**\n` +
        `👤 Empleado: ${formatCurrency(pensionEmployee)} (4%)\n` +
        `🏢 Empleador: ${formatCurrency(pensionEmployer)} (12%)\n` +
        `📊 Total Pensión: ${formatCurrency(pensionTotal)}\n\n` +
        `**ARL**\n` +
        `🏢 Empleador: ${formatCurrency(arl)} (0.522%)\n\n` +
        `🎯 **TOTAL APORTES**: ${formatCurrency(totalContributions)}`,
      emotionalState: 'professional',
      data: {
        period: resolved.displayName,
        periodsCount: resolved.periods.length,
        eps: { employee: epsEmployee, employer: epsEmployer, total: epsTotal },
        pension: { employee: pensionEmployee, employer: pensionEmployer, total: pensionTotal },
        arl,
        totalContributions
      },
      visualization: {
        type: 'chart',
        data: {
          title: 'Aportes a Seguridad Social',
          subtitle: resolved.displayName,
          type: 'bar',
          categories: ['EPS', 'Pensión', 'ARL'],
          series: [
            { name: 'Empleado', data: [epsEmployee, pensionEmployee, 0] },
            { name: 'Empleador', data: [epsEmployer, pensionEmployer, arl] }
          ]
        }
      }
    };
  } catch (e) {
    console.error('❌ [AGGREGATION] getSecurityContributions failed:', e);
    return {
      message: `❌ Error al calcular los aportes: ${e.message}`,
      emotionalState: 'concerned'
    };
  }
}

// ============================================================================
// 3. HIGHEST COST EMPLOYEES
// ============================================================================
export async function getHighestCostEmployees(
  client: any,
  params: { month?: string; year?: number; periodId?: string; limit?: number }
): Promise<AggregationResult> {
  console.log('👥 [AGGREGATION] getHighestCostEmployees called with params:', params);
  
  try {
    const companyId = await getCurrentCompanyId(client);
    if (!companyId) {
      return {
        message: '❌ No pude identificar tu empresa.',
        emotionalState: 'concerned'
      };
    }
    
    const limit = params.limit || 5;
    
    // 🆕 INFER YEAR IF ONLY MONTH PROVIDED
    let targetYear = params.year;
    
    if (params.month && !params.year && !params.periodId) {
      const recentPeriod = await getPeriodId(client, companyId, { month: params.month });
      if (recentPeriod) {
        const yearMatch = recentPeriod.periodo.match(/(\d{4})/);
        targetYear = yearMatch ? parseInt(yearMatch[1]) : null;
      }
    }
    
    // 🆕 DETECT FULL MONTH QUERY
    const isFullMonthQuery = params.month && targetYear && !params.periodId;
    
    if (isFullMonthQuery) {
      const periods = await getPeriodsByMonth(client, companyId, {
        month: params.month!,
        year: targetYear!
      });
      
      if (!periods || periods.length === 0) {
        return {
          message: `❌ No encontré períodos cerrados para ${params.month} ${targetYear}`,
          emotionalState: 'concerned'
        };
      }
      
      // Accumulate costs per employee across all periods
      const employeeCosts: Record<string, { name: string; devengado: number }> = {};
      
      for (const period of periods) {
        const { data: payrolls } = await client
          .from('payrolls')
          .select(`
            total_devengado,
            employee_id,
            employees!inner(nombre, apellido)
          `)
          .eq('company_id', companyId)
          .eq('period_id', period.id);
        
        if (payrolls) {
          payrolls.forEach((p: any) => {
            const empId = p.employee_id;
            if (!employeeCosts[empId]) {
              employeeCosts[empId] = {
                name: `${p.employees.nombre} ${p.employees.apellido}`,
                devengado: 0
              };
            }
            employeeCosts[empId].devengado += p.total_devengado || 0;
          });
        }
      }
      
      const employeesWithCost = Object.values(employeeCosts)
        .map(e => ({
          name: e.name,
          devengado: e.devengado,
          employerContributions: e.devengado * 0.25,
          totalCost: e.devengado * 1.25
        }))
        .sort((a, b) => b.totalCost - a.totalCost)
        .slice(0, limit);
      
      const tableRows = employeesWithCost.map((e, i) => 
        `${i + 1}. **${e.name}**\n` +
        `   💰 Devengado: ${formatCurrency(e.devengado)}\n` +
        `   🏢 Aportes: ${formatCurrency(e.employerContributions)}\n` +
        `   🎯 Costo Total: ${formatCurrency(e.totalCost)}`
      ).join('\n\n');
      
      const periodNames = periods.map(p => p.periodo).join(', ');
      const monthCapitalized = params.month.charAt(0).toUpperCase() + params.month.slice(1);
      
      return {
        message: `👥 **Empleados con Mayor Costo - ${monthCapitalized} ${targetYear} (Mes Completo)**\n\n` +
          `📅 **${periods.length} período${periods.length > 1 ? 's' : ''} sumado${periods.length > 1 ? 's' : ''}**: ${periodNames}\n\n${tableRows}`,
        emotionalState: 'professional',
        data: {
          period: `${monthCapitalized} ${targetYear}`,
          periodsCount: periods.length,
          employees: employeesWithCost
        }
      };
    }
    
    // ORIGINAL LOGIC: Specific period query
    let periodId = params.periodId;
    let periodName = '';
    
    if (!periodId) {
      const period = await getPeriodId(client, companyId, params);
      if (!period) {
        return {
          message: params.month || params.year 
            ? `❌ No encontré períodos cerrados para ${params.month || ''} ${params.year || ''}`
            : '❌ No encontré períodos cerrados en tu empresa.',
          emotionalState: 'concerned'
        };
      }
      periodId = period.id;
      periodName = period.periodo;
    }
    
    // Query payrolls with employee names
    const { data: payrolls, error } = await client
      .from('payrolls')
      .select(`
        total_devengado,
        employee_id,
        employees!inner(nombre, apellido)
      `)
      .eq('company_id', companyId)
      .eq('period_id', periodId)
      .order('total_devengado', { ascending: false })
      .limit(limit);
    
    if (error) {
      console.error('❌ [AGGREGATION] Error querying payrolls:', error);
      return {
        message: '❌ Hubo un error al consultar la nómina.',
        emotionalState: 'concerned'
      };
    }
    
    if (!payrolls || payrolls.length === 0) {
      return {
        message: `No encontré registros de nómina para el período ${periodName || 'solicitado'}.`,
        emotionalState: 'neutral'
      };
    }
    
    // Calculate employer cost (devengado + 25% contributions)
    const employeesWithCost = payrolls.map(p => ({
      name: `${p.employees.nombre} ${p.employees.apellido}`,
      devengado: p.total_devengado,
      employerContributions: p.total_devengado * 0.25,
      totalCost: p.total_devengado * 1.25
    }));
    
    const tableRows = employeesWithCost.map((e, i) => 
      `${i + 1}. **${e.name}**\n` +
      `   💰 Devengado: ${formatCurrency(e.devengado)}\n` +
      `   🏢 Aportes: ${formatCurrency(e.employerContributions)}\n` +
      `   🎯 Costo Total: ${formatCurrency(e.totalCost)}`
    ).join('\n\n');
    
    return {
      message: `👥 **Empleados con Mayor Costo - ${periodName}**\n\n${tableRows}`,
      emotionalState: 'professional',
      data: {
        period: periodName,
        employees: employeesWithCost
      },
      visualization: {
        type: 'table',
        data: {
          title: `Top ${limit} Empleados por Costo`,
          subtitle: periodName,
          headers: ['#', 'Empleado', 'Devengado', 'Aportes', 'Costo Total'],
          rows: employeesWithCost.map((e, i) => [
            (i + 1).toString(),
            e.name,
            formatCurrency(e.devengado),
            formatCurrency(e.employerContributions),
            formatCurrency(e.totalCost)
          ])
        }
      }
    };
  } catch (e) {
    console.error('❌ [AGGREGATION] getHighestCostEmployees failed:', e);
    return {
      message: `❌ Error al obtener empleados: ${e.message}`,
      emotionalState: 'concerned'
    };
  }
}

// ============================================================================
// 4. LOWEST COST EMPLOYEES
// ============================================================================
export async function getLowestCostEmployees(
  client: any,
  params: { month?: string; year?: number; periodId?: string; limit?: number }
): Promise<AggregationResult> {
  console.log('💰 [AGGREGATION] getLowestCostEmployees called with params:', params);
  
  try {
    const companyId = await getCurrentCompanyId(client);
    if (!companyId) {
      return {
        message: '❌ No pude identificar tu empresa.',
        emotionalState: 'concerned'
      };
    }
    
    const limit = params.limit || 5;
    
    // 🆕 INFER YEAR IF ONLY MONTH PROVIDED
    let targetYear = params.year;
    
    if (params.month && !params.year && !params.periodId) {
      const recentPeriod = await getPeriodId(client, companyId, { month: params.month });
      if (recentPeriod) {
        const yearMatch = recentPeriod.periodo.match(/(\d{4})/);
        targetYear = yearMatch ? parseInt(yearMatch[1]) : null;
      }
    }
    
    // 🆕 DETECT FULL MONTH QUERY
    const isFullMonthQuery = params.month && targetYear && !params.periodId;
    
    if (isFullMonthQuery) {
      const periods = await getPeriodsByMonth(client, companyId, {
        month: params.month!,
        year: targetYear!
      });
      
      if (!periods || periods.length === 0) {
        return {
          message: `❌ No encontré períodos cerrados para ${params.month} ${targetYear}`,
          emotionalState: 'concerned'
        };
      }
      
      // Accumulate costs per employee across all periods
      const employeeCosts: Record<string, { name: string; devengado: number }> = {};
      
      for (const period of periods) {
        const { data: payrolls } = await client
          .from('payrolls')
          .select(`
            total_devengado,
            employee_id,
            employees!inner(nombre, apellido)
          `)
          .eq('company_id', companyId)
          .eq('period_id', period.id);
        
        if (payrolls) {
          payrolls.forEach((p: any) => {
            const empId = p.employee_id;
            if (!employeeCosts[empId]) {
              employeeCosts[empId] = {
                name: `${p.employees.nombre} ${p.employees.apellido}`,
                devengado: 0
              };
            }
            employeeCosts[empId].devengado += p.total_devengado || 0;
          });
        }
      }
      
      const employeesWithCost = Object.values(employeeCosts)
        .map(e => ({
          name: e.name,
          devengado: e.devengado,
          employerContributions: e.devengado * 0.25,
          totalCost: e.devengado * 1.25
        }))
        .sort((a, b) => a.totalCost - b.totalCost) // ASC - menor a mayor
        .slice(0, limit);
      
      const tableRows = employeesWithCost.map((e, i) => 
        `${i + 1}. **${e.name}**\n` +
        `   💰 Devengado: ${formatCurrency(e.devengado)}\n` +
        `   🏢 Aportes: ${formatCurrency(e.employerContributions)}\n` +
        `   🎯 Costo Total: ${formatCurrency(e.totalCost)}`
      ).join('\n\n');
      
      const periodNames = periods.map(p => p.periodo).join(', ');
      const monthCapitalized = params.month.charAt(0).toUpperCase() + params.month.slice(1);
      
      return {
        message: `👥 **Empleados con Menor Costo - ${monthCapitalized} ${targetYear} (Mes Completo)**\n\n` +
          `📅 **${periods.length} período${periods.length > 1 ? 's' : ''} sumado${periods.length > 1 ? 's' : ''}**: ${periodNames}\n\n${tableRows}`,
        emotionalState: 'professional',
        data: {
          period: `${monthCapitalized} ${targetYear}`,
          periodsCount: periods.length,
          employees: employeesWithCost
        }
      };
    }
    
    // ORIGINAL LOGIC: Specific period query
    let periodId = params.periodId;
    let periodName = '';
    
    if (!periodId) {
      const period = await getPeriodId(client, companyId, params);
      if (!period) {
        return {
          message: params.month || params.year 
            ? `❌ No encontré períodos cerrados para ${params.month || ''} ${params.year || ''}`
            : '❌ No encontré períodos cerrados en tu empresa.',
          emotionalState: 'concerned'
        };
      }
      periodId = period.id;
      periodName = period.periodo;
    }
    
    // Query payrolls with employee names - ORDER BY ASC (menor a mayor)
    const { data: payrolls, error } = await client
      .from('payrolls')
      .select(`
        total_devengado,
        employee_id,
        employees!inner(nombre, apellido)
      `)
      .eq('company_id', companyId)
      .eq('period_id', periodId)
      .order('total_devengado', { ascending: true }) // ⚠️ KEY CHANGE: ASC instead of DESC
      .limit(limit);
    
    if (error) {
      console.error('❌ [AGGREGATION] Error querying payrolls:', error);
      return {
        message: '❌ Hubo un error al consultar la nómina.',
        emotionalState: 'concerned'
      };
    }
    
    if (!payrolls || payrolls.length === 0) {
      return {
        message: `No encontré registros de nómina para el período ${periodName || 'solicitado'}.`,
        emotionalState: 'neutral'
      };
    }
    
    // Calculate employer cost (devengado + 25% contributions)
    const employeesWithCost = payrolls.map(p => ({
      name: `${p.employees.nombre} ${p.employees.apellido}`,
      devengado: p.total_devengado,
      employerContributions: p.total_devengado * 0.25,
      totalCost: p.total_devengado * 1.25
    }));
    
    const tableRows = employeesWithCost.map((e, i) => 
      `${i + 1}. **${e.name}**\n` +
      `   💰 Devengado: ${formatCurrency(e.devengado)}\n` +
      `   🏢 Aportes: ${formatCurrency(e.employerContributions)}\n` +
      `   🎯 Costo Total: ${formatCurrency(e.totalCost)}`
    ).join('\n\n');
    
    const titleSingular = limit === 1 ? 'Empleado con Menor Costo' : `Top ${limit} Empleados con Menor Costo`;
    
    return {
      message: `👥 **${titleSingular} - ${periodName}**\n\n${tableRows}`,
      emotionalState: 'professional',
      data: {
        period: periodName,
        employees: employeesWithCost
      },
      visualization: {
        type: 'table',
        data: {
          title: titleSingular,
          subtitle: periodName,
          headers: ['#', 'Empleado', 'Devengado', 'Aportes', 'Costo Total'],
          rows: employeesWithCost.map((e, i) => [
            (i + 1).toString(),
            e.name,
            formatCurrency(e.devengado),
            formatCurrency(e.employerContributions),
            formatCurrency(e.totalCost)
          ])
        }
      }
    };
  } catch (e) {
    console.error('❌ [AGGREGATION] getLowestCostEmployees failed:', e);
    return {
      message: `❌ Error al obtener empleados: ${e.message}`,
      emotionalState: 'concerned'
    };
  }
}

// ============================================================================
// 5. TOTAL INCAPACITY DAYS (REFACTORED WITH TEMPORAL ARCHITECTURE)
// ============================================================================
export async function getTotalIncapacityDays(
  client: any,
  params: TemporalParams | { month?: string; year?: number; periodId?: string; monthCount?: number }
): Promise<AggregationResult> {
  console.log('🏥 [AGGREGATION] getTotalIncapacityDays called with params:', params);
  
  try {
    const companyId = await getCurrentCompanyId(client);
    if (!companyId) {
      return {
        message: '❌ No pude identificar tu empresa.',
        emotionalState: 'concerned'
      };
    }
    
    // 🆕 BACKWARD COMPATIBILITY: Convert legacy params to TemporalParams
    let temporalParams: TemporalParams;
    if ('type' in params && params.type) {
      // Already using TemporalParams format
      temporalParams = params as TemporalParams;
      console.log('✅ [AGGREGATION] Using TemporalParams format');
    } else {
      // Legacy format - convert to TemporalParams
      temporalParams = TemporalResolver.fromLegacy(params);
      console.log('🔄 [AGGREGATION] Converted legacy params to TemporalParams');
    }
    
    // 🆕 USE PERIOD QUERY BUILDER (centralized period resolution)
    const resolved = await PeriodQueryBuilder.resolvePeriods(client, companyId, temporalParams);
    
    if (!resolved) {
      return {
        message: `❌ No encontré períodos cerrados para ${TemporalResolver.getDisplayName(temporalParams)}`,
        emotionalState: 'concerned'
      };
    }
    
    console.log(`✅ [AGGREGATION] Found ${resolved.periods.length} periods for ${resolved.displayName}`);
    
    // Query incapacidades for ALL resolved periods
    const allNovedades: any[] = [];
    
    for (const period of resolved.periods) {
      const { data: novedades } = await client
        .from('payroll_novedades')
        .select('dias, valor, subtipo, empleado_id')
        .eq('company_id', companyId)
        .eq('periodo_id', period.id)
        .eq('tipo_novedad', 'incapacidad');
      
      if (novedades) {
        allNovedades.push(...novedades);
      }
    }
    
    // Handle no incapacities case
    if (allNovedades.length === 0) {
      return {
        message: `🏥 **Días de Incapacidad - ${resolved.displayName}**\n\n` +
          `✅ No hubo incapacidades registradas en ${resolved.displayName}.`,
        emotionalState: 'celebrating',
        data: {
          period: resolved.displayName,
          periodsCount: resolved.periods.length,
          totalDays: 0,
          totalIncapacities: 0,
          totalCost: 0
        }
      };
    }
    
    // Calculate totals
    const totalDays = allNovedades.reduce((sum, n) => sum + (n.dias || 0), 0);
    const totalCost = allNovedades.reduce((sum, n) => sum + Math.abs(n.valor || 0), 0);
    const employeeCount = new Set(allNovedades.map(n => n.empleado_id)).size;
    
    // Breakdown by subtype
    const bySubtype: Record<string, { count: number; days: number }> = {};
    allNovedades.forEach(n => {
      const subtype = n.subtipo || 'general';
      if (!bySubtype[subtype]) {
        bySubtype[subtype] = { count: 0, days: 0 };
      }
      bySubtype[subtype].count++;
      bySubtype[subtype].days += n.dias || 0;
    });
    
    const subtypeBreakdown = Object.entries(bySubtype)
      .map(([type, data]) => `• **${type}**: ${data.count} incapacidades, ${data.days} días`)
      .join('\n');
    
    return {
      message: `🏥 **Días de Incapacidad - ${resolved.displayName}**\n\n` +
        `📅 **${resolved.periods.length} período${resolved.periods.length > 1 ? 's' : ''} analizados**\n` +
        `📊 **Total días incapacidad: ${totalDays}**\n` +
        `📋 **${allNovedades.length}** incapacidades registradas\n` +
        `👥 **${employeeCount}** empleados afectados\n` +
        `💰 Costo estimado: ${formatCurrency(totalCost)}\n\n` +
        `**Por tipo:**\n${subtypeBreakdown}`,
      emotionalState: totalDays > 30 ? 'concerned' : 'professional',
      data: {
        period: resolved.displayName,
        periodsCount: resolved.periods.length,
        totalIncapacities: allNovedades.length,
        totalDays,
        totalCost,
        affectedEmployees: employeeCount,
        bySubtype
      },
      visualization: {
        type: 'metric',
        data: {
          title: 'Días de Incapacidad',
          value: totalDays,
          subtitle: resolved.displayName,
          breakdown: Object.entries(bySubtype).map(([type, data]) => ({
            label: type,
            value: data.days
          }))
        }
      }
    };
  } catch (e) {
    console.error('❌ [AGGREGATION] getTotalIncapacityDays failed:', e);
    return {
      message: `❌ Error al calcular días de incapacidad: ${e.message}`,
      emotionalState: 'concerned'
    };
  }
}


// ============================================================================
// 5. TOTAL OVERTIME HOURS
// ============================================================================
export async function getTotalOvertimeHours(
  client: any,
  params: { month?: string; year?: number; periodId?: string }
): Promise<AggregationResult> {
  console.log('⏰ [AGGREGATION] getTotalOvertimeHours called with params:', params);
  
  try {
    const companyId = await getCurrentCompanyId(client);
    if (!companyId) {
      return {
        message: '❌ No pude identificar tu empresa.',
        emotionalState: 'concerned'
      };
    }
    
    // 🆕 INFER YEAR IF ONLY MONTH PROVIDED
    let targetYear = params.year;
    
    if (params.month && !params.year && !params.periodId) {
      const recentPeriod = await getPeriodId(client, companyId, { month: params.month });
      if (recentPeriod) {
        const yearMatch = recentPeriod.periodo.match(/(\d{4})/);
        targetYear = yearMatch ? parseInt(yearMatch[1]) : null;
      }
    }
    
    // 🆕 DETECT FULL MONTH QUERY
    const isFullMonthQuery = params.month && targetYear && !params.periodId;
    
    if (isFullMonthQuery) {
      const periods = await getPeriodsByMonth(client, companyId, {
        month: params.month!,
        year: targetYear!
      });
      
      if (!periods || periods.length === 0) {
        return {
          message: `❌ No encontré períodos cerrados para ${params.month} ${targetYear}`,
          emotionalState: 'concerned'
        };
      }
      
      const allNovedades: any[] = [];
      
      for (const period of periods) {
        const { data: novedades } = await client
          .from('payroll_novedades')
          .select(`
            dias,
            valor,
            tipo_novedad,
            empleado_id
          `)
          .eq('company_id', companyId)
          .eq('periodo_id', period.id)
          .in('tipo_novedad', ['hora_extra', 'recargo_nocturno', 'recargo_dominical']);
        
        if (novedades) {
          allNovedades.push(...novedades);
        }
      }
      
      if (allNovedades.length === 0) {
        const monthCapitalized = params.month.charAt(0).toUpperCase() + params.month.slice(1);
        return {
          message: `No se registraron horas extras en ${monthCapitalized} ${params.year}.`,
          emotionalState: 'neutral'
        };
      }
      
      const totalHours = allNovedades.reduce((sum, n) => sum + (n.dias || 0), 0);
      const totalCost = allNovedades.reduce((sum, n) => sum + (n.valor || 0), 0);
      const employeeCount = new Set(allNovedades.map(n => n.empleado_id)).size;
      
      const byType: Record<string, { count: number; hours: number; cost: number }> = {};
      allNovedades.forEach(n => {
        const type = n.tipo_novedad || 'hora_extra';
        if (!byType[type]) {
          byType[type] = { count: 0, hours: 0, cost: 0 };
        }
        byType[type].count++;
        byType[type].hours += n.dias || 0;
        byType[type].cost += n.valor || 0;
      });
      
      const typeBreakdown = Object.entries(byType)
        .map(([type, data]) => 
          `• **${type.replace(/_/g, ' ')}**: ${data.hours} horas - ${formatCurrency(data.cost)}`
        )
        .join('\n');
      
      const periodNames = periods.map(p => p.periodo).join(', ');
      const monthCapitalized = params.month.charAt(0).toUpperCase() + params.month.slice(1);
      
      return {
        message: `⏰ **Total de Horas Extras - ${monthCapitalized} ${targetYear} (Mes Completo)**\n\n` +
          `📅 **${periods.length} período${periods.length > 1 ? 's' : ''} sumado${periods.length > 1 ? 's' : ''}**: ${periodNames}\n` +
          `📊 **${totalHours}** horas extras totales\n` +
          `👥 **${employeeCount}** empleados\n` +
          `💰 Costo total: ${formatCurrency(totalCost)}\n\n` +
          `**Por tipo:**\n${typeBreakdown}`,
        emotionalState: 'professional',
        data: {
          period: `${monthCapitalized} ${targetYear}`,
          periodsCount: periods.length,
          totalHours,
          totalCost,
          employeeCount,
          byType
        }
      };
    }
    
    // ORIGINAL LOGIC: Specific period query
    let periodId = params.periodId;
    let periodName = '';
    
    if (!periodId) {
      const period = await getPeriodId(client, companyId, params);
      if (!period) {
        return {
          message: params.month || params.year 
            ? `❌ No encontré períodos cerrados para ${params.month || ''} ${params.year || ''}`
            : '❌ No encontré períodos cerrados en tu empresa.',
          emotionalState: 'concerned'
        };
      }
      periodId = period.id;
      periodName = period.periodo;
    }
    
    // Query novedades for overtime
    const { data: novedades, error } = await client
      .from('payroll_novedades')
      .select(`
        dias,
        valor,
        subtipo,
        tipo_novedad,
        empleado_id,
        employees!inner(nombre, apellido)
      `)
      .eq('company_id', companyId)
      .eq('periodo_id', periodId)
      .in('tipo_novedad', ['hora_extra', 'recargo_nocturno', 'recargo_dominical']);
    
    if (error) {
      console.error('❌ [AGGREGATION] Error querying novedades:', error);
      return {
        message: '❌ Hubo un error al consultar las novedades.',
        emotionalState: 'concerned'
      };
    }
    
    if (!novedades || novedades.length === 0) {
      return {
        message: `No se registraron horas extras en el período ${periodName}.`,
        emotionalState: 'neutral'
      };
    }
    
    const totalHours = novedades.reduce((sum, n) => sum + (n.dias || 0), 0);
    const totalCost = novedades.reduce((sum, n) => sum + (n.valor || 0), 0);
    const employeeCount = new Set(novedades.map(n => n.empleado_id)).size;
    
    // Group by type
    const byType: Record<string, { count: number; hours: number; cost: number }> = {};
    novedades.forEach(n => {
      const type = n.tipo_novedad || 'hora_extra';
      if (!byType[type]) {
        byType[type] = { count: 0, hours: 0, cost: 0 };
      }
      byType[type].count++;
      byType[type].hours += n.dias || 0;
      byType[type].cost += n.valor || 0;
    });
    
    const typeBreakdown = Object.entries(byType)
      .map(([type, data]) => 
        `• **${type.replace(/_/g, ' ')}**: ${data.hours} horas - ${formatCurrency(data.cost)}`
      )
      .join('\n');
    
    return {
      message: `⏰ **Total de Horas Extras - ${periodName}**\n\n` +
        `📊 **${totalHours}** horas extras totales\n` +
        `👥 **${employeeCount}** empleados\n` +
        `💰 Costo total: ${formatCurrency(totalCost)}\n\n` +
        `**Por tipo:**\n${typeBreakdown}`,
      emotionalState: 'professional',
      data: {
        period: periodName,
        totalHours,
        totalCost,
        employeeCount,
        byType
      },
      visualization: {
        type: 'metric',
        data: {
          title: 'Horas Extras',
          value: totalHours,
          subtitle: periodName,
          breakdown: Object.entries(byType).map(([type, data]) => ({
            label: type.replace(/_/g, ' '),
            value: data.hours
          }))
        }
      }
    };
  } catch (e) {
    console.error('❌ [AGGREGATION] getTotalOvertimeHours failed:', e);
    return {
      message: `❌ Error al consultar horas extras: ${e.message}`,
      emotionalState: 'concerned'
    };
  }
}
