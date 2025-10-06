/**
 * Lowest Payroll Period Service
 * Finds the period with the lowest payroll cost within a temporal range
 */

import { BaseAggregationService, AggregationResult } from '../base/BaseAggregationService.ts';
import { TemporalParams, TemporalType } from '../../../core/temporal-types.ts';

export class LowestPayrollPeriodService extends BaseAggregationService {
  async aggregate(client: any, params: TemporalParams): Promise<AggregationResult> {
    try {
      const companyId = await this.getCurrentCompanyId(client);
      if (!companyId) {
        return this.createErrorResponse('No se pudo determinar la empresa del usuario');
      }

      // Resolve periods based on temporal parameters
      const periodInfo = await this.resolvePeriods(client, companyId, params);
      if (!periodInfo) {
        return this.createNotFoundResponse(this.getDisplayRange(params));
      }

      const { periods, displayName } = periodInfo;
      
      if (periods.length === 0) {
        return this.createNotFoundResponse(displayName);
      }

      console.log(`🔍 [LOWEST_PERIOD] Analyzing ${periods.length} periods in ${displayName}`);

      // Query payroll data for all periods
      const periodIds = periods.map(p => p.id);
      const { data: payrollData, error: payrollError } = await client
        .from('payrolls')
        .select('period_id, neto_pagado, employee_id')
        .in('period_id', periodIds)
        .eq('company_id', companyId);

      if (payrollError) {
        console.error('❌ [LOWEST_PERIOD] Error querying payroll:', payrollError);
        return this.createErrorResponse('Error al consultar datos de nómina');
      }

      if (!payrollData || payrollData.length === 0) {
        return {
          message: `No encontré datos de nómina procesados para ${displayName}.`,
          emotionalState: 'neutral',
          data: {
            searchRange: displayName,
            totalPeriods: periods.length,
            periodsWithData: 0
          }
        };
      }

      // Calculate totals per period
      const periodTotals = new Map<string, number>();
      const periodEmployeeCounts = new Map<string, Set<string>>();

      for (const record of payrollData) {
        const currentTotal = periodTotals.get(record.period_id) || 0;
        periodTotals.set(record.period_id, currentTotal + (Number(record.neto_pagado) || 0));
        
        if (!periodEmployeeCounts.has(record.period_id)) {
          periodEmployeeCounts.set(record.period_id, new Set());
        }
        periodEmployeeCounts.get(record.period_id)!.add(record.employee_id);
      }

      // Find the period with the lowest total (excluding $0)
      let lowestPeriodId: string | null = null;
      let lowestTotal = Infinity;
      let lowestPeriodName = '';
      let lowestPeriodData: any = null;

      for (const period of periods) {
        const total = periodTotals.get(period.id) || 0;
        if (total > 0 && total < lowestTotal) {
          lowestTotal = total;
          lowestPeriodId = period.id;
          lowestPeriodName = period.periodo;
        }
      }

      if (!lowestPeriodId) {
        return {
          message: `No encontré períodos con datos de nómina en ${displayName}.`,
          emotionalState: 'neutral',
          data: {
            searchRange: displayName,
            totalPeriods: periods.length
          }
        };
      }

      // Get detailed period information
      const { data: periodDetails } = await client
        .from('payroll_periods_real')
        .select('*')
        .eq('id', lowestPeriodId)
        .single();

      const employeeCount = periodEmployeeCounts.get(lowestPeriodId)?.size || 0;

      // Calculate percentage of total
      const totalAllPeriods = Array.from(periodTotals.values()).reduce((sum, val) => sum + val, 0);
      const percentageOfTotal = totalAllPeriods > 0 
        ? ((lowestTotal / totalAllPeriods) * 100).toFixed(1)
        : '0.0';

      // Build all period totals array (sorted ascending)
      const allPeriodTotals = periods
        .map(p => ({
          periodId: p.id,
          periodName: p.periodo,
          total: periodTotals.get(p.id) || 0,
          employeeCount: periodEmployeeCounts.get(p.id)?.size || 0
        }))
        .filter(p => p.total > 0)
        .sort((a, b) => a.total - b.total);

      console.log(`✅ [LOWEST_PERIOD] Found: ${lowestPeriodName} - ${this.formatCurrency(lowestTotal)}`);

      return {
        message: `El período con menor nómina en ${displayName} fue **${lowestPeriodName}** con un total de **${this.formatCurrency(lowestTotal)}** (${percentageOfTotal}% del total). Este período tuvo ${employeeCount} empleado${employeeCount !== 1 ? 's' : ''} en nómina.`,
        emotionalState: 'informative',
        data: {
          lowestPeriod: {
            id: lowestPeriodId,
            name: lowestPeriodName,
            total: lowestTotal,
            employeeCount: employeeCount,
            startDate: periodDetails?.fecha_inicio,
            endDate: periodDetails?.fecha_fin
          },
          context: {
            searchRange: displayName,
            totalPeriods: periods.length,
            periodsWithData: allPeriodTotals.length,
            percentageOfTotal: parseFloat(percentageOfTotal),
            totalAllPeriods: totalAllPeriods
          },
          allPeriodTotals: allPeriodTotals
        }
      };

    } catch (error) {
      console.error('❌ [LOWEST_PERIOD] Error:', error);
      return this.createErrorResponse('Error al buscar el período con menor nómina');
    }
  }

  private getDisplayRange(params: TemporalParams): string {
    switch (params.type) {
      case 'full_year':
        return `Año ${params.year}`;
      case 'month':
        return `${params.monthName} ${params.year}`;
      case 'quarter':
        return `Trimestre ${params.quarter} de ${params.year}`;
      case 'semester':
        return `Semestre ${params.semester} de ${params.year}`;
      default:
        return 'el período solicitado';
    }
  }

  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }
}
