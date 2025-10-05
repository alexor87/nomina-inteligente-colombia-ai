/**
 * Total Payroll Cost Service
 * Calculates total payroll cost including employer contributions
 */

import { BaseAggregationService, AggregationResult } from '../base/BaseAggregationService.ts';
import { TemporalParams } from '../../../core/temporal-types.ts';
import { CONTRIBUTION_RATES } from '../constants/ContributionRates.ts';

export class PayrollCostService extends BaseAggregationService {
  async aggregate(client: any, params: TemporalParams): Promise<AggregationResult> {
    try {
      const companyId = await this.getCurrentCompanyId(client);
      if (!companyId) {
        return this.createErrorResponse('No se pudo determinar la empresa del usuario');
      }

      const resolved = await this.resolvePeriods(client, companyId, params);
      if (!resolved) {
        return this.createNotFoundResponse(
          params.month || params.year 
            ? `${params.month || ''} ${params.year || ''}`
            : 'el período solicitado'
        );
      }

      console.log(`✅ [PAYROLL_COST] Found ${resolved.periods.length} periods for ${resolved.displayName}`);

      let totalGrossPay = 0;
      let totalDeductions = 0;
      let totalNetPay = 0;
      let totalEmployees = 0;

      for (const period of resolved.periods) {
        const { data: payrolls, error } = await client
          .from('payrolls')
          .select('total_devengado, total_deducciones, neto_pagado')
          .eq('company_id', companyId)
          .eq('period_id', period.id);

        if (error) {
          console.error('❌ [PAYROLL_COST] Error querying payrolls:', error);
          return this.createErrorResponse('Error al consultar la nómina');
        }

        if (payrolls) {
          totalGrossPay += payrolls.reduce((sum, p) => sum + (p.total_devengado || 0), 0);
          totalDeductions += payrolls.reduce((sum, p) => sum + (p.total_deducciones || 0), 0);
          totalNetPay += payrolls.reduce((sum, p) => sum + (p.neto_pagado || 0), 0);
          totalEmployees = Math.max(totalEmployees, payrolls.length);
        }
      }

      if (totalGrossPay === 0) {
        return {
          message: `No encontré datos de nómina para ${resolved.displayName}.`,
          emotionalState: 'neutral',
        };
      }

      // Estimate employer contributions (simplified)
      const estimatedContributions = totalGrossPay * 0.52; // ~52% employer burden
      const totalCost = totalGrossPay + estimatedContributions;

      const message = `💼 **Costo Total de Nómina - ${resolved.displayName}**\n\n` +
        (resolved.periods.length > 1 
          ? `📅 **${resolved.periods.length} períodos sumados**\n`
          : '') +
        `👥 **${totalEmployees}** empleados\n` +
        `💰 **Total devengado**: ${this.formatCurrency(totalGrossPay)}\n` +
        `📉 **Total deducciones**: ${this.formatCurrency(totalDeductions)}\n` +
        `💵 **Neto pagado**: ${this.formatCurrency(totalNetPay)}\n` +
        `🏢 **Aportes patronales (est.)**: ${this.formatCurrency(estimatedContributions)}\n\n` +
        `📊 **COSTO TOTAL**: ${this.formatCurrency(totalCost)}`;

      return {
        message,
        emotionalState: 'professional',
        data: {
          period: resolved.displayName,
          periodsCount: resolved.periods.length,
          totalEmployees,
          totalGrossPay,
          totalDeductions,
          totalNetPay,
          estimatedContributions,
          totalCost,
        },
        visualization: {
          type: 'metric',
          data: {
            title: 'Costo Total Nómina',
            value: totalCost,
            subtitle: resolved.displayName,
          },
        },
      };
    } catch (error) {
      console.error('❌ [PAYROLL_COST] aggregate failed:', error);
      return this.createErrorResponse(`Error al calcular costo de nómina: ${error.message}`);
    }
  }
}
