/**
 * Highest Payroll Period Service
 * Finds the period with the highest payroll cost within a temporal range
 */

import { BaseAggregationService, AggregationResult } from '../base/BaseAggregationService.ts';
import { TemporalParams, TemporalType } from '../../../core/temporal-types.ts';

export class HighestPayrollPeriodService extends BaseAggregationService {
  async aggregate(client: any, params: TemporalParams): Promise<AggregationResult> {
    try {
      const { PeriodQueryBuilder } = await import('../../../core/period-query-builder.ts');
      
      // Get company context
      const { data: profile } = await client
        .from('profiles')
        .select('company_id')
        .single();
      
      if (!profile?.company_id) {
        throw new Error('No se pudo determinar la empresa');
      }
      
      // Resolve periods for the requested range
      const resolved = await PeriodQueryBuilder.resolvePeriods(
        client,
        profile.company_id,
        params
      );
      
      if (!resolved || resolved.periods.length === 0) {
        const displayRange = this.getDisplayRange(params);
        return {
          message: `No encontré períodos cerrados para ${displayRange}.`,
          data: null
        };
      }
      
      console.log(`🔍 [HIGHEST_PERIOD] Analyzing ${resolved.periods.length} periods in ${resolved.displayName}`);
      
      // Query to find the period with highest payroll
      const periodIds = resolved.periods.map(p => p.id);
      
      const { data: payrollData, error } = await client
        .from('payrolls')
        .select('period_id, neto_pagado')
        .in('period_id', periodIds)
        .eq('company_id', profile.company_id);
      
      if (error) throw error;
      
      if (!payrollData || payrollData.length === 0) {
        return {
          message: `No hay datos de nómina procesados para ${resolved.displayName}.`,
          data: null
        };
      }
      
      // Group by period and calculate totals
      const periodTotals = new Map<string, number>();
      const periodEmployeeCount = new Map<string, number>();
      
      for (const row of payrollData) {
        const currentTotal = periodTotals.get(row.period_id) || 0;
        const currentCount = periodEmployeeCount.get(row.period_id) || 0;
        periodTotals.set(row.period_id, currentTotal + (row.neto_pagado || 0));
        periodEmployeeCount.set(row.period_id, currentCount + 1);
      }
      
      // Find the highest period
      let highestPeriodId: string | null = null;
      let highestTotal = 0;
      
      for (const [periodId, total] of periodTotals.entries()) {
        if (total > highestTotal) {
          highestTotal = total;
          highestPeriodId = periodId;
        }
      }
      
      if (!highestPeriodId) {
        return {
          message: `No pude calcular el período con mayor nómina para ${resolved.displayName}.`,
          data: null
        };
      }
      
      // Get period details
      const highestPeriod = resolved.periods.find(p => p.id === highestPeriodId);
      if (!highestPeriod) {
        throw new Error('Period not found in resolved periods');
      }
      
      // Calculate percentage of total
      const totalAllPeriods = Array.from(periodTotals.values()).reduce((sum, val) => sum + val, 0);
      const percentageOfTotal = totalAllPeriods > 0 ? (highestTotal / totalAllPeriods) * 100 : 0;
      
      const employeeCount = periodEmployeeCount.get(highestPeriodId) || 0;
      
      // Build rich message
      const message = `El período con mayor nómina en ${resolved.displayName} fue **${highestPeriod.periodo}** con un total de **$${this.formatCurrency(highestTotal)}** (${percentageOfTotal.toFixed(1)}% del total).`;
      
      console.log(`✅ [HIGHEST_PERIOD] Found: ${highestPeriod.periodo} - $${this.formatCurrency(highestTotal)}`);
      
      return {
        message,
        data: {
          highestPeriod: {
            id: highestPeriodId,
            name: highestPeriod.periodo,
            total: highestTotal,
            employeeCount,
            startDate: highestPeriod.fecha_inicio,
            endDate: highestPeriod.fecha_fin
          },
          context: {
            searchRange: resolved.displayName,
            totalPeriods: resolved.periods.length,
            percentageOfTotal: percentageOfTotal,
            totalAllPeriods: totalAllPeriods
          },
          allPeriodTotals: Array.from(periodTotals.entries()).map(([id, total]) => {
            const period = resolved.periods.find(p => p.id === id);
            return {
              periodId: id,
              periodName: period?.periodo || 'Desconocido',
              total: total
            };
          }).sort((a, b) => b.total - a.total)
        }
      };
      
    } catch (error) {
      console.error('[HIGHEST_PERIOD] Error:', error);
      throw error;
    }
  }
  
  private getDisplayRange(params: TemporalParams): string {
    switch (params.type) {
      case TemporalType.FULL_YEAR:
        return `el año ${params.year || new Date().getFullYear()}`;
      case TemporalType.SPECIFIC_MONTH:
        return `${params.month} ${params.year || ''}`.trim();
      case TemporalType.QUARTER:
        return `Q${params.quarter} ${params.year || ''}`.trim();
      case TemporalType.SEMESTER:
        return `S${params.semester} ${params.year || ''}`.trim();
      default:
        return 'el rango solicitado';
    }
  }
  
  private formatCurrency(amount: number): string {
    return amount.toLocaleString('es-CO', { 
      minimumFractionDigits: 0,
      maximumFractionDigits: 0 
    });
  }
}
