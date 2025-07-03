
/**
 * SERVICIO DE MIGRACIÓN Y CORRECCIÓN DE DATOS
 * Limpia y corrige períodos con fechas incorrectas
 */

import { supabase } from '@/integrations/supabase/client';
import { PayrollPeriodCalculationService } from './PayrollPeriodCalculationService';

export class DataMigrationService {
  /**
   * CORRECCIÓN MASIVA DE TODOS LOS PERÍODOS QUINCENALES INCORRECTOS
   */
  static async correctAllBiWeeklyPeriods(companyId: string): Promise<{
    success: boolean;
    corrected: number;
    errors: string[];
    summary: string;
  }> {
    console.log('🔧 INICIANDO CORRECCIÓN MASIVA DE PERÍODOS QUINCENALES para empresa:', companyId);
    
    try {
      const result = await PayrollPeriodCalculationService.correctAllPeriodsForCompany(
        companyId, 
        'quincenal'
      );

      const summary = `✅ Corrección completada: ${result.corrected} períodos corregidos, ${result.errors.length} errores`;
      
      console.log(summary);
      
      return {
        success: result.errors.length === 0,
        corrected: result.corrected,
        errors: result.errors,
        summary
      };
      
    } catch (error) {
      console.error('❌ Error en corrección masiva:', error);
      return {
        success: false,
        corrected: 0,
        errors: [`Error general: ${error.message}`],
        summary: '❌ Error en corrección masiva'
      };
    }
  }

  /**
   * ANÁLISIS DE PERÍODOS INCORRECTOS
   */
  static async analyzeIncorrectPeriods(companyId: string): Promise<{
    total: number;
    incorrect: number;
    details: Array<{
      id: string;
      periodo: string;
      fechas_actuales: string;
      fechas_correctas: string;
      problema: string;
    }>;
  }> {
    console.log('🔍 ANALIZANDO PERÍODOS INCORRECTOS para empresa:', companyId);
    
    try {
      const { data: periods, error } = await supabase
        .from('payroll_periods_real')
        .select('*')
        .eq('company_id', companyId)
        .eq('tipo_periodo', 'quincenal')
        .order('fecha_inicio', { ascending: true });

      if (error) throw error;

      if (!periods || periods.length === 0) {
        return {
          total: 0,
          incorrect: 0,
          details: []
        };
      }

      const details: Array<{
        id: string;
        periodo: string;
        fechas_actuales: string;
        fechas_correctas: string;
        problema: string;
      }> = [];

      let incorrectCount = 0;

      for (const period of periods) {
        const validation = PayrollPeriodCalculationService.validateAndCorrectPeriod(
          'quincenal',
          period.fecha_inicio,
          period.fecha_fin
        );

        if (!validation.isValid && validation.correctedPeriod) {
          incorrectCount++;
          details.push({
            id: period.id,
            periodo: period.periodo,
            fechas_actuales: `${period.fecha_inicio} - ${period.fecha_fin}`,
            fechas_correctas: `${validation.correctedPeriod.startDate} - ${validation.correctedPeriod.endDate}`,
            problema: validation.message
          });
        }
      }

      console.log(`📊 ANÁLISIS COMPLETADO: ${incorrectCount}/${periods.length} períodos incorrectos`);

      return {
        total: periods.length,
        incorrect: incorrectCount,
        details
      };

    } catch (error) {
      console.error('❌ Error analizando períodos:', error);
      return {
        total: 0,
        incorrect: 0,
        details: []
      };
    }
  }

  /**
   * VERIFICACIÓN DE INTEGRIDAD POST-CORRECCIÓN
   */
  static async verifyIntegrityAfterCorrection(companyId: string): Promise<{
    isValid: boolean;
    consecutive: boolean;
    gaps: string[];
    overlaps: string[];
    summary: string;
  }> {
    console.log('🔍 VERIFICANDO INTEGRIDAD POST-CORRECCIÓN para empresa:', companyId);
    
    try {
      const { data: periods, error } = await supabase
        .from('payroll_periods_real')
        .select('*')
        .eq('company_id', companyId)
        .eq('tipo_periodo', 'quincenal')
        .order('fecha_inicio', { ascending: true });

      if (error) throw error;

      if (!periods || periods.length === 0) {
        return {
          isValid: true,
          consecutive: true,
          gaps: [],
          overlaps: [],
          summary: '✅ No hay períodos para verificar'
        };
      }

      const gaps: string[] = [];
      const overlaps: string[] = [];

      // Verificar consecutividad
      for (let i = 1; i < periods.length; i++) {
        const prevEnd = new Date(periods[i - 1].fecha_fin);
        const currStart = new Date(periods[i].fecha_inicio);
        
        const expectedNextDay = new Date(prevEnd);
        expectedNextDay.setDate(prevEnd.getDate() + 1);

        if (currStart.getTime() !== expectedNextDay.getTime()) {
          if (currStart > expectedNextDay) {
            gaps.push(`Gap entre ${periods[i - 1].periodo} y ${periods[i].periodo}`);
          } else {
            overlaps.push(`Overlap entre ${periods[i - 1].periodo} y ${periods[i].periodo}`);
          }
        }
      }

      const isValid = gaps.length === 0 && overlaps.length === 0;
      const consecutive = gaps.length === 0;

      const summary = isValid 
        ? `✅ Integridad verificada: ${periods.length} períodos consecutivos correctos`
        : `⚠️ Problemas detectados: ${gaps.length} gaps, ${overlaps.length} overlaps`;

      console.log(summary);

      return {
        isValid,
        consecutive,
        gaps,
        overlaps,
        summary
      };

    } catch (error) {
      console.error('❌ Error verificando integridad:', error);
      return {
        isValid: false,
        consecutive: false,
        gaps: [],
        overlaps: [],
        summary: '❌ Error verificando integridad'
      };
    }
  }
}
