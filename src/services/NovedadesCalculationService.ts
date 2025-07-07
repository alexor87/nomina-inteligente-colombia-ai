import { supabase } from '@/integrations/supabase/client';
import { PayrollNovedad } from '@/types/novedades-enhanced';

export interface NovedadesTotals {
  totalDevengos: number;
  totalDeducciones: number;
  totalNeto: number;
  hasNovedades: boolean;
}

export class NovedadesCalculationService {
  private static cache = new Map<string, NovedadesTotals>();
  
  static async calculateEmployeeNovedadesTotals(employeeId: string, periodId: string): Promise<NovedadesTotals> {
    const cacheKey = `${employeeId}-${periodId}`;
    
    try {
      console.log(`🧮 Calculating novelties for employee ${employeeId} in period ${periodId}`);
      
      const { data: novedades, error } = await supabase
        .from('payroll_novedades')
        .select('*')
        .eq('empleado_id', employeeId)
        .eq('periodo_id', periodId);

      if (error) {
        console.error('❌ Error getting novelties:', error);
        return this.getEmptyTotals();
      }

      if (!novedades || novedades.length === 0) {
        console.log(`ℹ️ No novelties found for employee ${employeeId}`);
        const emptyTotals = this.getEmptyTotals();
        this.cache.set(cacheKey, emptyTotals);
        return emptyTotals;
      }

      console.log(`📊 Found ${novedades.length} novelties:`, novedades);
      
      const totals = this.calculateTotalsFromNovedades(novedades as PayrollNovedad[]);
      this.cache.set(cacheKey, totals);
      
      console.log(`✅ Totals calculated for ${employeeId}:`, totals);
      return totals;
      
    } catch (error) {
      console.error('💥 Critical error calculating novelties:', error);
      return this.getEmptyTotals();
    }
  }

  static async calculateAllEmployeesNovedadesTotals(employeeIds: string[], periodId: string): Promise<Record<string, NovedadesTotals>> {
    console.log(`🔄 Calculating novelties for ${employeeIds.length} employees`);
    
    const results: Record<string, NovedadesTotals> = {};
    
    // Process in parallel for better performance
    const promises = employeeIds.map(async (employeeId) => {
      const totals = await this.calculateEmployeeNovedadesTotals(employeeId, periodId);
      return { employeeId, totals };
    });

    const allResults = await Promise.all(promises);
    
    allResults.forEach(({ employeeId, totals }) => {
      results[employeeId] = totals;
    });

    return results;
  }

  private static calculateTotalsFromNovedades(novedades: PayrollNovedad[]): NovedadesTotals {
    let totalDevengos = 0;
    let totalDeducciones = 0;

    novedades.forEach(novedad => {
      // IMPROVED: Better number handling
      const valor = Number(novedad.valor) || 0;
      
      console.log(`💰 Processing novelty: ${novedad.tipo_novedad} = $${valor}`);
      
      // Classify by novelty type
      if (this.isDevengado(novedad.tipo_novedad)) {
        totalDevengos += valor;
        console.log(`➕ Added to earnings: $${valor} (total: $${totalDevengos})`);
      } else if (this.isDeduccion(novedad.tipo_novedad)) {
        totalDeducciones += valor;
        console.log(`➖ Added to deductions: $${valor} (total: $${totalDeducciones})`);
      }
    });

    const totalNeto = totalDevengos - totalDeducciones;

    const result = {
      totalDevengos,
      totalDeducciones,
      totalNeto,
      hasNovedades: novedades.length > 0
    };

    console.log(`📈 Final calculation result:`, result);
    return result;
  }

  private static isDevengado(tipoNovedad: string): boolean {
    const devengados = [
      'horas_extra', 'recargo_nocturno', 'vacaciones', 'licencia_remunerada',
      'incapacidad', 'bonificacion', 'bonificacion_salarial', 'bonificacion_no_salarial',
      'comision', 'prima', 'otros_ingresos', 'auxilio_conectividad', 'viaticos',
      'retroactivos', 'compensacion_ordinaria'
    ];
    return devengados.includes(tipoNovedad);
  }

  private static isDeduccion(tipoNovedad: string): boolean {
    const deducciones = [
      'libranza', 'multa', 'ausencia', 'descuento_voluntario', 'retencion_fuente',
      'fondo_solidaridad', 'salud', 'pension', 'arl', 'caja_compensacion',
      'icbf', 'sena', 'embargo', 'anticipo', 'aporte_voluntario'
    ];
    return deducciones.includes(tipoNovedad);
  }

  private static getEmptyTotals(): NovedadesTotals {
    return {
      totalDevengos: 0,
      totalDeducciones: 0,
      totalNeto: 0,
      hasNovedades: false
    };
  }

  static invalidateCache(employeeId?: string, periodId?: string) {
    if (employeeId && periodId) {
      const cacheKey = `${employeeId}-${periodId}`;
      this.cache.delete(cacheKey);
      console.log(`🗑️ Cache invalidated for ${cacheKey}`);
    } else {
      this.cache.clear();
      console.log('🗑️ Complete cache invalidated');
    }
  }
}
