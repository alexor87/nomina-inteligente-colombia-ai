
import { supabase } from '@/integrations/supabase/client';
import { DisplayNovedad, convertNovedadToDisplay } from '@/types/vacation-integration';
import { NovedadesEnhancedService } from './NovedadesEnhancedService';

export class PayrollIntegratedDataService {
  static async getEmployeePeriodData(
    employeeId: string,
    periodId: string
  ): Promise<DisplayNovedad[]> {
    try {
      console.log('🔍 PayrollIntegratedDataService - PROFESSIONAL: Obteniendo datos unificados (solo novedades):', {
        employeeId,
        periodId
      });

      const { data: period } = await supabase
        .from('payroll_periods_real')
        .select('fecha_inicio, fecha_fin, company_id')
        .eq('id', periodId)
        .single();

      if (!period) {
        console.error('❌ Período no encontrado:', periodId);
        return [];
      }

      // ✅ PROFESSIONAL: Obtener novedades sin estimaciones locales
      const novedadesData = await NovedadesEnhancedService.getNovedadesByEmployee(
        employeeId,
        periodId
      );

      // ✅ PROFESSIONAL: No más estimaciones locales - el backend maneja todo
      const displayData: DisplayNovedad[] = novedadesData.map(novedad => {
        return convertNovedadToDisplay(novedad);
      });

      const sortedData = displayData.sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      console.log('✅ PayrollIntegratedDataService - PROFESSIONAL: Datos unificados obtenidos (backend calculations):', {
        totalElementos: sortedData.length,
        novedades: sortedData.filter(item => item.origen === 'novedades').length
      });

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
