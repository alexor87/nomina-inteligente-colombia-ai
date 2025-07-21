
import { supabase } from '@/integrations/supabase/client';
import { DisplayNovedad, convertVacationToDisplay, convertNovedadToDisplay } from '@/types/vacation-integration';
import { NovedadesEnhancedService } from './NovedadesEnhancedService';

export class PayrollIntegratedDataService {
  /**
   * Obtiene datos integrados de novedades y ausencias para un empleado en un período específico
   * Aplica fragmentación inteligente para ausencias multi-período
   */
  static async getEmployeePeriodData(
    employeeId: string,
    periodId: string
  ): Promise<DisplayNovedad[]> {
    try {
      console.log('🔍 PayrollIntegratedDataService - Obteniendo datos integrados:', {
        employeeId,
        periodId
      });

      // Obtener información del período
      const { data: period } = await supabase
        .from('payroll_periods_real')
        .select('fecha_inicio, fecha_fin, company_id')
        .eq('id', periodId)
        .single();

      if (!period) {
        console.error('❌ Período no encontrado:', periodId);
        return [];
      }

      // Obtener salario del empleado para cálculos
      const { data: employee } = await supabase
        .from('employees')
        .select('salario_base')
        .eq('id', employeeId)
        .single();

      const employeeSalary = employee?.salario_base || 0;

      // 1. Obtener novedades directas del período
      const novedadesDirectas = await NovedadesEnhancedService.getNovedadesByEmployee(
        employeeId,
        periodId
      );

      // 2. Obtener ausencias que intersectan con el período
      const { data: intersectingVacations } = await supabase
        .from('employee_vacation_periods')
        .select('*')
        .eq('employee_id', employeeId)
        .eq('company_id', period.company_id)
        .lte('start_date', period.fecha_fin)    // Comienza antes o durante el período
        .gte('end_date', period.fecha_inicio);   // Termina después o durante el período

      // 3. Convertir novedades directas
      const displayNovedades: DisplayNovedad[] = novedadesDirectas.map(novedad => 
        convertNovedadToDisplay(novedad)
      );

      // 4. Convertir ausencias intersectantes con fragmentación
      const displayVacations: DisplayNovedad[] = (intersectingVacations || []).map(vacation => 
        convertVacationToDisplay(
          vacation,
          employeeSalary,
          period.fecha_inicio,
          period.fecha_fin
        )
      );

      // 5. Combinar y ordenar por fecha de creación
      const allData = [...displayNovedades, ...displayVacations]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      console.log('✅ PayrollIntegratedDataService - Datos integrados obtenidos:', {
        novedadesDirectas: displayNovedades.length,
        ausenciasFragmentadas: displayVacations.length,
        totalElementos: allData.length
      });

      return allData;

    } catch (error) {
      console.error('❌ PayrollIntegratedDataService - Error obteniendo datos integrados:', error);
      return [];
    }
  }

  /**
   * Calcular días de intersección entre una ausencia y un período
   * Reutiliza la lógica del VacationPayrollIntegrationService
   */
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

    // Calcular la intersección
    const intersectionStart = new Date(Math.max(vacStartDate.getTime(), perStartDate.getTime()));
    const intersectionEnd = new Date(Math.min(vacEndDate.getTime(), perEndDate.getTime()));

    // Si no hay intersección, retornar 0
    if (intersectionStart > intersectionEnd) {
      return 0;
    }

    // Calcular días de intersección (inclusive)
    const diffTime = intersectionEnd.getTime() - intersectionStart.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    return Math.max(0, diffDays);
  }
}
