/**
 * Contribution Report Service
 * Generates detailed EPS, Pension, and ARL contribution reports per employee
 */

import { BaseAggregationService, AggregationResult } from '../base/BaseAggregationService.ts';
import { TemporalParams } from '../../../core/temporal-types.ts';
import { CONTRIBUTION_RATES } from '../constants/ContributionRates.ts';

export class ContributionReportService extends BaseAggregationService {
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

      console.log(`✅ [CONTRIBUTION_REPORT] Found ${resolved.periods.length} periods for ${resolved.displayName}`);

      // Extract contribution type filter if provided
      const contributionType = (params as any).contributionType || null;
      console.log(`📋 [CONTRIBUTION_REPORT] Contribution type filter: ${contributionType || 'all'}`);

      // Query all payrolls for the resolved periods
      const { data: payrolls, error } = await client
        .from('payrolls')
        .select('employee_id, salario_base, periodo, period_id')
        .eq('company_id', companyId)
        .in('period_id', resolved.periods.map(p => p.id));

      if (error) {
        console.error('❌ [CONTRIBUTION_REPORT] Error querying payrolls:', error);
        return this.createErrorResponse('Error al consultar la nómina');
      }

      if (!payrolls || payrolls.length === 0) {
        return {
          message: `No encontré datos de nómina para ${resolved.displayName}.`,
          emotionalState: 'neutral',
        };
      }

      // Get unique employee IDs
      const employeeIds = [...new Set(payrolls.map(p => p.employee_id))];

      // Fetch employee details
      const { data: employees, error: empError } = await client
        .from('employees')
        .select('id, nombre, apellido')
        .eq('company_id', companyId)
        .in('id', employeeIds);

      if (empError) {
        console.error('❌ [CONTRIBUTION_REPORT] Error fetching employees:', error);
        return this.createErrorResponse('Error al obtener información de empleados');
      }

      // Build employee map
      const employeeMap = new Map(employees.map(e => [e.id, `${e.nombre} ${e.apellido}`]));

      // Aggregate contributions per employee
      interface EmployeeContributions {
        employeeId: string;
        employeeName: string;
        totalSalaryBase: number;
        eps: { employee: number; employer: number; total: number };
        pension: { employee: number; employer: number; total: number };
        arl: number;
        totalContributions: number;
      }

      const employeeContributions = new Map<string, EmployeeContributions>();

      for (const payroll of payrolls) {
        const empId = payroll.employee_id;
        const salaryBase = payroll.salario_base || 0;

        if (!employeeContributions.has(empId)) {
          employeeContributions.set(empId, {
            employeeId: empId,
            employeeName: employeeMap.get(empId) || 'Desconocido',
            totalSalaryBase: 0,
            eps: { employee: 0, employer: 0, total: 0 },
            pension: { employee: 0, employer: 0, total: 0 },
            arl: 0,
            totalContributions: 0,
          });
        }

        const contrib = employeeContributions.get(empId)!;
        contrib.totalSalaryBase += salaryBase;

        // Calculate contributions
        const healthEmployee = salaryBase * CONTRIBUTION_RATES.HEALTH_EMPLOYEE;
        const healthEmployer = salaryBase * CONTRIBUTION_RATES.HEALTH_EMPLOYER;

        const pensionEmployee = salaryBase * CONTRIBUTION_RATES.PENSION_EMPLOYEE;
        const pensionEmployer = salaryBase * CONTRIBUTION_RATES.PENSION_EMPLOYER;

        const arlEmployer = salaryBase * CONTRIBUTION_RATES.ARL_MIN;

        contrib.eps.employee += healthEmployee;
        contrib.eps.employer += healthEmployer;
        contrib.eps.total += healthEmployee + healthEmployer;

        contrib.pension.employee += pensionEmployee;
        contrib.pension.employer += pensionEmployer;
        contrib.pension.total += pensionEmployee + pensionEmployer;

        contrib.arl += arlEmployer;

        contrib.totalContributions += (healthEmployee + healthEmployer + pensionEmployee + pensionEmployer + arlEmployer);
      }

