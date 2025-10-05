/**
 * Aggregation Service Public API
 * Provides backward-compatible interface while using new architecture
 */

import { AggregationServiceFactory } from './AggregationServiceFactory.ts';
import { TemporalParams } from '../../core/temporal/types.ts';
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

// Export types and constants for external use
export { AggregationType } from './AggregationServiceFactory.ts';
export { NOVEDAD_TYPES, NOVEDAD_GROUPS } from './constants/NovedadTypes.ts';
export { CONTRIBUTION_RATES, LEGAL_VALUES } from './constants/ContributionRates.ts';
