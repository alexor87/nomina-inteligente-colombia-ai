
import { supabase } from '@/integrations/supabase/client';
import { DisplayNovedad, convertNovedadToDisplay } from '@/types/vacation-integration';
import { NovedadesEnhancedService } from './NovedadesEnhancedService';

export class PayrollIntegratedDataService {
  /**
   * Obtiene datos integrados de novedades para un empleado en un período específico
   * SOLUCIÓN KISS: Solo usar payroll_novedades como fuente única de verdad
   * Los triggers ya manejan la fragmentación correcta de ausencias multi-período
   */
  static async getEmployeePeriodData(
    employeeId: string,
    periodId: string
  ): Promise<DisplayNovedad[]> {
    try {
      console.log('🔍 PayrollIntegratedDataService - Obteniendo datos unificados (solo novedades):', {
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

      // SOLUCIÓN KISS: Solo obtener datos de payroll_novedades
      // Los triggers ya fragmentan correctamente las ausencias multi-período
      const novedadesData = await NovedadesEnhancedService.getNovedadesByEmployee(
        employeeId,
        periodId
      );

      // Convertir todas las novedades a formato display
      const displayData: DisplayNovedad[] = novedadesData.map(novedad => {
        // Para ausencias sincronizadas, usar la fragmentación ya aplicada por los triggers
        return convertNovedadToDisplay(novedad);
      });

      // ✅ Helpers locales para calcular y normalizar incapacidades solo para mostrar
      const normalizeIncapacitySubtype = (subtipo?: string): 'general' | 'laboral' | undefined => {
        if (!subtipo) return undefined;
        const s = subtipo.toLowerCase().trim();
        if (['comun', 'común', 'enfermedad_general', 'eg', 'general'].includes(s)) return 'general';
        if (['laboral', 'arl', 'accidente_laboral', 'riesgo_laboral', 'at'].includes(s)) return 'laboral';
        return undefined;
      };

      const computeIncapacityValue = (salary: number, days: number, subtipo?: string): number => {
        if (!salary || !days) return 0;
        const dailySalary = Number(salary) / 30;
        const s = normalizeIncapacitySubtype(subtipo) || 'general';

        if (s === 'laboral') {
          const value = dailySalary * days; // 100% desde día 1
          return Math.round(value);
        }

        // 'general' por defecto: 1-2 días 100%, 3+ al 66.67%
        if (days <= 2) {
          return Math.round(dailySalary * days);
        } else {
          const first2 = dailySalary * 2;
          const rest = dailySalary * (days - 2) * 0.6667;
          return Math.round(first2 + rest);
        }
      };

      // ✅ Calcular valor estimado para mostrar si una incapacidad viene con valor 0
      const enhancedData: DisplayNovedad[] = displayData.map(item => {
        if (item.tipo_novedad === 'incapacidad') {
          const dias = Number(item.dias || 0);
          const valorActual = Number(item.valor || 0);

          if (dias > 0 && valorActual === 0 && employeeSalary > 0) {
            const calculated = computeIncapacityValue(employeeSalary, dias, item.subtipo);
            if (calculated > 0) {
              console.log('🩺 UI: Valor de incapacidad estimado para mostrar:', {
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

      // Ordenar por fecha de creación (más recientes primero)
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

  /**
   * Calcular días de intersección entre una ausencia y un período
   * Mantener método para compatibilidad (aunque ya no se usa para fragmentación)
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