      // Convert to array and sort by total contributions (descending)
      const sortedContributions = Array.from(employeeContributions.values())
        .sort((a, b) => b.totalContributions - a.totalContributions);

      // Calculate totals
      const totalEps = sortedContributions.reduce((sum, c) => sum + c.eps.total, 0);
      const totalPension = sortedContributions.reduce((sum, c) => sum + c.pension.total, 0);
      const totalArl = sortedContributions.reduce((sum, c) => sum + c.arl, 0);
      const grandTotal = sortedContributions.reduce((sum, c) => sum + c.totalContributions, 0);
      const avgContribution = grandTotal / sortedContributions.length;

      // Build message
      const typeFilter = contributionType 
        ? ` (filtrado por ${contributionType === 'eps' ? 'EPS' : contributionType === 'pension' ? 'Pensión' : 'ARL'})`
        : '';

      let message = `🏥 **Detalle de Aportes por Empleado${typeFilter}**\n\n`;
      message += `📅 Período: **${resolved.displayName}**\n`;
      message += `👥 Total empleados: **${sortedContributions.length}**\n\n`;

      // Add per-employee breakdown
      message += `---\n\n`;

      for (const contrib of sortedContributions) {
        message += `### ${contrib.employeeName}\n`;

        // Show only requested type or all
        if (!contributionType || contributionType === 'eps') {
          message += `**EPS (Salud):**\n`;
          message += `  • Empleado (4%): ${this.formatCurrency(contrib.eps.employee)}\n`;
          message += `  • Empleador (8.5%): ${this.formatCurrency(contrib.eps.employer)}\n`;
          message += `  • **Total EPS**: ${this.formatCurrency(contrib.eps.total)}\n\n`;
        }

        if (!contributionType || contributionType === 'pension') {
          message += `**Pensión:**\n`;
          message += `  • Empleado (4%): ${this.formatCurrency(contrib.pension.employee)}\n`;
          message += `  • Empleador (12%): ${this.formatCurrency(contrib.pension.employer)}\n`;
          message += `  • **Total Pensión**: ${this.formatCurrency(contrib.pension.total)}\n\n`;
        }

        if (!contributionType || contributionType === 'arl') {
          message += `**ARL (Mínimo):**\n`;
          message += `  • Empleador: ${this.formatCurrency(contrib.arl)}\n\n`;
        }

        message += `💰 **Total aportes**: ${this.formatCurrency(contrib.totalContributions)}\n\n`;
        message += `---\n\n`;
      }

      // Summary
      message += `\n📊 **Resumen Total**\n`;
      if (!contributionType || contributionType === 'eps') {
        message += `• **Total EPS**: ${this.formatCurrency(totalEps)}\n`;
      }
      if (!contributionType || contributionType === 'pension') {
        message += `• **Total Pensión**: ${this.formatCurrency(totalPension)}\n`;
      }
      if (!contributionType || contributionType === 'arl') {
        message += `• **Total ARL**: ${this.formatCurrency(totalArl)}\n`;
      }
      message += `• **Gran Total**: ${this.formatCurrency(grandTotal)}\n`;
      message += `• **Promedio por empleado**: ${this.formatCurrency(avgContribution)}`;

      return {
        message,
        emotionalState: 'professional',
        data: {
          period: resolved.displayName,
          periodsCount: resolved.periods.length,
          employeeCount: sortedContributions.length,
          contributions: sortedContributions,
          totals: {
            eps: totalEps,
            pension: totalPension,
            arl: totalArl,
            grandTotal,
            average: avgContribution,
          },
        },
      };
    } catch (error) {
      console.error('❌ [CONTRIBUTION_REPORT] aggregate failed:', error);
      return this.createErrorResponse(`Error al generar reporte de aportes: ${error.message}`);
    }
  }
}
