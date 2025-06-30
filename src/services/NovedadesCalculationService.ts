
import { supabase } from '@/integrations/supabase/client';
import { PayrollHistoryService } from './PayrollHistoryService';

export interface NovedadesTotals {
  totalDevengos: number;
  totalDeducciones: number;
  totalNeto: number;
  hasNovedades: boolean;
}

export class NovedadesCalculationService {
  // Calcular totales de novedades por empleado para un período
  static async calculateEmployeeNovedadesTotals(
    employeeId: string, 
    periodId: string
  ): Promise<NovedadesTotals> {
    try {
      console.log('🧮 Calculando totales de novedades para empleado:', employeeId, 'período:', periodId);
      
      const companyId = await PayrollHistoryService.getCurrentUserCompanyId();
      if (!companyId) {
        return { totalDevengos: 0, totalDeducciones: 0, totalNeto: 0, hasNovedades: false };
      }

      const { data: novedades, error } = await supabase
        .from('payroll_novedades')
        .select('tipo_novedad, valor')
        .eq('empleado_id', employeeId)
        .eq('periodo_id', periodId)
        .eq('company_id', companyId);

      if (error) {
        console.error('❌ Error cargando novedades:', error);
        return { totalDevengos: 0, totalDeducciones: 0, totalNeto: 0, hasNovedades: false };
      }

      if (!novedades || novedades.length === 0) {
        return { totalDevengos: 0, totalDeducciones: 0, totalNeto: 0, hasNovedades: false };
      }

      // Separar devengos y deducciones según el tipo
      const devengos = [
        'horas_extra', 'recargo_nocturno', 'vacaciones', 'licencia_remunerada',
        'incapacidad', 'bonificacion', 'comision', 'prima', 'otros_ingresos'
      ];

      let totalDevengos = 0;
      let totalDeducciones = 0;

      novedades.forEach(novedad => {
        const valor = Number(novedad.valor) || 0;
        if (devengos.includes(novedad.tipo_novedad)) {
          totalDevengos += valor;
        } else {
          totalDeducciones += valor;
        }
      });

      const totalNeto = totalDevengos - totalDeducciones;

      console.log('💰 Totales calculados:', { 
        empleadoId: employeeId,
        totalDevengos, 
        totalDeducciones, 
        totalNeto,
        cantidadNovedades: novedades.length
      });

      return {
        totalDevengos,
        totalDeducciones,
        totalNeto,
        hasNovedades: novedades.length > 0
      };
    } catch (error) {
      console.error('❌ Error calculando totales de novedades:', error);
      return { totalDevengos: 0, totalDeducciones: 0, totalNeto: 0, hasNovedades: false };
    }
  }

  // Calcular totales de todos los empleados para un período
  static async calculateAllEmployeesNovedadesTotals(
    employeeIds: string[], 
    periodId: string
  ): Promise<Record<string, NovedadesTotals>> {
    const results: Record<string, NovedadesTotals> = {};
    
    // Calcular en paralelo para mejor performance
    const promises = employeeIds.map(async (employeeId) => {
      const totals = await this.calculateEmployeeNovedadesTotals(employeeId, periodId);
      return { employeeId, totals };
    });

    const calculations = await Promise.all(promises);
    
    calculations.forEach(({ employeeId, totals }) => {
      results[employeeId] = totals;
    });

    return results;
  }
}
