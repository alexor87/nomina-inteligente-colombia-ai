/**
 * Employee Cost Service
 * Identifies highest and lowest cost employees
 */

import { BaseAggregationService, AggregationResult } from '../base/BaseAggregationService.ts';
import { TemporalParams } from '../../../core/temporal-types.ts';

export class EmployeeCostService extends BaseAggregationService {
  async aggregateHighest(
    client: any,
    params: TemporalParams & { limit?: number }
  ): Promise<AggregationResult> {
    return this.aggregateEmployeeCost(client, params, 'highest');
  }

  async aggregateLowest(
    client: any,
    params: TemporalParams & { limit?: number }
  ): Promise<AggregationResult> {
    return this.aggregateEmployeeCost(client, params, 'lowest');
  }

  private async aggregateEmployeeCost(
    client: any,
    params: TemporalParams & { limit?: number },
    mode: 'highest' | 'lowest'
  ): Promise<AggregationResult> {
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

      console.log(`✅ [EMPLOYEE_COST] Found ${resolved.periods.length} periods for ${resolved.displayName}`);

      // Aggregate costs by employee across all periods
      const employeeCosts: Record<string, { 
        name: string; 
        totalCost: number; 
        grossPay: number;
        deductions: number;
        netPay: number;
      }> = {};

      for (const period of resolved.periods) {
        const { data: payrolls, error } = await client
          .from('payrolls')
          .select(`
            employee_id,
            total_devengado,
            total_deducciones,
            neto_pagado,
            employees!inner(nombre, apellido)
          `)
          .eq('company_id', companyId)
          .eq('period_id', period.id);

        if (error) {
          console.error('❌ [EMPLOYEE_COST] Error querying payrolls:', error);
          return this.createErrorResponse('Error al consultar la nómina');
        }

        if (payrolls) {
          payrolls.forEach((p: any) => {
            const empId = p.employee_id;
            const name = `${p.employees.nombre} ${p.employees.apellido}`;
            const cost = (p.total_devengado || 0) * 1.52; // Include estimated employer burden

            if (!employeeCosts[empId]) {
              employeeCosts[empId] = {
                name,
                totalCost: 0,
                grossPay: 0,
                deductions: 0,
                netPay: 0,
              };
            }

            employeeCosts[empId].totalCost += cost;
            employeeCosts[empId].grossPay += p.total_devengado || 0;
            employeeCosts[empId].deductions += p.total_deducciones || 0;
            employeeCosts[empId].netPay += p.neto_pagado || 0;
          });
        }
      }

      if (Object.keys(employeeCosts).length === 0) {
        return {
          message: `No encontré datos de nómina para ${resolved.displayName}.`,
          emotionalState: 'neutral',
        };
      }

      // Sort and limit
      const limit = params.limit || 5;
      const sortedEmployees = Object.entries(employeeCosts)
        .sort(([, a], [, b]) => 
          mode === 'highest' ? b.totalCost - a.totalCost : a.totalCost - b.totalCost
        )
        .slice(0, limit);

      const employeeList = sortedEmployees
        .map(([, emp], idx) => 
          `${idx + 1}. **${emp.name}**\n` +
          `   💰 Costo total: ${this.formatCurrency(emp.totalCost)}\n` +
          `   📊 Devengado: ${this.formatCurrency(emp.grossPay)}`
        )
        .join('\n\n');

      const icon = mode === 'highest' ? '📈' : '📉';
      const title = mode === 'highest' ? 'Empleados Más Costosos' : 'Empleados Menos Costosos';

      const message = `${icon} **${title} - ${resolved.displayName}**\n\n` +
        (resolved.periods.length > 1 
          ? `📅 **${resolved.periods.length} períodos sumados**\n\n`
          : '') +
        employeeList;

      return {
        message,
        emotionalState: 'professional',
        data: {
          period: resolved.displayName,
          periodsCount: resolved.periods.length,
          employees: sortedEmployees.map(([id, emp]) => ({ id, ...emp })),
        },
      };
    } catch (error) {
      console.error('❌ [EMPLOYEE_COST] aggregate failed:', error);
      return this.createErrorResponse(`Error al analizar empleados: ${error.message}`);
    }
  }

  // Required by base class but not used directly
  async aggregate(client: any, params: TemporalParams): Promise<AggregationResult> {
    return this.aggregateHighest(client, params);
  }
}
