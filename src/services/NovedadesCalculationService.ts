import { supabase } from '@/integrations/supabase/client';
import { PayrollNovedad } from '@/types/novedades-enhanced';

export interface NovedadesTotals {
  totalDevengos: number;
  totalDeducciones: number;
  totalNeto: number;
  hasNovedades: boolean;
}

const cache = new Map<string, NovedadesTotals>();

class NovedadesCalculationServiceClass {
  private generateCacheKey(employeeId: string, periodId: string): string {
    return `${employeeId}-${periodId}`;
  }

  invalidateCache(employeeId?: string, periodId?: string): void {
    if (employeeId && periodId) {
      const key = this.generateCacheKey(employeeId, periodId);
      cache.delete(key);
      console.log(`🗑️ Invalidating cache for employee ${employeeId} in period ${periodId}`);
    } else {
      cache.clear();
      console.log('🗑️ Invalidating ALL cache entries');
    }
  }

  async calculateEmployeeNovedadesTotals(employeeId: string, periodId: string): Promise<NovedadesTotals> {
    const cacheKey = this.generateCacheKey(employeeId, periodId);

    if (cache.has(cacheKey)) {
      console.log(`✅ Cache hit for employee ${employeeId} in period ${periodId}`);
      return cache.get(cacheKey)!;
    }

    try {
      console.log(`🧮 V21.0 DIAGNOSIS - Calculating novedades totals for employee ${employeeId} in period ${periodId}`);
      const novedades = await this.getEmployeeNovedades(employeeId, periodId);

      console.log('🔍 V21.0 DIAGNOSIS - Novedades raw data for calculation:', {
        totalNovedades: novedades.length,
        incapacidadesForCalculation: novedades.filter(n => n.tipo_novedad === 'incapacidad').map(n => ({
          id: n.id,
          valor: n.valor,
          valorType: typeof n.valor,
          dias: n.dias,
          diasType: typeof n.dias
        }))
      });

      let totalDevengos = 0;
      let totalDeducciones = 0;

      novedades.forEach(novedad => {
        const valor = Number(novedad.valor);
        console.log('🔍 V21.0 DIAGNOSIS - Processing novedad for calculation:', {
          id: novedad.id,
          tipo: novedad.tipo_novedad,
          valorOriginal: novedad.valor,
          valorOriginalType: typeof novedad.valor,
          valorConverted: valor,
          valorConvertedType: typeof valor,
          isNaN: isNaN(valor)
        });

        if (isNaN(valor)) return;

        switch (novedad.tipo_novedad) {
          case 'horas_extra':
          case 'recargo_nocturno':
          case 'vacaciones':
          case 'licencia_remunerada':
          case 'licencia_no_remunerada':
          case 'incapacidad':
          case 'bonificacion':
          case 'comision':
          case 'prima':
          case 'otros_ingresos':
            totalDevengos += valor;
            console.log('🔍 V21.0 DIAGNOSIS - Added to devengos:', { valor, newTotal: totalDevengos });
            break;
          case 'salud':
          case 'pension':
          case 'fondo_solidaridad':
          case 'retencion_fuente':
          case 'libranza':
          case 'ausencia':
          case 'multa':
          case 'descuento_voluntario':
            totalDeducciones += valor;
            console.log('🔍 V21.0 DIAGNOSIS - Added to deducciones:', { valor, newTotal: totalDeducciones });
            break;
          default:
            console.warn(`⚠️ Unknown novedad type: ${novedad.tipo_novedad}`);
        }
      });

      const totalNeto = totalDevengos - totalDeducciones;
      const hasNovedades = novedades.length > 0;
      const totals: NovedadesTotals = { totalDevengos, totalDeducciones, totalNeto, hasNovedades };

      console.log('✅ V21.0 DIAGNOSIS - Final calculation totals:', {
        employeeId,
        periodId,
        totals,
        incapacidadContributions: novedades
          .filter(n => n.tipo_novedad === 'incapacidad')
          .map(n => ({ id: n.id, valor: Number(n.valor) }))
      });

      cache.set(cacheKey, totals);
      return totals;
    } catch (error) {
      console.error('❌ V21.0 DIAGNOSIS - Error calculating employee novedades totals:', error);
      return {
        totalDevengos: 0,
        totalDeducciones: 0,
        totalNeto: 0,
        hasNovedades: false
      };
    }
  }

