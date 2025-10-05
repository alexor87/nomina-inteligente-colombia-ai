/**
 * Overtime Aggregation Service
 * ✅ CRITICAL: Fixed enum bug - uses 'horas_extra' instead of 'hora_extra'
 */

import { BaseAggregationService, AggregationResult } from '../base/BaseAggregationService.ts';
import { TemporalParams } from '../../../core/temporal/types.ts';
import { NOVEDAD_GROUPS, NOVEDAD_DISPLAY_NAMES } from '../constants/NovedadTypes.ts';

export class OvertimeService extends BaseAggregationService {
  async aggregate(client: any, params: TemporalParams): Promise<AggregationResult> {
    try {
      // Get company ID
      const companyId = await this.getCurrentCompanyId(client);
      if (!companyId) {
        return this.createErrorResponse('No se pudo determinar la empresa del usuario');
      }

      // Resolve periods
      const resolved = await this.resolvePeriods(client, companyId, params);
      if (!resolved) {
        return this.createNotFoundResponse(
          params.month || params.year 
            ? `${params.month || ''} ${params.year || ''}`
            : 'el período solicitado'
        );
      }

      console.log(`✅ [OVERTIME] Found ${resolved.periods.length} periods for ${resolved.displayName}`);

      // Query all novedades across periods
      const allNovedades: any[] = [];
      
      for (const period of resolved.periods) {
        const { data: novedades, error } = await client
          .from('payroll_novedades')
          .select(`
            dias,
            valor,
            subtipo,
            tipo_novedad,
            empleado_id,
            employees!inner(nombre, apellido)
          `)
          .eq('company_id', companyId)
          .eq('periodo_id', period.id)
          .in('tipo_novedad', NOVEDAD_GROUPS.OVERTIME_TYPES); // ✅ FIXED: Using correct enum values

        if (error) {
          console.error('❌ [OVERTIME] Error querying novedades:', error);
          return this.createErrorResponse('Error al consultar las novedades');
        }

        if (novedades) {
          allNovedades.push(...novedades);
        }
      }

      // Check if any overtime found
      if (allNovedades.length === 0) {
        return {
          message: `No se registraron horas extras en ${resolved.displayName}.`,
          emotionalState: 'neutral',
        };
      }

      // Calculate totals
      const totalHours = allNovedades.reduce((sum, n) => sum + (n.dias || 0), 0);
      const totalCost = allNovedades.reduce((sum, n) => sum + (n.valor || 0), 0);
      const employeeCount = new Set(allNovedades.map(n => n.empleado_id)).size;

      // Group by type
      const byType: Record<string, { count: number; hours: number; cost: number }> = {};
      allNovedades.forEach(n => {
        const type = n.tipo_novedad || NOVEDAD_GROUPS.OVERTIME_TYPES[0]; // ✅ FIXED: Default to correct enum
        if (!byType[type]) {
          byType[type] = { count: 0, hours: 0, cost: 0 };
        }
        byType[type].count++;
        byType[type].hours += n.dias || 0;
        byType[type].cost += n.valor || 0;
      });

      // Format breakdown
      const typeBreakdown = Object.entries(byType)
        .map(([type, data]) => {
          const displayName = NOVEDAD_DISPLAY_NAMES[type] || type.replace(/_/g, ' ');
          return `• **${displayName}**: ${data.hours} horas - ${this.formatCurrency(data.cost)}`;
        })
        .join('\n');

      // Build response message
      const message = `⏰ **Total de Horas Extras - ${resolved.displayName}**\n\n` +
        (resolved.periods.length > 1 
          ? `📅 **${resolved.periods.length} períodos sumados**\n`
          : '') +
        `📊 **${totalHours}** horas extras totales\n` +
        `👥 **${employeeCount}** empleados\n` +
        `💰 Costo total: ${this.formatCurrency(totalCost)}\n\n` +
        `**Por tipo:**\n${typeBreakdown}`;

      return {
        message,
        emotionalState: 'professional',
        data: {
          period: resolved.displayName,
          periodsCount: resolved.periods.length,
          totalHours,
          totalCost,
          employeeCount,
          byType,
        },
        visualization: {
          type: 'metric',
          data: {
            title: 'Horas Extras',
            value: totalHours,
            subtitle: resolved.displayName,
            breakdown: Object.entries(byType).map(([type, data]) => ({
              label: NOVEDAD_DISPLAY_NAMES[type] || type.replace(/_/g, ' '),
              value: data.hours,
            })),
          },
        },
      };
    } catch (error) {
      console.error('❌ [OVERTIME] aggregate failed:', error);
      return this.createErrorResponse(`Error al consultar horas extras: ${error.message}`);
    }
  }
}
