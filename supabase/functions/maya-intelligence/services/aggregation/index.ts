/**
 * Aggregation Service Public API
 * Provides backward-compatible interface while using new architecture
 */

import { AggregationServiceFactory } from './AggregationServiceFactory.ts';
import { TemporalParams } from '../../core/temporal-types.ts';
import { EmployeeCostService } from './services/EmployeeCostService.ts';

/**
 * Get total overtime hours for a period
 * ✅ FIXED: Now uses correct enum values via OvertimeService
 */
export async function getTotalOvertimeHours(
  client: any,
  params: TemporalParams
) {
  const service = AggregationServiceFactory.getService('overtime');
  return await service.aggregate(client, params);
}

/**
 * Get total incapacity days for a period
 */
export async function getTotalIncapacityDays(
  client: any,
  params: TemporalParams
) {
  const service = AggregationServiceFactory.getService('incapacity');
  return await service.aggregate(client, params);
}

/**
 * Get total payroll cost including employer contributions
 */
export async function getTotalPayrollCost(
  client: any,
  params: TemporalParams
) {
  const service = AggregationServiceFactory.getService('payroll_cost');
  return await service.aggregate(client, params);
}

/**
 * Get security contributions (EPS, Pension, ARL)
 */
export async function getSecurityContributions(
  client: any,
  params: TemporalParams
) {
  const service = AggregationServiceFactory.getService('security_contributions');
  return await service.aggregate(client, params);
}

/**
 * Get highest cost employees
 */
export async function getHighestCostEmployees(
  client: any,
  params: TemporalParams & { limit?: number }
) {
  const service = AggregationServiceFactory.getService('highest_cost_employees') as EmployeeCostService;
  return await service.aggregateHighest(client, params);
}

/**
 * Get lowest cost employees
 */
export async function getLowestCostEmployees(
  client: any,
  params: TemporalParams & { limit?: number }
) {
  const service = AggregationServiceFactory.getService('lowest_cost_employees') as EmployeeCostService;
  return await service.aggregateLowest(client, params);
}

/**
 * Get payroll monthly variation
 * Calculates the difference between current and previous month
 */
export async function getPayrollMonthlyVariation(
  client: any,
  params: TemporalParams
) {
  try {
    const now = new Date();
    const currentMonth = now.getMonth(); // 0-11
    const currentYear = now.getFullYear();
    
    // Get current month dates
    const currentMonthStart = new Date(currentYear, currentMonth, 1);
    const currentMonthEnd = new Date(currentYear, currentMonth + 1, 0);
    
    // Get previous month dates
    const prevMonthStart = new Date(currentYear, currentMonth - 1, 1);
    const prevMonthEnd = new Date(currentYear, currentMonth, 0);
    
    // Query current month payroll
    const { data: currentData, error: currentError } = await client
      .from('payroll_periods_real')
      .select('total_neto, periodo')
      .gte('fecha_inicio', currentMonthStart.toISOString().split('T')[0])
      .lte('fecha_fin', currentMonthEnd.toISOString().split('T')[0])
      .eq('estado', 'cerrado');
    
    if (currentError) throw currentError;
    
    // Query previous month payroll
    const { data: prevData, error: prevError } = await client
      .from('payroll_periods_real')
      .select('total_neto, periodo')
      .gte('fecha_inicio', prevMonthStart.toISOString().split('T')[0])
      .lte('fecha_fin', prevMonthEnd.toISOString().split('T')[0])
      .eq('estado', 'cerrado');
    
    if (prevError) throw prevError;
    
    const currentTotal = currentData?.reduce((sum: number, p: any) => sum + (Number(p.total_neto) || 0), 0) || 0;
    const prevTotal = prevData?.reduce((sum: number, p: any) => sum + (Number(p.total_neto) || 0), 0) || 0;
    
    const difference = currentTotal - prevTotal;
    const percentageChange = prevTotal > 0 ? ((difference / prevTotal) * 100) : 0;
    
    const currentMonthName = new Intl.DateTimeFormat('es-CO', { month: 'long', year: 'numeric' }).format(currentMonthStart);
    const prevMonthName = new Intl.DateTimeFormat('es-CO', { month: 'long', year: 'numeric' }).format(prevMonthStart);
    
    return {
      currentMonth: currentMonthName,
      currentTotal,
      previousMonth: prevMonthName,
      previousTotal: prevTotal,
      difference,
      percentageChange,
      trend: difference > 0 ? 'increase' : difference < 0 ? 'decrease' : 'stable'
    };
  } catch (error) {
    console.error('[AGGREGATION] Error calculating monthly variation:', error);
    throw error;
  }
}

// Export types and constants for external use

export { NOVEDAD_TYPES, NOVEDAD_GROUPS } from './constants/NovedadTypes.ts';
export { CONTRIBUTION_RATES, LEGAL_VALUES } from './constants/ContributionRates.ts';
