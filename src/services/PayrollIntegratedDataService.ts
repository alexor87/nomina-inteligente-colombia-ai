
import { supabase } from '@/integrations/supabase/client';
import { DisplayNovedad, convertNovedadToDisplay } from '@/types/vacation-integration';
import { NovedadesEnhancedService } from './NovedadesEnhancedService';

export class PayrollIntegratedDataService {
  static async getEmployeePeriodData(
    employeeId: string,
    periodId: string
  ): Promise<DisplayNovedad[]> {
    try {
      const { data: period } = await supabase
        .from('payroll_periods_real')
        .select('fecha_inicio, fecha_fin, company_id')
        .eq('id', periodId)
        .single();

      if (!period) {
        console.error('❌ Período no encontrado:', periodId);
        return [];
      }

      // ✅ Obtener novedades de la DB (valores ya calculados al crear)
      const novedadesData = await NovedadesEnhancedService.getNovedadesByEmployee(employeeId, periodId);

      // ✅ Convertir novedades usando valores almacenados en DB (ya calculados al crear)
      // NOTA: No sobreescribir valor con breakdown por tipo_novedad+subtipo,
      // porque cuando hay múltiples entradas del mismo tipo (ej: 2 recargos nocturnos),
      // el Map colisiona y todas reciben el mismo valor.
      const displayData: DisplayNovedad[] = novedadesData.map(novedad => {
        return convertNovedadToDisplay(novedad);
      });

      const sortedData = displayData.sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      return sortedData;

    } catch (error) {
      console.error('❌ PayrollIntegratedDataService - Error obteniendo datos unificados:', error);
      return [];
    }
  }

  static calculatePeriodIntersectionDays(
    vacationStart: string,
    vacationEnd: string,
    periodStart: string,
    periodEnd: string
  ): number {
    const vacStartDate = new Date(vacationStart);
    const vacEndDate = new Date(vacationEnd);
    const perStartDate = new Date(periodStart);
    const perEndDate = new Date(periodEnd);

    const intersectionStart = new Date(Math.max(vacStartDate.getTime(), perStartDate.getTime()));
    const intersectionEnd = new Date(Math.min(vacEndDate.getTime(), perEndDate.getTime()));

    if (intersectionStart > intersectionEnd) {
      return 0;
    }

    const diffTime = intersectionEnd.getTime() - intersectionStart.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    return Math.max(0, diffDays);
  }
}
