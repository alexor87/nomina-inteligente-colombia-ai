/**
 * Base Aggregation Service
 * Provides common functionality for all aggregation services
 */

import { TemporalParams } from '../../../core/temporal/types.ts';
import { PeriodQueryBuilder } from '../../../core/temporal/PeriodQueryBuilder.ts';
import { TemporalResolver } from '../../../core/temporal/TemporalResolver.ts';

export interface AggregationResult {
  message: string;
  emotionalState: 'professional' | 'positive' | 'concerned' | 'neutral';
  data?: any;
  visualization?: any;
}

export interface PeriodData {
  id: string;
  periodo: string;
}

export abstract class BaseAggregationService {
  /**
   * Get current user's company ID
   */
  protected async getCurrentCompanyId(client: any): Promise<string | null> {
    try {
      const { data: { user } } = await client.auth.getUser();
      if (!user) return null;

      const { data: profile } = await client
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      return profile?.company_id || null;
    } catch (error) {
      console.error('❌ Error getting company ID:', error);
      return null;
    }
  }

  /**
   * Resolve periods based on temporal parameters
   * Returns null if no periods found
   */
  protected async resolvePeriods(
    client: any,
    companyId: string,
    params: TemporalParams
  ): Promise<{ periods: PeriodData[]; displayName: string } | null> {
    try {
      // Check if params specify a single period
      if (params.periodId) {
        const period = await PeriodQueryBuilder.getMostRecentMatchingPeriod(client, companyId, params);
        if (!period) return null;
        
        return {
          periods: [period],
          displayName: period.periodo,
        };
      }

      // Use PeriodQueryBuilder for multi-period resolution
      const resolved = await PeriodQueryBuilder.resolvePeriods(client, companyId, params);
      
      if (!resolved || resolved.periods.length === 0) {
        return null;
      }

      return {
        periods: resolved.periods,
        displayName: resolved.displayName,
      };
    } catch (error) {
      console.error('❌ Error resolving periods:', error);
      return null;
    }
  }

  /**
   * Format currency as Colombian Pesos
   */
  protected formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }

  /**
   * Create error response
   */
  protected createErrorResponse(message: string): AggregationResult {
    return {
      message: `❌ ${message}`,
      emotionalState: 'concerned',
    };
  }

  /**
   * Create not found response
   */
  protected createNotFoundResponse(displayName: string): AggregationResult {
    return {
      message: `No encontré datos para ${displayName}.`,
      emotionalState: 'neutral',
    };
  }

  /**
   * Abstract method - must be implemented by subclasses
   */
  abstract aggregate(
    client: any,
    params: TemporalParams
  ): Promise<AggregationResult>;
}
