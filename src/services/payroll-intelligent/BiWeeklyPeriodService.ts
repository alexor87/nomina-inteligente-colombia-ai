
import { supabase } from '@/integrations/supabase/client';

export class BiWeeklyPeriodService {
  /**
   * LÓGICA PROFESIONAL PARA PERÍODOS QUINCENALES CONSECUTIVOS
   * Reglas estrictas: 1-15 y 16-fin de mes (incluyendo febrero)
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
    
    // APLICAR REGLAS ESTRICTAS DE PERÍODOS QUINCENALES
    if (day === 1) {
      // Primera quincena (1-15)
      startDate = new Date(year, month, 1);
      endDate = new Date(year, month, 15);
    } else if (day === 16) {
      // Segunda quincena (16-fin de mes)
      startDate = new Date(year, month, 16);
      endDate = new Date(year, month + 1, 0); // Último día del mes
    } else {
      // CORRECCIÓN AUTOMÁTICA para fechas irregulares
      console.log('⚠️ Corrigiendo período irregular. Día:', day);
      
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
    
    console.log('✅ Período quincenal generado correctamente:', result);
    return result;
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
