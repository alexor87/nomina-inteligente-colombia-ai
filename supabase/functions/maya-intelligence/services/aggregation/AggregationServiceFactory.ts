/**
 * Aggregation Service Factory
 * Creates appropriate aggregation service instances
 */

import { OvertimeService } from './services/OvertimeService.ts';
import { IncapacityService } from './services/IncapacityService.ts';
import { PayrollCostService } from './services/PayrollCostService.ts';
import { SecurityContributionsService } from './services/SecurityContributionsService.ts';
import { EmployeeCostService } from './services/EmployeeCostService.ts';
import { HighestPayrollPeriodService } from './services/HighestPayrollPeriodService.ts';
import { BaseAggregationService } from './base/BaseAggregationService.ts';

export type AggregationType = 
  | 'overtime'
  | 'incapacity'
  | 'payroll_cost'
  | 'security_contributions'
  | 'highest_cost_employees'
  | 'lowest_cost_employees'
  | 'highest_payroll_period';

export class AggregationServiceFactory {
  private static instances = new Map<AggregationType, BaseAggregationService>();

  /**
   * Get or create service instance
   */
  static getService(type: AggregationType): BaseAggregationService {
    if (!this.instances.has(type)) {
      this.instances.set(type, this.createService(type));
    }
    return this.instances.get(type)!;
  }

  /**
   * Create new service instance
   */
  private static createService(type: AggregationType): BaseAggregationService {
    switch (type) {
      case 'overtime':
        return new OvertimeService();
      
      case 'incapacity':
        return new IncapacityService();
      
      case 'payroll_cost':
        return new PayrollCostService();
      
      case 'security_contributions':
        return new SecurityContributionsService();
      
      case 'highest_cost_employees':
      case 'lowest_cost_employees':
        return new EmployeeCostService();
      
      case 'highest_payroll_period':
        return new HighestPayrollPeriodService();
      
      default:
        throw new Error(`Unknown aggregation type: ${type}`);
    }
  }

  /**
   * Clear cached instances (useful for testing)
   */
  static clearCache(): void {
    this.instances.clear();
  }
}
