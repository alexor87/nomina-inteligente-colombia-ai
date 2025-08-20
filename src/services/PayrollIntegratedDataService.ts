import { supabase } from '@/integrations/supabase/client';
import { DisplayNovedad, convertNovedadToDisplay } from '@/types/vacation-integration';
import { NovedadesEnhancedService } from './NovedadesEnhancedService';
import { IncapacityCalculationService } from './IncapacityCalculationService';

export class PayrollIntegratedDataService {
  static async getEmployeePeriodData(
    employeeId: string,
    periodId: string
  ): Promise<DisplayNovedad[]> {
    try {
      console.log('🔍 PayrollIntegratedDataService - Obteniendo datos unificados (solo novedades):', {
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

      const { data: employee } = await supabase
        .from('employees')
        .select('salario_base')
        .eq('id', employeeId)
        .single();

      const employeeSalary = employee?.salario_base || 0;

      const novedadesData = await NovedadesEnhancedService.getNovedadesByEmployee(
        employeeId,
        periodId
      );

      const displayData: DisplayNovedad[] = novedadesData.map(novedad => {
        return convertNovedadToDisplay(novedad);
      });

      // Usar servicio centralizado para estimar valor de incapacidad solo para mostrar en UI
      const enhancedData: DisplayNovedad[] = displayData.map(item => {
        if (item.tipo_novedad === 'incapacidad') {
          const dias = Number(item.dias || 0);
          const valorActual = Number(item.valor || 0);

          if (dias > 0 && valorActual === 0 && employeeSalary > 0) {
            const calculated = IncapacityCalculationService.computeIncapacityValue(
              employeeSalary,
              dias,
              item.subtipo
            );
            if (calculated > 0) {
              console.log('🩺 UI: Valor de incapacidad estimado para mostrar (centralizado):', {
                id: item.id,
                dias,
                subtipo: item.subtipo,
                salario: employeeSalary,
                calculated
              });
              return { ...item, valor: calculated };
            }
          }
        }
        return item;
      });

      const sortedData = enhancedData.sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      console.log('✅ PayrollIntegratedDataService - Datos unificados obtenidos:', {
        totalElementos: sortedData.length,
        novedades: sortedData.filter(item => item.origen === 'novedades').length,
        ausenciasFragmentadas: sortedData.filter(item => item.origen === 'vacaciones').length
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
