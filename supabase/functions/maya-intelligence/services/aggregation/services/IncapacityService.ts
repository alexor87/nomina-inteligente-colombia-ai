/**
 * Incapacity Aggregation Service
 * Tracks total incapacity days and costs
 */

import { BaseAggregationService, AggregationResult } from '../base/BaseAggregationService.ts';
import { TemporalParams } from '../../../core/temporal/types.ts';
import { NOVEDAD_TYPES, INCAPACITY_SUBTYPES } from '../constants/NovedadTypes.ts';

export class IncapacityService extends BaseAggregationService {
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

      console.log(`✅ [INCAPACITY] Found ${resolved.periods.length} periods for ${resolved.displayName}`);

      const allNovedades: any[] = [];
      
      for (const period of resolved.periods) {
        const { data: novedades, error } = await client
          .from('payroll_novedades')
          .select(`
            dias,
            valor,
            subtipo,
            empleado_id
          `)
          .eq('company_id', companyId)
          .eq('periodo_id', period.id)
          .eq('tipo_novedad', NOVEDAD_TYPES.INCAPACIDAD);

        if (error) {
          console.error('❌ [INCAPACITY] Error querying novedades:', error);
          return this.createErrorResponse('Error al consultar incapacidades');
        }

        if (novedades) {
          allNovedades.push(...novedades);
        }
      }

      if (allNovedades.length === 0) {
        return {
          message: `No se registraron incapacidades en ${resolved.displayName}.`,
          emotionalState: 'neutral',
        };
      }

      const totalDays = allNovedades.reduce((sum, n) => sum + (n.dias || 0), 0);
      const totalCost = allNovedades.reduce((sum, n) => sum + (n.valor || 0), 0);
      const employeeCount = new Set(allNovedades.map(n => n.empleado_id)).size;

      // Group by subtype
      const bySubtype: Record<string, { count: number; days: number; cost: number }> = {};
      allNovedades.forEach(n => {
        const subtype = n.subtipo || 'general';
        if (!bySubtype[subtype]) {
          bySubtype[subtype] = { count: 0, days: 0, cost: 0 };
        }
        bySubtype[subtype].count++;
        bySubtype[subtype].days += n.dias || 0;
        bySubtype[subtype].cost += n.valor || 0;
      });

      const subtypeBreakdown = Object.entries(bySubtype)
        .map(([subtype, data]) => 
          `• **${subtype.charAt(0).toUpperCase() + subtype.slice(1)}**: ${data.days} días - ${this.formatCurrency(data.cost)}`
        )
        .join('\n');

      const message = `🏥 **Total de Incapacidades - ${resolved.displayName}**\n\n` +
        (resolved.periods.length > 1 
          ? `📅 **${resolved.periods.length} períodos sumados**\n`
          : '') +
        `📊 **${totalDays}** días de incapacidad\n` +
        `👥 **${employeeCount}** empleados\n` +
        `💰 Costo total: ${this.formatCurrency(totalCost)}\n\n` +
        `**Por tipo:**\n${subtypeBreakdown}`;

      return {
        message,
        emotionalState: 'professional',
        data: {
          period: resolved.displayName,
          periodsCount: resolved.periods.length,
          totalDays,
          totalCost,
          employeeCount,
          bySubtype,
        },
      };
    } catch (error) {
      console.error('❌ [INCAPACITY] aggregate failed:', error);
      return this.createErrorResponse(`Error al consultar incapacidades: ${error.message}`);
    }
  }
}
