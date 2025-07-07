
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
      console.log(`🧮 Calculando novedades para empleado ${employeeId} en período ${periodId}`);
      
      const { data: novedades, error } = await supabase
        .from('payroll_novedades')
        .select('*')
        .eq('empleado_id', employeeId)
        .eq('periodo_id', periodId);

      if (error) {
        console.error('❌ Error obteniendo novedades:', error);
        return this.getEmptyTotals();
      }

      if (!novedades || novedades.length === 0) {
        const emptyTotals = this.getEmptyTotals();
        this.cache.set(cacheKey, emptyTotals);
        return emptyTotals;
      }

      const totals = this.calculateTotalsFromNovedades(novedades as PayrollNovedad[]);
      this.cache.set(cacheKey, totals);
      
      console.log(`✅ Totales calculados para ${employeeId}:`, totals);
      return totals;
      
    } catch (error) {
      console.error('💥 Error crítico calculando novedades:', error);
      return this.getEmptyTotals();
    }
  }

  static async calculateAllEmployeesNovedadesTotals(employeeIds: string[], periodId: string): Promise<Record<string, NovedadesTotals>> {
    console.log(`🔄 Calculando novedades para ${employeeIds.length} empleados`);
    
    const results: Record<string, NovedadesTotals> = {};
    
    // Procesar en paralelo para mejor performance
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
      const valor = Number(novedad.valor) || 0;
      
      // Clasificar por tipo de novedad
      if (this.isDevengado(novedad.tipo_novedad)) {
        totalDevengos += valor;
      } else if (this.isDeduccion(novedad.tipo_novedad)) {
        totalDeducciones += valor;
      }
    });

    const totalNeto = totalDevengos - totalDeducciones;

    return {
      totalDevengos,
      totalDeducciones,
      totalNeto,
      hasNovedades: novedades.length > 0
    };
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
      console.log(`🗑️ Cache invalidado para ${cacheKey}`);
    } else {
      this.cache.clear();
      console.log('🗑️ Cache completo invalidado');
    }
  }
}
