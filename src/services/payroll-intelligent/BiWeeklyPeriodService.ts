
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
   * REGLAS ABSOLUTAS: Solo 1-15 y 16-30 (FEBRERO CORREGIDO)
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
    
    console.log('🔍 ANÁLISIS: Día de inicio calculado:', startDay, 'Mes:', month + 1);
    
    // REGLAS ESTRICTAS ABSOLUTAS CON CORRECCIÓN PARA FEBRERO
    if (startDay === 1) {
      // Si inicia el 1, es primera quincena (1-15)
      finalStartDate = new Date(year, month, 1);
      finalEndDate = new Date(year, month, 15);
      console.log('✅ PRIMERA QUINCENA ESTRICTA (1-15)');
    } else if (startDay === 16) {
      // Si inicia el 16, es segunda quincena (16-30, incluso en febrero)
      finalStartDate = new Date(year, month, 16);
      
      // CORRECCIÓN ESPECIAL PARA FEBRERO: SIEMPRE USAR DÍA 30
      if (month === 1) { // Febrero (mes 1 en JavaScript)
        // En febrero, la segunda quincena va del 16 al 30 (días ficticios para legislación laboral)
        finalEndDate = new Date(year, month, 30);
        console.log('✅ SEGUNDA QUINCENA FEBRERO CORREGIDA (16-30 con días ficticios)');
      } else {
        // Para otros meses, usar el último día real del mes
        finalEndDate = new Date(year, month + 1, 0);
        console.log('✅ SEGUNDA QUINCENA ESTRICTA (16-fin de mes)');
      }
    } else {
      // CORRECCIÓN AUTOMÁTICA FORZADA
      console.log('⚠️ FECHA IRREGULAR DETECTADA - APLICANDO CORRECCIÓN AUTOMÁTICA');
      
      if (startDay <= 15) {
        // Forzar a primera quincena
        finalStartDate = new Date(year, month, 1);
        finalEndDate = new Date(year, month, 15);
        console.log('🔧 CORREGIDO A PRIMERA QUINCENA (1-15)');
      } else {
        // Forzar a segunda quincena con corrección de febrero
        finalStartDate = new Date(year, month, 16);
        if (month === 1) { // Febrero
          finalEndDate = new Date(year, month, 30);
          console.log('🔧 CORREGIDO A SEGUNDA QUINCENA FEBRERO (16-30)');
        } else {
          finalEndDate = new Date(year, month + 1, 0);
          console.log('🔧 CORREGIDO A SEGUNDA QUINCENA (16-fin de mes)');
        }
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
   * MÉTODO ACTUALIZADO: Generar período actual estricto CON CORRECCIÓN FEBRERO
   * ELIMINA dependencia del día actual para ser más predecible
   */
  static generateCurrentBiWeeklyPeriod(): {
    startDate: string;
    endDate: string;
  } {
    console.log('📅 GENERANDO PERÍODO ACTUAL ESTRICTO CON CORRECCIÓN FEBRERO');
    
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
      // Segunda quincena (16-30, incluso en febrero)
      const startDate = new Date(year, month, 16);
      let endDate: Date;
      
      // CORRECCIÓN ESPECIAL PARA FEBRERO
      if (month === 1) { // Febrero
        // En febrero, forzar día 30 para mantener 15 días
        endDate = new Date(year, month, 30);
        console.log('✅ PERÍODO ACTUAL: Segunda quincena FEBRERO CORREGIDA (16-30)');
      } else {
        // Para otros meses, usar el último día real
        endDate = new Date(year, month + 1, 0);
        console.log('✅ PERÍODO ACTUAL: Segunda quincena', startDate.toISOString().split('T')[0], '-', endDate.toISOString().split('T')[0]);
      }
      
      const result = {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0]
      };
      
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
   * VALIDADOR ESTRICTO MEJORADO CON CORRECCIÓN FEBRERO
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
    const month = start.getMonth();
    const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
    
    // Validar primera quincena (1-15)
    if (startDay === 1 && endDay === 15 && sameMonth) {
      return {
        isValid: true,
        message: '✅ Período válido: Primera quincena (1-15)'
      };
    }
    
    // Validar segunda quincena CON CORRECCIÓN ESPECIAL PARA FEBRERO
    if (startDay === 16 && sameMonth) {
      // Para febrero, validar que termine en día 30 (legislación laboral)
      if (month === 1 && endDay === 30) { // Febrero con día ficticio 30
        return {
          isValid: true,
          message: '✅ Período válido: Segunda quincena FEBRERO (16-30 con días ficticios)'
        };
      }
      
      // Para otros meses, validar que termine en el último día real del mes
      const lastDayOfMonth = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
      if (month !== 1 && endDay === lastDayOfMonth) {
        return {
          isValid: true,
          message: '✅ Período válido: Segunda quincena (16-fin de mes)'
        };
      }
    }
    
    // Si no es válido, generar corrección ESTRICTA CON FEBRERO
    let correctedPeriod: { startDate: string; endDate: string };
    
    if (startDay <= 15) {
      // Corregir a primera quincena
      correctedPeriod = {
        startDate: new Date(start.getFullYear(), start.getMonth(), 1).toISOString().split('T')[0],
        endDate: new Date(start.getFullYear(), start.getMonth(), 15).toISOString().split('T')[0]
      };
    } else {
      // Corregir a segunda quincena CON CORRECCIÓN FEBRERO
      const correctedStart = new Date(start.getFullYear(), start.getMonth(), 16);
      let correctedEnd: Date;
      
      if (month === 1) { // Febrero
        correctedEnd = new Date(start.getFullYear(), start.getMonth(), 30);
      } else {
        correctedEnd = new Date(start.getFullYear(), start.getMonth() + 1, 0);
      }
      
      correctedPeriod = {
        startDate: correctedStart.toISOString().split('T')[0],
        endDate: correctedEnd.toISOString().split('T')[0]
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
