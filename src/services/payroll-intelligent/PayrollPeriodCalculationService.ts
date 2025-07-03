
import { PayrollPeriod } from '@/types/payroll';
import { supabase } from '@/integrations/supabase/client';
import { PeriodStrategyFactory, PeriodGenerationStrategy } from './PeriodGenerationStrategy';

export class PayrollPeriodCalculationService {
  /**
   * NUEVA ARQUITECTURA PROFESIONAL - COORDINADOR PRINCIPAL
   * Usa Strategy pattern para eliminar duplicación y asegurar consistencia
   */
  
  static async calculateNextPeriodFromDatabase(periodicity: string, companyId: string): Promise<{
    startDate: string;
    endDate: string;
  }> {
    console.log('📅 CALCULANDO SIGUIENTE PERÍODO CON ARQUITECTURA UNIFICADA:', {
      periodicity,
      companyId
    });

    const strategy = PeriodStrategyFactory.createStrategy(periodicity);
    
    try {
      // Buscar el último período cerrado de la empresa
      const { data: lastPeriod, error } = await supabase
        .from('payroll_periods_real')
        .select('*')
        .eq('company_id', companyId)
        .eq('tipo_periodo', periodicity)
        .neq('estado', 'borrador')
        .order('fecha_fin', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error obteniendo último período:', error);
        return strategy.generateFirstPeriod();
      }

      if (!lastPeriod) {
        console.log('❌ NO HAY PERÍODOS PREVIOS - Generando PRIMER período');
        return strategy.generateFirstPeriod();
      }

      console.log('✅ Último período encontrado:', lastPeriod.fecha_inicio, '-', lastPeriod.fecha_fin);

      // Generar siguiente período usando la estrategia
      const nextPeriod = strategy.generateNextConsecutivePeriod(lastPeriod.fecha_fin);
      
      console.log('✅ Siguiente período generado con arquitectura unificada:', nextPeriod);
      return nextPeriod;

    } catch (error) {
      console.error('Error generando período desde BD:', error);
      return strategy.generateFirstPeriod();
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
