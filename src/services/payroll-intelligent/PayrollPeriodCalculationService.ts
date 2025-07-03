import { PayrollPeriod } from '@/types/payroll';
import { supabase } from '@/integrations/supabase/client';
import { PeriodStrategyFactory, PeriodGenerationStrategy } from './PeriodGenerationStrategy';

export class PayrollPeriodCalculationService {
  /**
   * COORDINADOR CORREGIDO - NO MODIFICA PERÍODOS VÁLIDOS
   */
  
  static async calculateNextPeriodFromDatabase(periodicity: string, companyId: string): Promise<{
    startDate: string;
    endDate: string;
  }> {
    console.log('📅 CALCULANDO SIGUIENTE PERÍODO CONSERVADOR:', {
      periodicity,
      companyId
    });

    const strategy = PeriodStrategyFactory.createStrategy(periodicity);
    
    try {
      // Buscar períodos cerrados ordenados por fecha
      const { data: periods, error } = await supabase
        .from('payroll_periods_real')
        .select('*')
        .eq('company_id', companyId)
        .eq('tipo_periodo', periodicity)
        .neq('estado', 'borrador')
        .order('fecha_fin', { ascending: false });

      if (error) {
        console.error('Error obteniendo períodos:', error);
        return strategy.generateFirstPeriod();
      }

      if (!periods || periods.length === 0) {
        console.log('❌ NO HAY PERÍODOS PREVIOS - Generando PRIMER período');
        return strategy.generateFirstPeriod();
      }

      // CORREGIDO: No hacer correcciones automáticas, solo usar el último período válido
      const lastPeriod = periods[0];
      console.log('✅ Último período encontrado:', lastPeriod.fecha_inicio, '-', lastPeriod.fecha_fin);

      // Generar siguiente período basado en el último período encontrado
      const nextPeriod = strategy.generateNextConsecutivePeriod(lastPeriod.fecha_fin);
      
      console.log('✅ Siguiente período generado:', nextPeriod);
      return nextPeriod;

    } catch (error) {
      console.error('Error generando período desde BD:', error);
      return strategy.generateFirstPeriod();
    }
  }

  /**
   * CORREGIDO: Corrección SOLO de períodos críticos
   */
  static async autoCorrectCorruptPeriods(companyId: string, periodicity: string = 'quincenal'): Promise<{
    correctedCount: number;
    errors: string[];
    summary: string;
  }> {
    console.log('🔧 CORRECCIÓN CRÍTICA ÚNICAMENTE para:', companyId);
    
    const strategy = PeriodStrategyFactory.createStrategy(periodicity);
    let correctedCount = 0;
    const errors: string[] = [];

    try {
      const { data: periods, error } = await supabase
        .from('payroll_periods_real')
        .select('*')
        .eq('company_id', companyId)
        .eq('tipo_periodo', periodicity)
        .order('fecha_inicio', { ascending: true });

      if (error) throw error;

      if (!periods || periods.length === 0) {
        return { correctedCount: 0, errors: [], summary: 'No hay períodos para corregir' };
      }

      console.log(`📊 ANALIZANDO ${periods.length} períodos (solo errores críticos)`);

      for (const period of periods) {
        const validation = strategy.validateAndCorrectPeriod(period.fecha_inicio, period.fecha_fin);
        
        // CORREGIDO: Solo corregir si es crítico Y tiene corrección sugerida
        if (!validation.isValid && validation.correctedPeriod && this.isCriticalError(validation.message)) {
          console.log('🚨 ERROR CRÍTICO DETECTADO:', validation.message);
          
          const { error: updateError } = await supabase
            .from('payroll_periods_real')
            .update({
              fecha_inicio: validation.correctedPeriod.startDate,
              fecha_fin: validation.correctedPeriod.endDate,
              updated_at: new Date().toISOString()
            })
            .eq('id', period.id);

          if (updateError) {
            const errorMsg = `Error corrigiendo período ${period.id}: ${updateError.message}`;
            console.error('❌', errorMsg);
            errors.push(errorMsg);
          } else {
            console.log(`✅ ERROR CRÍTICO CORREGIDO: ${period.id}`);
            correctedCount++;
          }
        } else if (!validation.isValid) {
          console.log(`ℹ️ Período ${period.id} irregular pero no crítico - NO se modifica`);
        }
      }

      const summary = `✅ Corrección crítica completada: ${correctedCount} períodos corregidos, ${errors.length} errores`;
      console.log(summary);
      
      return { correctedCount, errors, summary };

    } catch (error) {
      console.error('❌ Error en corrección crítica:', error);
      return {
        correctedCount: 0,
        errors: [`Error general: ${error.message}`],
        summary: '❌ Error en corrección crítica'
      };
    }
  }

