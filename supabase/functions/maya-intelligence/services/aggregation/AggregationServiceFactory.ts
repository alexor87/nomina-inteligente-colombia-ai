/**
 * Aggregation Service Factory
 * Creates appropriate aggregation service instances
 */

import { OvertimeService } from './services/OvertimeService.ts';
import { IncapacityService } from './services/IncapacityService.ts';
import { IncapacityReportService } from './services/IncapacityReportService.ts';
import { PayrollCostService } from './services/PayrollCostService.ts';
import { SecurityContributionsService } from './services/SecurityContributionsService.ts';
import { ContributionReportService } from './services/ContributionReportService.ts';
import { EmployeeCostService } from './services/EmployeeCostService.ts';
import { HighestPayrollPeriodService } from './services/HighestPayrollPeriodService.ts';
import { LowestPayrollPeriodService } from './services/LowestPayrollPeriodService.ts';
import { PayrollProjectionService } from './services/PayrollProjectionService.ts';
import { HiringCostSimulationService } from './services/HiringCostSimulationService.ts';
import { SalaryIncreaseSimulationService } from './services/SalaryIncreaseSimulationService.ts';
import { BonusImpactSimulationService } from './services/BonusImpactSimulationService.ts';
import { BaseAggregationService } from './base/BaseAggregationService.ts';

export type AggregationType = 
  | 'overtime'
  | 'incapacity'
  | 'incapacity_report'
  | 'payroll_cost'
  | 'security_contributions'
  | 'contribution_report'
  | 'highest_cost_employees'
  | 'lowest_cost_employees'
  | 'highest_payroll_period'
  | 'lowest_payroll_period'
  | 'payroll_projection'
  | 'hiring_cost_simulation'
  | 'salary_increase_simulation'
  | 'bonus_impact_simulation';

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
      
      case 'incapacity_report':
        return new IncapacityReportService();
      
      case 'payroll_cost':
        return new PayrollCostService();
      
      case 'security_contributions':
        return new SecurityContributionsService();
      
      case 'contribution_report':
        return new ContributionReportService();
      
      case 'highest_cost_employees':
      case 'lowest_cost_employees':
        return new EmployeeCostService();
      
      case 'highest_payroll_period':
        return new HighestPayrollPeriodService();
      
      case 'lowest_payroll_period':
        return new LowestPayrollPeriodService();
      
      case 'payroll_projection':
        return new PayrollProjectionService();
      
      case 'hiring_cost_simulation':
        return new HiringCostSimulationService();
      
      case 'salary_increase_simulation':
        return new SalaryIncreaseSimulationService();
      
      case 'bonus_impact_simulation':
        return new BonusImpactSimulationService();
      
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
