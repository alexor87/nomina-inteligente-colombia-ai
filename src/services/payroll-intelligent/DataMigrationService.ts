/**
 * SERVICIO DE MIGRACIÓN Y CORRECCIÓN DE DATOS MEJORADO
 * Detecta y corrige automáticamente períodos con fechas incorrectas
 */

import { supabase } from '@/integrations/supabase/client';
import { PayrollPeriodCalculationService } from './PayrollPeriodCalculationService';

export class DataMigrationService {
  /**
   * CORRECCIÓN AUTOMÁTICA INTEGRAL - NUEVA VERSIÓN MEJORADA
   */
  static async executeIntegralCorrection(companyId: string): Promise<{
    success: boolean;
    analysis: any;
    correction: any;
    verification: any;
    summary: string;
  }> {
    console.log('🚀 INICIANDO CORRECCIÓN INTEGRAL para empresa:', companyId);
    
    try {
      // FASE 1: Análisis de períodos incorrectos
      console.log('📊 FASE 1: Analizando períodos incorrectos...');
      const analysis = await this.analyzeIncorrectPeriods(companyId);
      
      // FASE 2: Corrección automática
      console.log('🔧 FASE 2: Ejecutando corrección automática...');
      const correction = await PayrollPeriodCalculationService.autoCorrectCorruptPeriods(companyId, 'quincenal');
      
      // FASE 3: Verificación de integridad
      console.log('🔍 FASE 3: Verificando integridad...');
      const verification = await this.verifyIntegrityAfterCorrection(companyId);
      
      const summary = `✅ CORRECCIÓN INTEGRAL COMPLETADA:
      - Períodos analizados: ${analysis.total}
      - Períodos corregidos: ${correction.correctedCount}
      - Estado final: ${verification.isValid ? 'VÁLIDO' : 'REQUIERE ATENCIÓN'}
      - ${verification.summary}`;
      
      console.log(summary);
      
      return {
        success: correction.errors.length === 0 && verification.isValid,
        analysis,
        correction,
        verification,
        summary
      };
      
    } catch (error) {
      console.error('❌ Error en corrección integral:', error);
      return {
        success: false,
        analysis: null,
        correction: null,
        verification: null,
        summary: `❌ Error en corrección integral: ${error.message}`
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

      // Usar la estrategia para validar cada período
      const { PeriodStrategyFactory } = await import('./PeriodGenerationStrategy');
      const strategy = PeriodStrategyFactory.createStrategy('quincenal');

      for (const period of periods) {
        const validation = strategy.validateAndCorrectPeriod(
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
