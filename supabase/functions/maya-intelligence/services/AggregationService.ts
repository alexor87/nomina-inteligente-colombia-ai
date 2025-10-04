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

// Helper: Get period ID from params (month/year or latest)
async function getPeriodId(
  client: any, 
  companyId: string, 
  params: { month?: string; year?: number }
): Promise<{ id: string; periodo: string } | null> {
  try {
    let query = client
      .from('payroll_periods_real')
      .select('id, periodo, fecha_inicio, fecha_fin')
      .eq('company_id', companyId)
      .eq('estado', 'cerrado');
    
    // Filter by year if provided
    if (params.year) {
      const yearStr = params.year.toString();
      query = query.like('periodo', `%${yearStr}%`);
    }
    
    // Filter by month if provided
    if (params.month) {
      const monthCapitalized = params.month.charAt(0).toUpperCase() + params.month.slice(1);
      query = query.like('periodo', `%${monthCapitalized}%`);
    }
    
    query = query.order('fecha_fin', { ascending: false }).limit(1);
    
    const { data, error } = await query;
    
    if (error) {
      console.error('❌ [AGGREGATION] Error fetching period:', error);
      return null;
    }
    
    return data?.[0] ? { id: data[0].id, periodo: data[0].periodo } : null;
  } catch (e) {
    console.error('❌ [AGGREGATION] getPeriodId failed:', e);
    return null;
  }
}

// Helper: Get ALL periods for a specific month (for full month aggregations)
async function getPeriodsByMonth(
  client: any,
  companyId: string,
  params: { month: string; year: number }
): Promise<Array<{ id: string; periodo: string }> | null> {
  try {
    const monthCapitalized = params.month.charAt(0).toUpperCase() + params.month.slice(1);
    const yearStr = params.year.toString();
    
    const { data, error } = await client
      .from('payroll_periods_real')
      .select('id, periodo, fecha_inicio, fecha_fin')
      .eq('company_id', companyId)
      .eq('estado', 'cerrado')
      .like('periodo', `%${monthCapitalized}%`)
      .like('periodo', `%${yearStr}%`)
      .order('fecha_inicio', { ascending: true });
    
    if (error) {
      console.error('❌ [AGGREGATION] Error fetching periods by month:', error);
      return null;
    }
    
    return data && data.length > 0 ? data : null;
  } catch (e) {
    console.error('❌ [AGGREGATION] getPeriodsByMonth failed:', e);
    return null;
  }
}

// Helper to get periods by year
async function getPeriodsByYear(
  client: any,
  companyId: string,
  year: number
): Promise<any[]> {
  try {
    const { data: periods, error } = await client
      .from('payroll_periods_real')
      .select('id, periodo, fecha_inicio, fecha_fin, total_devengado, total_deducciones, total_neto')
      .eq('company_id', companyId)
      .eq('estado', 'cerrado')
      .gte('fecha_inicio', `${year}-01-01`)
      .lte('fecha_fin', `${year}-12-31`)
      .order('fecha_inicio', { ascending: true });
    
    if (error) {
      console.error('❌ [AGGREGATION] Error fetching periods by year:', error);
      return [];
    }
    
    console.log(`✅ [AGGREGATION] Found ${periods?.length || 0} periods for year ${year}`);
    return periods || [];
  } catch (e) {
    console.error('❌ [AGGREGATION] getPeriodsByYear failed:', e);
    return [];
  }
}

// Helper to get last N months periods
async function getLastNMonthsPeriods(
  client: any,
  companyId: string,
  monthCount: number
): Promise<any[]> {
  try {
    const endDate = new Date();
    const startDate = new Date(endDate.getFullYear(), endDate.getMonth() - monthCount + 1, 1);
    
    const { data: periods, error } = await client
      .from('payroll_periods_real')
      .select('id, periodo, fecha_inicio, fecha_fin, total_devengado, total_deducciones, total_neto')
      .eq('company_id', companyId)
      .eq('estado', 'cerrado')
      .gte('fecha_inicio', startDate.toISOString().split('T')[0])
      .lte('fecha_fin', endDate.toISOString().split('T')[0])
      .order('fecha_inicio', { ascending: true });
    
    if (error) {
      console.error('❌ [AGGREGATION] Error fetching last N months:', error);
      return [];
    }
    
    console.log(`✅ [AGGREGATION] Found ${periods?.length || 0} periods for last ${monthCount} months`);
    return periods || [];
  } catch (e) {
    console.error('❌ [AGGREGATION] getLastNMonthsPeriods failed:', e);
    return [];
  }
}

