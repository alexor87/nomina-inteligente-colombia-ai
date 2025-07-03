
import { supabase } from '@/integrations/supabase/client';

export class BiWeeklyPeriodService {
  /**
   * LÓGICA PROFESIONAL CORREGIDA - PERÍODOS QUINCENALES CONSECUTIVOS
   * Siempre genera el siguiente período basado en el último período CERRADO de la empresa
   */
  
  static async generateNextConsecutivePeriodFromDatabase(companyId: string): Promise<{
    startDate: string;
    endDate: string;
  }> {
    console.log('🔄 Generando siguiente período quincenal consecutivo desde BD para empresa:', companyId);
    
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
        // Si hay error, generar primer período del mes actual
        return this.generateCurrentBiWeeklyPeriod();
      }

      if (!lastPeriod) {
        console.log('No hay períodos previos, generando primer período quincenal (1-15)');
        return this.generateFirstBiWeeklyPeriod();
      }

      console.log('Último período encontrado:', lastPeriod.fecha_inicio, '-', lastPeriod.fecha_fin);

      // Generar siguiente período consecutivo basado en el último
      const nextPeriod = this.generateNextConsecutivePeriod(lastPeriod.fecha_fin);
      
      console.log('✅ Siguiente período quincenal profesional generado:', nextPeriod);
      return nextPeriod;

    } catch (error) {
      console.error('Error generando período quincenal desde BD:', error);
      return this.generateCurrentBiWeeklyPeriod();
    }
  }

  /**
   * Generar siguiente período consecutivo basado en fecha de fin del anterior
   */
  static generateNextConsecutivePeriod(lastPeriodEndDate: string): {
    startDate: string;
    endDate: string;
  } {
    console.log('🔄 Generando siguiente período quincenal consecutivo desde:', lastPeriodEndDate);
    
    const lastEnd = new Date(lastPeriodEndDate);
    
    // El siguiente período inicia el día después del último
    const nextStart = new Date(lastEnd);
    nextStart.setDate(lastEnd.getDate() + 1);
    
    const day = nextStart.getDate();
    const month = nextStart.getMonth();
    const year = nextStart.getFullYear();
    
    let startDate: Date;
    let endDate: Date;
    
    // APLICAR REGLAS ESTRICTAS PROFESIONALES
    if (day === 1) {
      // Si empieza el 1, es primera quincena (1-15)
      startDate = new Date(year, month, 1);
      endDate = new Date(year, month, 15);
      console.log('✅ Generando primera quincena:', startDate.toISOString().split('T')[0], '-', endDate.toISOString().split('T')[0]);
    } else if (day === 16) {
      // Si empieza el 16, es segunda quincena (16-fin del mes)
      startDate = new Date(year, month, 16);
      endDate = new Date(year, month + 1, 0); // Último día del mes
      console.log('✅ Generando segunda quincena:', startDate.toISOString().split('T')[0], '-', endDate.toISOString().split('T')[0]);
    } else {
      // CORRECCIÓN AUTOMÁTICA para fechas irregulares
      console.log('⚠️ Corrigiendo período irregular. Día de inicio:', day);
      
      if (day <= 15) {
        // Forzar a primera quincena
        startDate = new Date(year, month, 1);
        endDate = new Date(year, month, 15);
        console.log('✅ Corregido a primera quincena:', startDate.toISOString().split('T')[0], '-', endDate.toISOString().split('T')[0]);
      } else {
        // Forzar a segunda quincena
        startDate = new Date(year, month, 16);
        endDate = new Date(year, month + 1, 0);
        console.log('✅ Corregido a segunda quincena:', startDate.toISOString().split('T')[0], '-', endDate.toISOString().split('T')[0]);
      }
    }
    
    const result = {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    };
    
    console.log('✅ Período quincenal consecutivo generado:', result);
    return result;
  }
  
  /**
   * Generar primer período quincenal (1-15 del mes actual)
   */
  static generateFirstBiWeeklyPeriod(): {
    startDate: string;
    endDate: string;
  } {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    
    // Siempre empezar con la primera quincena del mes actual
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month, 15);
    
    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    };
  }
  
  static generateCurrentBiWeeklyPeriod(): {
    startDate: string;
    endDate: string;
  } {
    const today = new Date();
    const day = today.getDate();
    const month = today.getMonth();
    const year = today.getFullYear();
    
    if (day <= 15) {
      // Primera quincena (1-15)
      return {
        startDate: new Date(year, month, 1).toISOString().split('T')[0],
        endDate: new Date(year, month, 15).toISOString().split('T')[0]
      };
    } else {
      // Segunda quincena (16-fin de mes)
      return {
        startDate: new Date(year, month, 16).toISOString().split('T')[0],
        endDate: new Date(year, month + 1, 0).toISOString().split('T')[0]
      };
    }
  }
  
  /**
   * Validar que un período siga las reglas quincenales correctas
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
        message: 'Período válido: Primera quincena (1-15)'
      };
    }
    
    // Validar segunda quincena (16-fin de mes)
    const lastDayOfMonth = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
    if (startDay === 16 && endDay === lastDayOfMonth && sameMonth) {
      return {
        isValid: true,
        message: 'Período válido: Segunda quincena (16-fin de mes)'
      };
    }
    
    // Si no es válido, generar corrección
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
      message: `Período irregular corregido: ${startDate}-${endDate} → ${correctedPeriod.startDate}-${correctedPeriod.endDate}`
    };
  }
  
  /**
   * Normalizar todos los períodos irregulares de una empresa
   */
  static async normalizeAllBiWeeklyPeriods(companyId: string): Promise<void> {
    try {
      console.log('🔄 Normalizando períodos quincenales para empresa:', companyId);
      
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
      
      console.log(`📊 Normalizando ${periods.length} períodos quincenales`);
      
      for (const period of periods) {
        const validation = this.validateBiWeeklyPeriod(period.fecha_inicio, period.fecha_fin);
        
        if (!validation.isValid && validation.correctedPeriod) {
          console.log('📝 Corrigiendo período:', validation.message);
          
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
            console.log(`✅ Período ${period.id} corregido exitosamente`);
          }
        }
      }
      
      console.log('✅ Normalización de períodos quincenales completada');
    } catch (error) {
      console.error('❌ Error normalizando períodos quincenales:', error);
    }
  }
}
