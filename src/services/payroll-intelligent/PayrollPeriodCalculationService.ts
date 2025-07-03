import { PayrollPeriod } from '@/types/payroll';
import { supabase } from '@/integrations/supabase/client';
import { PeriodStrategyFactory, PeriodGenerationStrategy } from './PeriodGenerationStrategy';

export class PayrollPeriodCalculationService {
  /**
   * ARQUITECTURA PROFESIONAL MEJORADA - COORDINADOR PRINCIPAL CON DETECCIÓN DE DATOS CORRUPTOS
   * Usa Strategy pattern y detecta automáticamente períodos con fechas incorrectas
   */
  
  static async calculateNextPeriodFromDatabase(periodicity: string, companyId: string): Promise<{
    startDate: string;
    endDate: string;
  }> {
    console.log('📅 CALCULANDO SIGUIENTE PERÍODO CON DETECCIÓN DE DATOS CORRUPTOS:', {
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

      // NUEVO: Detectar y filtrar períodos con datos corruptos
      const validPeriods = periods.filter(period => {
        const validation = strategy.validateAndCorrectPeriod(period.fecha_inicio, period.fecha_fin);
        if (!validation.isValid) {
          console.warn('⚠️ PERÍODO CORRUPTO DETECTADO:', {
            id: period.id,
            periodo: period.periodo,
            fechas: `${period.fecha_inicio} - ${period.fecha_fin}`,
            problema: validation.message
          });
          return false;
        }
        return true;
      });

      if (validPeriods.length === 0) {
        console.log('❌ TODOS LOS PERÍODOS ESTÁN CORRUPTOS - Generando PRIMER período válido');
        return strategy.generateFirstPeriod();
      }

      const lastValidPeriod = validPeriods[0];
      console.log('✅ Último período VÁLIDO encontrado:', lastValidPeriod.fecha_inicio, '-', lastValidPeriod.fecha_fin);

      // Generar siguiente período usando el último período válido
      const nextPeriod = strategy.generateNextConsecutivePeriod(lastValidPeriod.fecha_fin);
      
      console.log('✅ Siguiente período generado correctamente:', nextPeriod);
      return nextPeriod;

    } catch (error) {
      console.error('Error generando período desde BD:', error);
      return strategy.generateFirstPeriod();
    }
  }

  /**
   * NUEVO: Corrección automática de períodos corruptos
   */
  static async autoCorrectCorruptPeriods(companyId: string, periodicity: string = 'quincenal'): Promise<{
    correctedCount: number;
    errors: string[];
    summary: string;
  }> {
    console.log('🔧 INICIANDO CORRECCIÓN AUTOMÁTICA DE PERÍODOS CORRUPTOS para:', companyId);
    
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

      console.log(`📊 CORRIGIENDO ${periods.length} períodos automáticamente`);

      // Corregir períodos uno por uno manteniendo la secuencia
      for (const period of periods) {
        const validation = strategy.validateAndCorrectPeriod(period.fecha_inicio, period.fecha_fin);
        
        if (!validation.isValid && validation.correctedPeriod) {
          console.log('📝 CORRECCIÓN AUTOMÁTICA:', validation.message);
          
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
            console.log(`✅ Período ${period.id} CORREGIDO: ${period.fecha_inicio}-${period.fecha_fin} → ${validation.correctedPeriod.startDate}-${validation.correctedPeriod.endDate}`);
            correctedCount++;
          }
        }
      }

      const summary = `✅ Corrección automática completada: ${correctedCount} períodos corregidos, ${errors.length} errores`;
      console.log(summary);
      
      return { correctedCount, errors, summary };

    } catch (error) {
      console.error('❌ Error en corrección automática:', error);
      return {
        correctedCount: 0,
        errors: [`Error general: ${error.message}`],
        summary: '❌ Error en corrección automática'
      };
    }
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
    console.log('🔧 INICIANDO CORRECCIÓN MASIVA DE PERÍODOS para empresa:', companyId);
    
    const strategy = PeriodStrategyFactory.createStrategy(periodicity);
    let corrected = 0;
    const errors: string[] = [];

    try {
      // Obtener todos los períodos de la empresa
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

      console.log(`📊 CORRIGIENDO ${periods.length} períodos con arquitectura unificada`);

      for (const period of periods) {
        const validation = strategy.validateAndCorrectPeriod(period.fecha_inicio, period.fecha_fin);
        
        if (!validation.isValid && validation.correctedPeriod) {
          console.log('📝 CORRECCIÓN AUTOMÁTICA:', validation.message);
          
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
            console.log(`✅ Período ${period.id} CORREGIDO AUTOMÁTICAMENTE`);
            corrected++;
          }
        }
      }

      console.log('✅ CORRECCIÓN MASIVA COMPLETADA:', { corrected, errors: errors.length });
      return { corrected, errors };

    } catch (error) {
      console.error('❌ Error en corrección masiva:', error);
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