// Helper to get quarter periods
async function getQuarterPeriods(
  client: any,
  companyId: string,
  quarter: number,
  year?: number
): Promise<any[]> {
  try {
    const targetYear = year || new Date().getFullYear();
    const startMonth = (quarter - 1) * 3 + 1;
    const endMonth = quarter * 3;
    
    const { data: periods, error } = await client
      .from('payroll_periods_real')
      .select('id, periodo, fecha_inicio, fecha_fin, total_devengado, total_deducciones, total_neto')
      .eq('company_id', companyId)
      .eq('estado', 'cerrado')
      .gte('fecha_inicio', `${targetYear}-${String(startMonth).padStart(2, '0')}-01`)
      .lte('fecha_fin', `${targetYear}-${String(endMonth).padStart(2, '0')}-31`)
      .order('fecha_inicio', { ascending: true });
    
    if (error) {
      console.error('❌ [AGGREGATION] Error fetching quarter periods:', error);
      return [];
    }
    
    console.log(`✅ [AGGREGATION] Found ${periods?.length || 0} periods for Q${quarter} ${targetYear}`);
    return periods || [];
  } catch (e) {
    console.error('❌ [AGGREGATION] getQuarterPeriods failed:', e);
    return [];
  }
}

// Helper to get semester periods
async function getSemesterPeriods(
  client: any,
  companyId: string,
  semester: number,
  year?: number
): Promise<any[]> {
  try {
    const targetYear = year || new Date().getFullYear();
    const startMonth = semester === 1 ? 1 : 7;
    const endMonth = semester === 1 ? 6 : 12;
    
    const { data: periods, error } = await client
      .from('payroll_periods_real')
      .select('id, periodo, fecha_inicio, fecha_fin, total_devengado, total_deducciones, total_neto')
      .eq('company_id', companyId)
      .eq('estado', 'cerrado')
      .gte('fecha_inicio', `${targetYear}-${String(startMonth).padStart(2, '0')}-01`)
      .lte('fecha_fin', `${targetYear}-${String(endMonth).padStart(2, '0')}-31`)
      .order('fecha_inicio', { ascending: true });
    
    if (error) {
      console.error('❌ [AGGREGATION] Error fetching semester periods:', error);
      return [];
    }
    
    console.log(`✅ [AGGREGATION] Found ${periods?.length || 0} periods for Semester ${semester} ${targetYear}`);
    return periods || [];
  } catch (e) {
    console.error('❌ [AGGREGATION] getSemesterPeriods failed:', e);
    return [];
  }
}

// Helper to get month range periods
async function getMonthRangePeriods(
  client: any,
  companyId: string,
  monthStart: string,
  monthEnd: string,
  year?: number
): Promise<any[]> {
  try {
    const targetYear = year || new Date().getFullYear();
    const monthNames = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 
                       'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    
    const startMonthIndex = monthNames.indexOf(monthStart.toLowerCase()) + 1;
    const endMonthIndex = monthNames.indexOf(monthEnd.toLowerCase()) + 1;
    
    if (startMonthIndex === 0 || endMonthIndex === 0) {
      console.error('❌ [AGGREGATION] Invalid month names:', monthStart, monthEnd);
      return [];
    }
    
    const { data: periods, error } = await client
      .from('payroll_periods_real')
      .select('id, periodo, fecha_inicio, fecha_fin, total_devengado, total_deducciones, total_neto')
      .eq('company_id', companyId)
      .eq('estado', 'cerrado')
      .gte('fecha_inicio', `${targetYear}-${String(startMonthIndex).padStart(2, '0')}-01`)
      .lte('fecha_fin', `${targetYear}-${String(endMonthIndex).padStart(2, '0')}-31`)
      .order('fecha_inicio', { ascending: true });
    
    if (error) {
      console.error('❌ [AGGREGATION] Error fetching month range periods:', error);
      return [];
    }
    
    console.log(`✅ [AGGREGATION] Found ${periods?.length || 0} periods from ${monthStart} to ${monthEnd} ${targetYear}`);
    return periods || [];
  } catch (e) {
    console.error('❌ [AGGREGATION] getMonthRangePeriods failed:', e);
    return [];
  }
}

