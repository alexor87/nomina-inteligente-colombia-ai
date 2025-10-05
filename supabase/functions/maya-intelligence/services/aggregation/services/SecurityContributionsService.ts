/**
 * Security Contributions Service
 * Calculates EPS, Pension, and ARL contributions
 */

import { BaseAggregationService, AggregationResult } from '../base/BaseAggregationService.ts';
import { TemporalParams } from '../../../core/temporal-types.ts';
import { CONTRIBUTION_RATES } from '../constants/ContributionRates.ts';

export class SecurityContributionsService extends BaseAggregationService {
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

      console.log(`✅ [CONTRIBUTIONS] Found ${resolved.periods.length} periods for ${resolved.displayName}`);

      let totalSalaryBase = 0;
      let employeeCount = 0;

      for (const period of resolved.periods) {
        const { data: payrolls, error } = await client
          .from('payrolls')
          .select('salario_base')
          .eq('company_id', companyId)
          .eq('period_id', period.id);

        if (error) {
          console.error('❌ [CONTRIBUTIONS] Error querying payrolls:', error);
          return this.createErrorResponse('Error al consultar la nómina');
        }

        if (payrolls) {
          totalSalaryBase += payrolls.reduce((sum, p) => sum + (p.salario_base || 0), 0);
          employeeCount = Math.max(employeeCount, payrolls.length);
        }
      }

      if (totalSalaryBase === 0) {
        return {
          message: `No encontré datos de nómina para ${resolved.displayName}.`,
          emotionalState: 'neutral',
        };
      }

      // Calculate contributions
      const healthEmployee = totalSalaryBase * CONTRIBUTION_RATES.HEALTH_EMPLOYEE;
      const healthEmployer = totalSalaryBase * CONTRIBUTION_RATES.HEALTH_EMPLOYER;
      const healthTotal = healthEmployee + healthEmployer;

      const pensionEmployee = totalSalaryBase * CONTRIBUTION_RATES.PENSION_EMPLOYEE;
      const pensionEmployer = totalSalaryBase * CONTRIBUTION_RATES.PENSION_EMPLOYER;
      const pensionTotal = pensionEmployee + pensionEmployer;

      const arlEmployer = totalSalaryBase * CONTRIBUTION_RATES.ARL_MIN;

      const totalContributions = healthTotal + pensionTotal + arlEmployer;
      const employerShare = healthEmployer + pensionEmployer + arlEmployer;
      const employeeShare = healthEmployee + pensionEmployee;

      const message = `🏥 **Aportes de Seguridad Social - ${resolved.displayName}**\n\n` +
        (resolved.periods.length > 1 
          ? `📅 **${resolved.periods.length} períodos sumados**\n`
          : '') +
        `👥 **${employeeCount}** empleados\n\n` +
        `**EPS (Salud)**\n` +
        `• Empleado (4%): ${this.formatCurrency(healthEmployee)}\n` +
        `• Empleador (8.5%): ${this.formatCurrency(healthEmployer)}\n` +
        `• **Total EPS**: ${this.formatCurrency(healthTotal)}\n\n` +
        `**Pensión**\n` +
        `• Empleado (4%): ${this.formatCurrency(pensionEmployee)}\n` +
        `• Empleador (12%): ${this.formatCurrency(pensionEmployer)}\n` +
        `• **Total Pensión**: ${this.formatCurrency(pensionTotal)}\n\n` +
        `**ARL (Mínimo)**\n` +
        `• Empleador: ${this.formatCurrency(arlEmployer)}\n\n` +
        `💰 **Total Aportes**: ${this.formatCurrency(totalContributions)}\n` +
        `🏢 Empresa: ${this.formatCurrency(employerShare)}\n` +
        `👤 Empleados: ${this.formatCurrency(employeeShare)}`;

      return {
        message,
        emotionalState: 'professional',
        data: {
          period: resolved.displayName,
          periodsCount: resolved.periods.length,
          employeeCount,
          totalSalaryBase,
          health: { employee: healthEmployee, employer: healthEmployer, total: healthTotal },
          pension: { employee: pensionEmployee, employer: pensionEmployer, total: pensionTotal },
          arl: arlEmployer,
          totalContributions,
          employerShare,
          employeeShare,
        },
      };
    } catch (error) {
      console.error('❌ [CONTRIBUTIONS] aggregate failed:', error);
      return this.createErrorResponse(`Error al calcular aportes: ${error.message}`);
    }
  }
}