  /**
   * CORREGIDO: Determinar si un error es crítico
   */
  private static isCriticalError(message: string): boolean {
    const criticalKeywords = [
      'crítico detectado',
      'fecha de fin anterior a fecha de inicio',
      'período de duración cero',
      'fechas nulas o inválidas',
      'superposición crítica'
    ];

    const isCritical = criticalKeywords.some(keyword => 
      message.toLowerCase().includes(keyword.toLowerCase())
    );
    
    console.log(`🔍 ¿Es crítico? "${message}" → ${isCritical}`);
    return isCritical;
  }

  /**
   * MÉTODO DE RESPALDO UNIFICADO
   */
  static calculateNextPeriod(periodicity: string, closedPeriod: PayrollPeriod): {
    startDate: string;
    endDate: string;
  } {
    console.log('📅 CALCULANDO SIGUIENTE PERÍODO BASADO EN PERÍODO CERRADO:', {
      periodicity,
      closedPeriodEnd: closedPeriod.fecha_fin
    });

    const strategy = PeriodStrategyFactory.createStrategy(periodicity);
    return strategy.generateNextConsecutivePeriod(closedPeriod.fecha_fin);
  }

  /**
   * VALIDACIÓN Y CORRECCIÓN AUTOMÁTICA
   */
  static validateAndCorrectPeriod(
    periodicity: string, 
    startDate: string, 
    endDate: string
  ): {
    isValid: boolean;
    correctedPeriod?: { startDate: string; endDate: string };
    message: string;
  } {
    const strategy = PeriodStrategyFactory.createStrategy(periodicity);
    return strategy.validateAndCorrectPeriod(startDate, endDate);
  }

  /**
   * CORRECCIÓN MASIVA DE PERÍODOS EXISTENTES
   */
  static async correctAllPeriodsForCompany(companyId: string, periodicity: string): Promise<{
    corrected: number;
    errors: string[];
  }> {
    console.log('🔧 CORRECCIÓN CONSERVADORA para empresa:', companyId);
    
    const strategy = PeriodStrategyFactory.createStrategy(periodicity);
    let corrected = 0;
    const errors: string[] = [];

    try {
      const { data: periods, error } = await supabase
        .from('payroll_periods_real')
        .select('*')
        .eq('company_id', companyId)
        .eq('tipo_periodo', periodicity)
        .order('fecha_inicio', { ascending: true });

      if (error) throw error;

      if (!periods || periods.length === 0) {
        console.log('ℹ️ No hay períodos para corregir');
        return { corrected: 0, errors: [] };
      }

      console.log(`📊 REVISANDO ${periods.length} períodos conservadoramente`);

      for (const period of periods) {
        const validation = strategy.validateAndCorrectPeriod(period.fecha_inicio, period.fecha_fin);
        
        // Solo corregir errores críticos
        if (!validation.isValid && validation.correctedPeriod && this.isCriticalError(validation.message)) {
          console.log('🚨 CORRECCIÓN CRÍTICA:', validation.message);
          
          const { error: updateError } = await supabase
            .from('payroll_periods_real')
            .update({
              fecha_inicio: validation.correctedPeriod.startDate,
              fecha_fin: validation.correctedPeriod.endDate,
              updated_at: new Date().toISOString()
            })
            .eq('id', period.id);

          if (updateError) {
            const errorMsg = `Error corrigiendo período ${period.id}: ${updateError.message}`;
            console.error('❌', errorMsg);
            errors.push(errorMsg);
          } else {
            console.log(`✅ Período ${period.id} CORREGIDO CRÍTICAMENTE`);
            corrected++;
          }
        }
      }

      console.log('✅ CORRECCIÓN CONSERVADORA COMPLETADA:', { corrected, errors: errors.length });
      return { corrected, errors };

    } catch (error) {
      console.error('❌ Error en corrección conservadora:', error);
      errors.push(`Error general: ${error.message}`);
      return { corrected, errors };
    }
  }

  // Validar que las fechas calculadas no se superpongan con períodos existentes
  static validateNonOverlapping(startDate: string, endDate: string, existingPeriods: PayrollPeriod[]): {
    isValid: boolean;
    conflictPeriod?: PayrollPeriod;
  } {
    const newStart = new Date(startDate).getTime();
    const newEnd = new Date(endDate).getTime();

    for (const period of existingPeriods) {
      const periodStart = new Date(period.fecha_inicio).getTime();
      const periodEnd = new Date(period.fecha_fin).getTime();
      
      // Verificar superposición
      const overlaps = newStart <= periodEnd && newEnd >= periodStart;
      
      if (overlaps) {
        console.warn('⚠️ SUPERPOSICIÓN DETECTADA con período:', period);
        return { isValid: false, conflictPeriod: period };
      }
    }

    return { isValid: true };
  }
}
