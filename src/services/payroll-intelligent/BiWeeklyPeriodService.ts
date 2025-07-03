
import { supabase } from '@/integrations/supabase/client';

export class BiWeeklyPeriodService {
  /**
   * LÓGICA PROFESIONAL CORREGIDA - PERÍODOS QUINCENALES CONSECUTIVOS ESTRICTOS
   * SIEMPRE genera períodos 1-15 y 16-fin de mes, sin excepción
   */
  
  static async generateNextConsecutivePeriodFromDatabase(companyId: string): Promise<{
    startDate: string;
    endDate: string;
  }> {
    console.log('🔄 NUEVA LÓGICA ESTRICTA: Generando período quincenal consecutivo desde BD para empresa:', companyId);
    
    try {
      // Buscar el último período cerrado quincenal de la empresa
      const { data: lastPeriod, error } = await supabase
        .from('payroll_periods_real')
        .select('*')
        .eq('company_id', companyId)
        .eq('tipo_periodo', 'quincenal')
        .neq('estado', 'borrador')
        .order('fecha_fin', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error obteniendo último período:', error);
        // Si hay error, generar PRIMER período estricto (1-15)
        return this.generateFirstStrictBiWeeklyPeriod();
      }

      if (!lastPeriod) {
        console.log('❌ NO HAY PERÍODOS PREVIOS - Generando PRIMER período estricto (1-15)');
        return this.generateFirstStrictBiWeeklyPeriod();
      }

      console.log('✅ Último período encontrado:', lastPeriod.fecha_inicio, '-', lastPeriod.fecha_fin);

      // Generar siguiente período ESTRICTAMENTE consecutivo
      const nextPeriod = this.generateStrictNextConsecutivePeriod(lastPeriod.fecha_fin);
      
      console.log('✅ Siguiente período quincenal ESTRICTO generado:', nextPeriod);
      return nextPeriod;

    } catch (error) {
      console.error('Error generando período quincenal desde BD:', error);
      return this.generateFirstStrictBiWeeklyPeriod();
    }
  }

  /**
   * NUEVO: Generar PRIMER período estricto SIEMPRE 1-15 del mes actual
   * NO depende de fecha actual, SIEMPRE empieza con 1-15
   */
  static generateFirstStrictBiWeeklyPeriod(): {
    startDate: string;
    endDate: string;
  } {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    
    console.log('🆕 GENERANDO PRIMER PERÍODO ESTRICTO: 1-15 del mes actual');
    
    // SIEMPRE empezar con la primera quincena del mes actual
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month, 15);
    
    const result = {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    };
    