  async calculateAllEmployeesNovedadesTotals(employeeIds: string[], periodId: string): Promise<Record<string, NovedadesTotals>> {
    const totals: Record<string, NovedadesTotals> = {};

    if (!employeeIds || employeeIds.length === 0) {
      console.log('No employee IDs provided, skipping calculation');
      return totals;
    }

    console.log(`📊 Calculating novedades totals for ${employeeIds.length} employees in period ${periodId}`);

    for (const employeeId of employeeIds) {
      try {
        const employeeTotals = await this.calculateEmployeeNovedadesTotals(employeeId, periodId);
        totals[employeeId] = employeeTotals;
      } catch (error) {
        console.error(`❌ Error calculating totals for employee ${employeeId}:`, error);
        totals[employeeId] = {
          totalDevengos: 0,
          totalDeducciones: 0,
          totalNeto: 0,
          hasNovedades: false
        };
      }
    }

    return totals;
  }

  async getEmployeeNovedades(employeeId: string, periodId: string): Promise<PayrollNovedad[]> {
    if (!employeeId || !periodId) {
      console.log('❌ Missing employeeId or periodId for novedades fetch');
      return [];
    }

    try {
      console.log(`📋 V21.0 DIAGNOSIS - Fetching novedades for employee ${employeeId} in period ${periodId}`);
      
      // ✅ FIXED: Use correct table name 'payroll_novedades'
      const { data, error } = await supabase
        .from('payroll_novedades')
        .select('*')
        .eq('empleado_id', employeeId)
        .eq('periodo_id', periodId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ V21.0 DIAGNOSIS - Error fetching employee novedades:', error);
        throw error;
      }

      console.log('🔍 V21.0 DIAGNOSIS - Raw data from getEmployeeNovedades:', {
        totalRecords: data?.length || 0,
        rawIncapacidades: data?.filter(item => item.tipo_novedad === 'incapacidad').map(item => ({
          id: item.id,
          valor_raw: item.valor,
          valor_type: typeof item.valor,
          dias_raw: item.dias,
          dias_type: typeof item.dias,
          base_calculo_raw: item.base_calculo
        }))
      });

      // ✅ Transform the data to match PayrollNovedad interface
      const transformedData: PayrollNovedad[] = (data || []).map(item => {
        const transformed = {
          ...item,
          base_calculo: typeof item.base_calculo === 'string' 
            ? JSON.parse(item.base_calculo || '{}') 
            : item.base_calculo || undefined
        };

        console.log('🔍 V21.0 DIAGNOSIS - Transforming item:', {
          id: item.id,
          tipo_novedad: item.tipo_novedad,
          valor_before: item.valor,
          valor_after: transformed.valor,
          dias_before: item.dias,
          dias_after: transformed.dias
        });

        return transformed;
      });

      console.log(`✅ V21.0 DIAGNOSIS - Found ${transformedData.length} novedades for employee, incapacidades transformed:`, 
        transformedData.filter(n => n.tipo_novedad === 'incapacidad').map(n => ({
          id: n.id,
          valor_final: n.valor,
          valor_final_type: typeof n.valor,
          dias_final: n.dias,
          dias_final_type: typeof n.dias
        }))
      );
      
      return transformedData;
    } catch (error) {
      console.error('❌ V21.0 DIAGNOSIS - Error in getEmployeeNovedades:', error);
      return [];
    }
  }
}

export const NovedadesCalculationService = new NovedadesCalculationServiceClass();
