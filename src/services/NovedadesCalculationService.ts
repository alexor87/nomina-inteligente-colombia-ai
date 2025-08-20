import { supabase } from '@/integrations/supabase/client';
import { PayrollNovedad } from '@/types/novedades-enhanced';
import { IncapacityCalculationService } from './IncapacityCalculationService';

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

  // Nuevo: obtener salario base para poder estimar incapacidades con valor 0
  private async getEmployeeSalary(employeeId: string): Promise<number> {
    console.log('🔎 Fetching employee salary for incapacity estimation:', employeeId);
    const { data, error } = await supabase
      .from('employees')
      .select('salario_base')
      .eq('id', employeeId)
      .single();

    if (error) {
      console.warn('⚠️ Could not fetch employee salary, incapacity estimation may be skipped:', error);
      return 0;
    }

    const salary = Number(data?.salario_base || 0);
    console.log('💰 Employee salary fetched:', salary);
    return salary;
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

      // Obtener salario una sola vez para posibles estimaciones de incapacidad
      const employeeSalary = await this.getEmployeeSalary(employeeId);

      novedades.forEach(novedad => {
        let valor = Number(novedad.valor);
        if (isNaN(valor)) valor = 0;

        // Estimación normativa: si es incapacidad y el valor almacenado es 0, intentar calcular
        if (novedad.tipo_novedad === 'incapacidad' && valor === 0) {
          const dias = Number((novedad as any).dias || 0);
          const subtipo = (novedad as any).subtipo as string | undefined;

          if (employeeSalary > 0 && dias > 0) {
            const estimated = IncapacityCalculationService.computeIncapacityValue(employeeSalary, dias, subtipo);
            if (estimated > 0) {
              console.log('🩺 Estimating incapacity value for totals (UI only):', {
                employeeId,
                periodId,
                dias,
                subtipo,
                employeeSalary,
                estimated
              });
              valor = estimated; // solo para sumar en UI, no persiste
            }
          }
        }

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
        base_calculo: typeof (item as any).base_calculo === 'string'
          ? JSON.parse((item as any).base_calculo || '{}')
          : (item as any).base_calculo || undefined
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
