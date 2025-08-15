

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
      console.log('🔍 V21.0 DIAGNOSIS - PayrollIntegratedDataService called:', {
        employeeId,
        periodId,
        timestamp: new Date().toISOString()
      });

      // Obtener información del período
      const { data: period } = await supabase
        .from('payroll_periods_real')
        .select('fecha_inicio, fecha_fin, company_id')
        .eq('id', periodId)
        .single();

      if (!period) {
        console.error('❌ V21.0 DIAGNOSIS - Período no encontrado:', periodId);
        return [];
      }

      // Obtener salario del empleado para cálculos
      const { data: employee } = await supabase
        .from('employees')
        .select('salario_base')
        .eq('id', employeeId)
        .single();

      const employeeSalary = employee?.salario_base || 0;

      // 🔍 DIAGNÓSTICO ESPECÍFICO: Consulta directa a la BD para ver datos RAW
      console.log('🔍 V21.0 DIAGNOSIS - Consultando datos RAW de payroll_novedades...');
      const { data: rawNovedades, error: rawError } = await supabase
        .from('payroll_novedades')
        .select('*')
        .eq('empleado_id', employeeId)
        .eq('periodo_id', periodId);

      console.log('🔍 V21.0 DIAGNOSIS - Datos RAW de BD:', {
        rawNovedades,
        rawError,
        totalRecords: rawNovedades?.length || 0,
        incapacidadesRaw: rawNovedades?.filter(n => n.tipo_novedad === 'incapacidad').map(n => ({
          id: n.id,
          valor_raw: n.valor,
          valor_type: typeof n.valor,
          dias_raw: n.dias,
          dias_type: typeof n.dias,
          subtipo: n.subtipo,
          fecha_inicio: n.fecha_inicio,
          fecha_fin: n.fecha_fin
        }))
      });

      // SOLUCIÓN KISS: Solo obtener datos de payroll_novedades usando el servicio existente
      const novedadesData = await NovedadesEnhancedService.getNovedadesByEmployee(
        employeeId,
        periodId
      );

      console.log('🔍 V21.0 DIAGNOSIS - Datos después del NovedadesEnhancedService:', {
        totalRecords: novedadesData.length,
        incapacidadesProcessed: novedadesData.filter(n => n.tipo_novedad === 'incapacidad').map(n => ({
          id: n.id,
          valor_processed: n.valor,
          valor_type: typeof n.valor,
          dias_processed: n.dias,
          dias_type: typeof n.dias,
          subtipo: n.subtipo,
          fecha_inicio: n.fecha_inicio,
          fecha_fin: n.fecha_fin
        })),
        timestamp: new Date().toISOString()
      });

      // Convertir todas las novedades a formato display
      const displayData: DisplayNovedad[] = novedadesData.map(novedad => {
        // Para ausencias sincronizadas, usar la fragmentación ya aplicada por los triggers
        const converted = convertNovedadToDisplay(novedad);
        
        console.log('🔍 V21.0 DIAGNOSIS - Converting novedad to display:', {
          originalId: novedad.id,
          originalValor: novedad.valor,
          originalValorType: typeof novedad.valor,
          originalDias: novedad.dias,
          originalDiasType: typeof novedad.dias,
          convertedValor: converted.valor,
          convertedValorType: typeof converted.valor,
          convertedDias: converted.dias,
          convertedDiasType: typeof converted.dias,
          tipo_novedad: converted.tipo_novedad
        });
        
        return converted;
      });

      // Ordenar por fecha de creación (más recientes primero)
      const sortedData = displayData.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      console.log('✅ V21.0 DIAGNOSIS - PayrollIntegratedDataService final display data:', {
        totalElementos: sortedData.length,
        novedades: sortedData.filter(item => item.origen === 'novedades').length,
        ausenciasFragmentadas: sortedData.filter(item => item.origen === 'vacaciones').length,
        incapacidadesFinalDisplay: sortedData.filter(item => item.tipo_novedad === 'incapacidad').map(item => ({
          id: item.id,
          valor_final: item.valor,
          valor_final_type: typeof item.valor,
          dias_final: item.dias,
          dias_final_type: typeof item.dias,
          subtipo: item.subtipo
        })),
        timestamp: new Date().toISOString()
      });

      return sortedData;

    } catch (error) {
      console.error('❌ V21.0 DIAGNOSIS - PayrollIntegratedDataService error:', error);
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

