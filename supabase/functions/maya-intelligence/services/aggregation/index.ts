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
 * Compare payroll periods (flexible comparison)
 * Supports comparisons between any two periods: months, quarters, semesters, years
 */
export async function comparePayrollPeriods(
  client: any,
  params: { period1: TemporalParams; period2: TemporalParams }
) {
  try {
    const { PeriodQueryBuilder } = await import('../core/period-query-builder.ts');
    
    // Get company ID from context
    const { data: profile } = await client
      .from('profiles')
      .select('company_id')
      .single();
    
    if (!profile?.company_id) {
      throw new Error('No se pudo determinar la empresa');
    }
    
    console.log('📊 [COMPARISON] Resolving periods:', {
      period1: params.period1,
      period2: params.period2
    });
    
    // Resolve both periods using PeriodQueryBuilder
    const resolved1 = await PeriodQueryBuilder.resolvePeriods(
      client,
      profile.company_id,
      params.period1
    );
    
    const resolved2 = await PeriodQueryBuilder.resolvePeriods(
      client,
      profile.company_id,
      params.period2
    );
    
    if (!resolved1 || !resolved2) {
      throw new Error('No se pudieron resolver los períodos solicitados');
    }
    
    console.log('✅ [COMPARISON] Periods resolved:', {
      period1: resolved1.displayName,
      period2: resolved2.displayName
    });
    
    // Calculate totals for each period
    const total1 = resolved1.periods.reduce((sum: number, p: any) => 
      sum + (Number(p.total_neto) || 0), 0
    );
    
    const total2 = resolved2.periods.reduce((sum: number, p: any) => 
      sum + (Number(p.total_neto) || 0), 0
    );
    
    // Calculate difference and percentage
    const difference = total1 - total2;
    const percentageChange = total2 > 0 ? ((difference / total2) * 100) : 0;
    const trend = difference > 0 ? 'increase' : difference < 0 ? 'decrease' : 'stable';
    
    return {
      period1: {
        name: resolved1.displayName,
        total: total1,
        periodsCount: resolved1.periods.length
      },
      period2: {
        name: resolved2.displayName,
        total: total2,
        periodsCount: resolved2.periods.length
      },
      comparison: {
        difference,
        percentageChange,
        trend
      }
    };
  } catch (error) {
    console.error('[AGGREGATION] Error comparing payroll periods:', error);
    throw error;
  }
}

/**
 * @deprecated Use comparePayrollPeriods instead
 * Legacy function for backward compatibility
 */
export async function getPayrollMonthlyVariation(
  client: any,
  params: TemporalParams
) {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const lastMonth = currentMonth === 1 ? 12 : currentMonth - 1;
  const lastYear = currentMonth === 1 ? currentYear - 1 : currentYear;
  
  const getMonthName = (m: number) => {
    const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
                    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    return months[m - 1];
  };
  
  return comparePayrollPeriods(client, {
    period1: {
      type: TemporalType.SPECIFIC_MONTH,
      month: getMonthName(currentMonth),
      year: currentYear
    },
    period2: {
      type: TemporalType.SPECIFIC_MONTH,
      month: getMonthName(lastMonth),
      year: lastYear
    }
  });
}

// Export types and constants for external use

export { NOVEDAD_TYPES, NOVEDAD_GROUPS } from './constants/NovedadTypes.ts';
export { CONTRIBUTION_RATES, LEGAL_VALUES } from './constants/ContributionRates.ts';
