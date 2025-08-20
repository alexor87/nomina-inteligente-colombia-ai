
import { supabase } from '@/integrations/supabase/client';
import { DisplayNovedad, convertNovedadToDisplay } from '@/types/vacation-integration';
import { NovedadesEnhancedService } from './NovedadesEnhancedService';
import { NovedadesCalculationService } from './NovedadesCalculationService';

export class PayrollIntegratedDataService {
  static async getEmployeePeriodData(
    employeeId: string,
    periodId: string
  ): Promise<DisplayNovedad[]> {
    try {
      console.log('🔍 PayrollIntegratedDataService - PROFESSIONAL: Obteniendo datos unificados con valores normativos:', {
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

      // ✅ PROFESSIONAL: Obtener novedades y breakdown del backend
      const [novedadesData, breakdown] = await Promise.all([
        NovedadesEnhancedService.getNovedadesByEmployee(employeeId, periodId),
        NovedadesCalculationService.getEmployeeNovedadesBreakdown(employeeId, periodId)
      ]);

      // ✅ PROFESSIONAL: Crear un mapa de valores calculados por el backend
      const calculatedValuesMap = new Map();
      breakdown.forEach((item: any) => {
        const key = `${item.tipo_novedad}_${item.subtipo || 'default'}`;
        calculatedValuesMap.set(key, {
          valorCalculado: item.valorCalculado,
          valorOriginal: item.valorOriginal,
          detalleCalculo: item.detalleCalculo
        });
      });

      // ✅ PROFESSIONAL: Convertir novedades usando valores calculados del backend
      const displayData: DisplayNovedad[] = novedadesData.map(novedad => {
        const key = `${novedad.tipo_novedad}_${novedad.subtipo || 'default'}`;
        const calculatedInfo = calculatedValuesMap.get(key);
        
        // Si tenemos valor calculado del backend, usarlo; sino, usar el valor de DB
        const displayNovedad = convertNovedadToDisplay(novedad);
        
        if (calculatedInfo && calculatedInfo.valorCalculado !== undefined) {
          console.log('🔄 Using backend calculated value:', {
            tipo: novedad.tipo_novedad,
            subtipo: novedad.subtipo,
            valorOriginal: calculatedInfo.valorOriginal,
            valorCalculado: calculatedInfo.valorCalculado,
            detalleCalculo: calculatedInfo.detalleCalculo
          });
          
          // Usar el valor calculado normativamente por el backend
          displayNovedad.valor = calculatedInfo.valorCalculado;
          displayNovedad.valorOriginal = calculatedInfo.valorOriginal;
          displayNovedad.observacion = `${displayNovedad.observacion || ''} | ${calculatedInfo.detalleCalculo || ''}`.trim();
        }
        
        return displayNovedad;
      });

      const sortedData = displayData.sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      console.log('✅ PayrollIntegratedDataService - PROFESSIONAL: Datos unificados con valores normativos:', {
        totalElementos: sortedData.length,
        novedades: sortedData.filter(item => item.origen === 'novedades').length,
        valoresCalculados: breakdown.length
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