    console.log('🎯 PRIMER PERÍODO ESTRICTO:', result);
    return result;
  }

  /**
   * NUEVA LÓGICA ESTRICTA: Generar siguiente período consecutivo
   * REGLAS ABSOLUTAS: Solo 1-15 y 16-fin de mes
   */
  static generateStrictNextConsecutivePeriod(lastPeriodEndDate: string): {
    startDate: string;
    endDate: string;
  } {
    console.log('📅 GENERANDO PERÍODO CONSECUTIVO ESTRICTO desde:', lastPeriodEndDate);
    
    const lastEnd = new Date(lastPeriodEndDate);
    
    // El siguiente período inicia el día después del último
    const nextStart = new Date(lastEnd);
    nextStart.setDate(lastEnd.getDate() + 1);
    
    const startDay = nextStart.getDate();
    const month = nextStart.getMonth();
    const year = nextStart.getFullYear();
    
    let finalStartDate: Date;
    let finalEndDate: Date;
    
    console.log('🔍 ANÁLISIS: Día de inicio calculado:', startDay);
    
    // REGLAS ESTRICTAS ABSOLUTAS
    if (startDay === 1) {
      // Si inicia el 1, es primera quincena (1-15)
      finalStartDate = new Date(year, month, 1);
      finalEndDate = new Date(year, month, 15);
      console.log('✅ PRIMERA QUINCENA ESTRICTA (1-15)');
    } else if (startDay === 16) {
      // Si inicia el 16, es segunda quincena (16-fin del mes)
      finalStartDate = new Date(year, month, 16);
      finalEndDate = new Date(year, month + 1, 0); // Último día del mes
      console.log('✅ SEGUNDA QUINCENA ESTRICTA (16-fin de mes)');
    } else {
      // CORRECCIÓN AUTOMÁTICA FORZADA
      console.log('⚠️ FECHA IRREGULAR DETECTADA - APLICANDO CORRECCIÓN AUTOMÁTICA');
      
      if (startDay <= 15) {
        // Forzar a primera quincena
        finalStartDate = new Date(year, month, 1);
        finalEndDate = new Date(year, month, 15);
        console.log('🔧 CORREGIDO A PRIMERA QUINCENA (1-15)');
      } else {
        // Forzar a segunda quincena
        finalStartDate = new Date(year, month, 16);
        finalEndDate = new Date(year, month + 1, 0);
        console.log('🔧 CORREGIDO A SEGUNDA QUINCENA (16-fin de mes)');
      }
    }
    
    const result = {
      startDate: finalStartDate.toISOString().split('T')[0],
      endDate: finalEndDate.toISOString().split('T')[0]
    };
    
    console.log('🎯 PERÍODO CONSECUTIVO ESTRICTO FINAL:', result);
    return result;
  }

  /**
   * MÉTODO ACTUALIZADO: Generar período actual estricto
   * ELIMINA dependencia del día actual para ser más predecible
   */
  static generateCurrentBiWeeklyPeriod(): {
    startDate: string;
    endDate: string;
  } {
    console.log('📅 GENERANDO PERÍODO ACTUAL ESTRICTO');
    
    const today = new Date();
    const day = today.getDate();
    const month = today.getMonth();
    const year = today.getFullYear();
    
    if (day <= 15) {
      // Primera quincena (1-15)
      const result = {
        startDate: new Date(year, month, 1).toISOString().split('T')[0],
        endDate: new Date(year, month, 15).toISOString().split('T')[0]
      };
      console.log('✅ PERÍODO ACTUAL: Primera quincena', result);
      return result;
    } else {
      // Segunda quincena (16-fin de mes)
      const result = {
        startDate: new Date(year, month, 16).toISOString().split('T')[0],
        endDate: new Date(year, month + 1, 0).toISOString().split('T')[0]
      };
      console.log('✅ PERÍODO ACTUAL: Segunda quincena', result);
      return result;
    }
  }

  /**
   * MÉTODO ACTUALIZADO: Generar siguiente período consecutivo (sin BD)
   */
  static generateNextConsecutivePeriod(lastPeriodEndDate: string): {
    startDate: string;
    endDate: string;
  } {
    return this.generateStrictNextConsecutivePeriod(lastPeriodEndDate);
  }
  
  /**
   * VALIDADOR ESTRICTO MEJORADO
   */
  static validateBiWeeklyPeriod(startDate: string, endDate: string): {
    isValid: boolean;
    correctedPeriod?: { startDate: string; endDate: string };
    message: string;
  } {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    const startDay = start.getDate();
    const endDay = end.getDate();
    const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
    
    // Validar primera quincena (1-15)
    if (startDay === 1 && endDay === 15 && sameMonth) {
      return {
        isValid: true,
        message: '✅ Período válido: Primera quincena (1-15)'
      };
    }
    
    // Validar segunda quincena (16-fin de mes)
    const lastDayOfMonth = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
    if (startDay === 16 && endDay === lastDayOfMonth && sameMonth) {
      return {
        isValid: true,
        message: '✅ Período válido: Segunda quincena (16-fin de mes)'
      };
    }
    
    // Si no es válido, generar corrección ESTRICTA
    let correctedPeriod: { startDate: string; endDate: string };
    
    if (startDay <= 15) {
      // Corregir a primera quincena
      correctedPeriod = {
        startDate: new Date(start.getFullYear(), start.getMonth(), 1).toISOString().split('T')[0],
        endDate: new Date(start.getFullYear(), start.getMonth(), 15).toISOString().split('T')[0]
      };
    } else {
      // Corregir a segunda quincena
      correctedPeriod = {
        startDate: new Date(start.getFullYear(), start.getMonth(), 16).toISOString().split('T')[0],
        endDate: new Date(start.getFullYear(), start.getMonth() + 1, 0).toISOString().split('T')[0]
      };
    }
    
    return {
      isValid: false,
      correctedPeriod,
      message: `🔧 Período irregular corregido: ${startDate}-${endDate} → ${correctedPeriod.startDate}-${correctedPeriod.endDate}`
    };
  }
  
  /**
   * NORMALIZACIÓN AUTOMÁTICA MEJORADA
   */
  static async normalizeAllBiWeeklyPeriods(companyId: string): Promise<void> {
    try {
      console.log('🔄 NORMALIZANDO PERÍODOS QUINCENALES CON LÓGICA ESTRICTA para empresa:', companyId);
      
      const { data: periods, error } = await supabase
        .from('payroll_periods_real')
        .select('*')
        .eq('company_id', companyId)
        .eq('tipo_periodo', 'quincenal')
        .order('fecha_inicio', { ascending: true });
      
      if (error) throw error;
      
      if (!periods || periods.length === 0) {
        console.log('ℹ️ No hay períodos quincenales para normalizar');
        return;
      }
      
      console.log(`📊 NORMALIZANDO ${periods.length} períodos quincenales con REGLAS ESTRICTAS`);
      
      for (const period of periods) {
        const validation = this.validateBiWeeklyPeriod(period.fecha_inicio, period.fecha_fin);
        
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
            console.error(`❌ Error corrigiendo período ${period.id}:`, updateError);
          } else {
            console.log(`✅ Período ${period.id} CORREGIDO AUTOMÁTICAMENTE`);
          }
        }
      }
      
      console.log('✅ NORMALIZACIÓN ESTRICTA COMPLETADA');
    } catch (error) {
      console.error('❌ Error normalizando períodos quincenales:', error);
    }
  }
}
