
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
      console.log(`🧮 Calculating novedades totals for employee ${employeeId} in period ${periodId}`);
      const novedades = await this.getEmployeeNovedades(employeeId, periodId);

      let totalDevengos = 0;
      let totalDeducciones = 0;

      novedades.forEach(novedad => {
        const valor = Number(novedad.valor);
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
            break;
          default:
            console.warn(`⚠️ Unknown novedad type: ${novedad.tipo_novedad}`);
        }
      });

      const totalNeto = totalDevengos - totalDeducciones;
      const hasNovedades = novedades.length > 0;
      const totals: NovedadesTotals = { totalDevengos, totalDeducciones, totalNeto, hasNovedades };

      cache.set(cacheKey, totals);
      return totals;
    } catch (error) {
      console.error('❌ Error calculating employee novedades totals:', error);
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
      console.log(`📋 Fetching novedades for employee ${employeeId} in period ${periodId}`);
      
      // ✅ FIXED: Use correct table name 'payroll_novedades'
      const { data, error } = await supabase
        .from('payroll_novedades')
        .select('*')
        .eq('empleado_id', employeeId)
        .eq('periodo_id', periodId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching employee novedades:', error);
        throw error;
      }

      // ✅ Transform the data to match PayrollNovedad interface
      const transformedData: PayrollNovedad[] = (data || []).map(item => ({
        ...item,
        base_calculo: typeof item.base_calculo === 'string' 
          ? JSON.parse(item.base_calculo || '{}') 
          : item.base_calculo || undefined
      }));

      console.log(`✅ Found ${transformedData.length} novedades for employee`);
      return transformedData;
    } catch (error) {
      console.error('❌ Error in getEmployeeNovedades:', error);
      return [];
    }
  }
}

export const NovedadesCalculationService = new NovedadesCalculationServiceClass();