// ============================================================================
// 1. TOTAL PAYROLL COST
// ============================================================================
export async function getTotalPayrollCost(
  client: any,
  params: { month?: string; year?: number; periodId?: string }
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
    
    // 🆕 INFER YEAR IF ONLY MONTH PROVIDED
    let targetYear = params.year;
    
    if (params.month && !params.year && !params.periodId) {
      // User asked for a month without year - find most recent period with that month
      const recentPeriod = await getPeriodId(client, companyId, { month: params.month });
      if (recentPeriod) {
        // Extract year from period name (e.g., "16 - 31 Enero 2025" -> 2025)
        const yearMatch = recentPeriod.periodo.match(/(\d{4})/);
        targetYear = yearMatch ? parseInt(yearMatch[1]) : null;
      }
    }
    
    // 🆕 DETECT FULL MONTH QUERY
    const isFullMonthQuery = params.month && targetYear && !params.periodId;
    
    if (isFullMonthQuery) {
      // Get ALL periods for the month
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
      
      // Sum totals from ALL periods of the month
      let totalDevengado = 0;
      let totalDeducciones = 0;
      let totalNeto = 0;
      const employeeSet = new Set<string>();
      
      for (const period of periods) {
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
      
      const employerContributions = totalDevengado * 0.25;
      const totalCost = totalDevengado + employerContributions;
      const periodNames = periods.map(p => p.periodo).join(', ');
      const monthCapitalized = params.month.charAt(0).toUpperCase() + params.month.slice(1);
      
      return {
        message: `📊 **Costo Total de Nómina - ${monthCapitalized} ${targetYear} (Mes Completo)**\n\n` +
          `📅 **${periods.length} período${periods.length > 1 ? 's' : ''} sumado${periods.length > 1 ? 's' : ''}**: ${periodNames}\n` +
          `👥 **${employeeSet.size}** empleados\n` +
          `💰 **Devengado Total**: ${formatCurrency(totalDevengado)}\n` +
          `📉 **Deducciones Totales**: ${formatCurrency(totalDeducciones)}\n` +
          `💵 **Neto Pagado Total**: ${formatCurrency(totalNeto)}\n` +
          `🏢 **Aportes Patronales**: ${formatCurrency(employerContributions)}\n\n` +
          `🎯 **COSTO TOTAL DEL MES**: ${formatCurrency(totalCost)}`,
        emotionalState: 'professional',
        data: {
          period: `${monthCapitalized} ${targetYear}`,
          periodsCount: periods.length,
          periodNames: periods.map(p => p.periodo),
          employeeCount: employeeSet.size,
          totalDevengado,
          totalDeducciones,
          totalNeto,
          employerContributions,
          totalCost
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
    
    // Query payrolls for the period
    const { data: payrolls, error } = await client
      .from('payrolls')
      .select('total_devengado, total_deducciones, neto_pagado, employee_id')
      .eq('company_id', companyId)
      .eq('period_id', periodId);
    
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
    
    // Calculate totals
    const totalDevengado = payrolls.reduce((sum, p) => sum + (p.total_devengado || 0), 0);
    const totalDeducciones = payrolls.reduce((sum, p) => sum + (p.total_deducciones || 0), 0);
    const totalNeto = payrolls.reduce((sum, p) => sum + (p.neto_pagado || 0), 0);
    const employeeCount = payrolls.length;
    
    // Calculate employer contributions (approximate: 25% of devengado)
    const employerContributions = totalDevengado * 0.25;
    const totalCost = totalDevengado + employerContributions;
    
    return {
      message: `📊 **Costo Total de Nómina - ${periodName}**\n\n` +
        `👥 **${employeeCount}** empleados\n` +
        `💰 **Devengado**: ${formatCurrency(totalDevengado)}\n` +
        `📉 **Deducciones**: ${formatCurrency(totalDeducciones)}\n` +
        `💵 **Neto Pagado**: ${formatCurrency(totalNeto)}\n` +
        `🏢 **Aportes Patronales**: ${formatCurrency(employerContributions)}\n\n` +
        `🎯 **COSTO TOTAL**: ${formatCurrency(totalCost)}`,
      emotionalState: 'professional',
      data: {
        period: periodName,
        employeeCount,
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
          subtitle: periodName,
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
// 2. SECURITY CONTRIBUTIONS
// ============================================================================
export async function getSecurityContributions(
  client: any,
  params: { month?: string; year?: number; periodId?: string; monthCount?: number; quarter?: number; semester?: number; monthStart?: string; monthEnd?: string }
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
    
    const targetYear = params.year || new Date().getFullYear();
    let periods: any[] | null = null;
    let periodDescription = '';
    
    // 🆕 DETECT FULL YEAR QUERY
    if (params.year && !params.month && !params.periodId && !params.monthCount && !params.quarter && !params.semester) {
      console.log(`📅 [AGGREGATION] Full year query detected for: ${params.year}`);
      periods = await getPeriodsByYear(client, companyId, params.year);
      periodDescription = `Año ${params.year}`;
    }
    // 🆕 DETECT LAST N MONTHS QUERY
    else if (params.monthCount) {
      console.log(`📅 [AGGREGATION] Last ${params.monthCount} months query detected`);
      periods = await getLastNMonthsPeriods(client, companyId, params.monthCount);
      periodDescription = `Últimos ${params.monthCount} meses`;
    }
    // 🆕 DETECT QUARTER QUERY
    else if (params.quarter) {
      console.log(`📅 [AGGREGATION] Quarter ${params.quarter} query detected`);
      periods = await getQuarterPeriods(client, companyId, params.quarter, params.year);
      periodDescription = `Trimestre ${params.quarter} ${params.year || new Date().getFullYear()}`;
    }
    // 🆕 DETECT SEMESTER QUERY
    else if (params.semester) {
      console.log(`📅 [AGGREGATION] Semester ${params.semester} query detected`);
      periods = await getSemesterPeriods(client, companyId, params.semester, params.year);
      periodDescription = `Semestre ${params.semester} ${params.year || new Date().getFullYear()}`;
    }
    // 🆕 DETECT MONTH RANGE QUERY
    else if (params.monthStart && params.monthEnd) {
      console.log(`📅 [AGGREGATION] Month range query detected: ${params.monthStart} to ${params.monthEnd}`);
      periods = await getMonthRangePeriods(client, companyId, params.monthStart, params.monthEnd, params.year);
      periodDescription = `${params.monthStart.charAt(0).toUpperCase() + params.monthStart.slice(1)} a ${params.monthEnd} ${params.year || new Date().getFullYear()}`;
    }
    // DETECT FULL MONTH QUERY
    else if (params.month) {
      let yearForMonth = params.year;
      if (!yearForMonth && !params.periodId) {
        const recentPeriod = await getPeriodId(client, companyId, { month: params.month });
        if (recentPeriod) {
          const yearMatch = recentPeriod.periodo.match(/(\d{4})/);
          yearForMonth = yearMatch ? parseInt(yearMatch[1]) : null;
        }
      }
      
      if (yearForMonth) {
        periods = await getPeriodsByMonth(client, companyId, {
          month: params.month!,
          year: yearForMonth!
        });
        periodDescription = `${params.month.charAt(0).toUpperCase() + params.month.slice(1)} ${yearForMonth}`;
      }
    }
    
    // If we have multiple periods, aggregate them
    if (periods && periods.length > 0) {
      let totalDevengado = 0;
      
      for (const period of periods) {
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
          message: `❌ No encontré datos de nómina para ${periodDescription}`,
          emotionalState: 'concerned'
        };
      }
      
      // Calculate contributions
      const epsEmployee = totalDevengado * 0.04;
      const epsEmployer = totalDevengado * 0.085;
      const epsTotal = epsEmployee + epsEmployer;
      
      const pensionEmployee = totalDevengado * 0.04;
      const pensionEmployer = totalDevengado * 0.12;
      const pensionTotal = pensionEmployee + pensionEmployer;
      
      const arl = totalDevengado * 0.00522;
      const totalContributions = epsTotal + pensionTotal + arl;
      
      return {
        message: `🏥 **Aportes a Seguridad Social - ${periodDescription}**\n\n` +
          `📅 **${periods.length} período${periods.length > 1 ? 's' : ''} procesado${periods.length > 1 ? 's' : ''}**\n\n` +
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
          period: periodDescription,
          periodsCount: periods.length,
          eps: { employee: epsEmployee, employer: epsEmployer, total: epsTotal },
          pension: { employee: pensionEmployee, employer: pensionEmployer, total: pensionTotal },
          arl,
          totalContributions
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
    
    // Query payrolls for the period
    const { data: payrolls, error } = await client
      .from('payrolls')
      .select('salario_base, total_devengado')
      .eq('company_id', companyId)
      .eq('period_id', periodId);
    
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
    
    // Calculate security contributions
    // EPS: 12.5% total (8.5% empleador, 4% empleado)
    // Pensión: 16% total (12% empleador, 4% empleado)
    // ARL: ~0.522% empleador (promedio)
    
    const totalDevengado = payrolls.reduce((sum, p) => sum + (p.total_devengado || 0), 0);
    
    const epsEmployee = totalDevengado * 0.04;
    const epsEmployer = totalDevengado * 0.085;
    const epsTotal = epsEmployee + epsEmployer;
    
    const pensionEmployee = totalDevengado * 0.04;
    const pensionEmployer = totalDevengado * 0.12;
    const pensionTotal = pensionEmployee + pensionEmployer;
    
    const arl = totalDevengado * 0.00522;
    
    const totalContributions = epsTotal + pensionTotal + arl;
    
    return {
      message: `🏥 **Aportes a Seguridad Social - ${periodName}**\n\n` +
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
        period: periodName,
        eps: { employee: epsEmployee, employer: epsEmployer, total: epsTotal },
        pension: { employee: pensionEmployee, employer: pensionEmployer, total: pensionTotal },
        arl,
        totalContributions
      },
      visualization: {
        type: 'chart',
        data: {
          title: 'Aportes a Seguridad Social',
          subtitle: periodName,
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
// 4. TOTAL INCAPACITY DAYS
// ============================================================================
export async function getTotalIncapacityDays(
  client: any,
  params: { month?: string; year?: number; periodId?: string }
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
            subtipo,
            empleado_id
          `)
          .eq('company_id', companyId)
          .eq('periodo_id', period.id)
          .eq('tipo_novedad', 'incapacidad');
        
        if (novedades) {
          allNovedades.push(...novedades);
        }
      }
      
      if (allNovedades.length === 0) {
        const monthCapitalized = params.month.charAt(0).toUpperCase() + params.month.slice(1);
        return {
          message: `✅ No hubo incapacidades registradas en ${monthCapitalized} ${params.year}.`,
          emotionalState: 'celebrating'
        };
      }
      
      const totalDays = allNovedades.reduce((sum, n) => sum + (n.dias || 0), 0);
      const totalCost = allNovedades.reduce((sum, n) => sum + Math.abs(n.valor || 0), 0);
      const employeeCount = new Set(allNovedades.map(n => n.empleado_id)).size;
      
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
      
      const periodNames = periods.map(p => p.periodo).join(', ');
      const monthCapitalized = params.month.charAt(0).toUpperCase() + params.month.slice(1);
      
      return {
        message: `🏥 **Total de Incapacidades - ${monthCapitalized} ${targetYear} (Mes Completo)**\n\n` +
          `📅 **${periods.length} período${periods.length > 1 ? 's' : ''} sumado${periods.length > 1 ? 's' : ''}**: ${periodNames}\n` +
          `📊 **${allNovedades.length}** incapacidades registradas\n` +
          `👥 **${employeeCount}** empleados afectados\n` +
          `📅 **${totalDays}** días totales\n` +
          `💰 Costo estimado: ${formatCurrency(totalCost)}\n\n` +
          `**Por tipo:**\n${subtypeBreakdown}`,
        emotionalState: 'professional',
        data: {
          period: `${monthCapitalized} ${targetYear}`,
          periodsCount: periods.length,
          totalIncapacities: allNovedades.length,
          totalDays,
          totalCost,
          affectedEmployees: employeeCount,
          bySubtype
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
    
    // Query novedades for incapacidades
    const { data: novedades, error } = await client
      .from('payroll_novedades')
      .select(`
        dias,
        valor,
        subtipo,
        empleado_id,
        employees!inner(nombre, apellido)
      `)
      .eq('company_id', companyId)
      .eq('periodo_id', periodId)
      .eq('tipo_novedad', 'incapacidad');
    
    if (error) {
      console.error('❌ [AGGREGATION] Error querying novedades:', error);
      return {
        message: '❌ Hubo un error al consultar las novedades.',
        emotionalState: 'concerned'
      };
    }
    
    if (!novedades || novedades.length === 0) {
      return {
        message: `✅ No hubo incapacidades registradas en el período ${periodName}.`,
        emotionalState: 'celebrating'
      };
    }
    
    const totalDays = novedades.reduce((sum, n) => sum + (n.dias || 0), 0);
    const totalCost = novedades.reduce((sum, n) => sum + Math.abs(n.valor || 0), 0);
    const employeeCount = new Set(novedades.map(n => n.empleado_id)).size;
    
    // Group by subtype
    const bySubtype: Record<string, { count: number; days: number }> = {};
    novedades.forEach(n => {
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
      message: `🏥 **Total de Incapacidades - ${periodName}**\n\n` +
        `📊 **${novedades.length}** incapacidades registradas\n` +
        `👥 **${employeeCount}** empleados afectados\n` +
        `📅 **${totalDays}** días totales\n` +
        `💰 Costo estimado: ${formatCurrency(totalCost)}\n\n` +
        `**Por tipo:**\n${subtypeBreakdown}`,
      emotionalState: 'professional',
      data: {
        period: periodName,
        totalIncapacities: novedades.length,
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
          subtitle: periodName,
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
      message: `❌ Error al consultar incapacidades: ${e.message}`,
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
