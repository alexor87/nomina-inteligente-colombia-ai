
import { supabase } from '@/integrations/supabase/client';

export interface SimpleFixResult {
  success: boolean;
  message: string;
  periodsFixed: number;
  periodsCreated: number;
  errors: string[];
}

export class PeriodSimpleFixService {
  
  /**
   * SOLUCIÓN SIMPLE: Un solo método que arregla todo automáticamente
   */
  static async fixAllIssues(companyId: string): Promise<SimpleFixResult> {
    console.log('🔧 ARREGLANDO PERÍODOS AUTOMÁTICAMENTE');
    
    const result: SimpleFixResult = {
      success: false,
      message: '',
      periodsFixed: 0,
      periodsCreated: 0,
      errors: []
    };
    
    try {
      // PASO 1: Limpiar períodos problemáticos
      await this.cleanupBadPeriods(companyId);
      
      // PASO 2: Corregir numeración de períodos existentes
      const fixed = await this.fixExistingPeriods(companyId);
      result.periodsFixed = fixed;
      
      // PASO 3: Crear períodos faltantes estándar
      const created = await this.createMissingPeriods(companyId);
      result.periodsCreated = created;
      
      // PASO 4: Validar que todo esté correcto
      const isValid = await this.validateFinalState(companyId);
      
      result.success = isValid;
      result.message = isValid 
        ? `✅ Sistema arreglado: ${fixed} períodos corregidos, ${created} períodos creados`
        : '❌ Algunos problemas persisten después de la corrección';
        
      console.log('🎉 CORRECCIÓN SIMPLE COMPLETADA:', result);
      return result;
      
    } catch (error) {
      console.error('❌ ERROR EN CORRECCIÓN SIMPLE:', error);
      result.errors.push(error.message);
      result.message = 'Error durante la corrección automática';
      return result;
    }
  }
  
  /**
   * Limpiar períodos problemáticos (cancelados, duplicados, anómalos)
   */
  private static async cleanupBadPeriods(companyId: string): Promise<void> {
    // Eliminar períodos cancelados
    await supabase
      .from('payroll_periods_real')
      .delete()
      .eq('company_id', companyId)
      .eq('estado', 'cancelado');
    
    // Eliminar duplicados manteniendo el más reciente
    const { data: duplicates } = await supabase
      .from('payroll_periods_real')
      .select('*')
      .eq('company_id', companyId)
      .order('periodo, created_at');
    
    if (duplicates) {
      const seen = new Set();
      const toDelete = [];
      
      for (const period of duplicates) {
        if (seen.has(period.periodo)) {
          toDelete.push(period.id);
        } else {
          seen.add(period.periodo);
        }
      }
      
      if (toDelete.length > 0) {
        await supabase
          .from('payroll_periods_real')
          .delete()
          .in('id', toDelete);
      }
    }
  }
  
  /**
   * Corregir numeración de períodos existentes
   */
  private static async fixExistingPeriods(companyId: string): Promise<number> {
    const { data: periods } = await supabase
      .from('payroll_periods_real')
      .select('*')
      .eq('company_id', companyId)
      .eq('tipo_periodo', 'quincenal');
    
    if (!periods) return 0;
    
    let fixed = 0;
    
    for (const period of periods) {
      const correctNumber = this.calculateCorrectNumber(period.fecha_inicio);
      
      if (period.numero_periodo_anual !== correctNumber) {
        await supabase
          .from('payroll_periods_real')
          .update({ numero_periodo_anual: correctNumber })
          .eq('id', period.id);
        
        fixed++;
      }
    }
    
    return fixed;
  }
  
  /**
   * Crear períodos faltantes estándar para 2025
   */
  private static async createMissingPeriods(companyId: string): Promise<number> {
    const { data: existing } = await supabase
      .from('payroll_periods_real')
      .select('numero_periodo_anual')
      .eq('company_id', companyId)
      .eq('tipo_periodo', 'quincenal');
    
    const existingNumbers = new Set(existing?.map(p => p.numero_periodo_anual) || []);
    let created = 0;
    
    // Crear períodos faltantes del 1 al 24
    for (let num = 1; num <= 24; num++) {
      if (!existingNumbers.has(num)) {
        const { startDate, endDate, name } = this.getStandardPeriod(num);
        
        await supabase
          .from('payroll_periods_real')
          .insert({
            company_id: companyId,
            fecha_inicio: startDate,
            fecha_fin: endDate,
            tipo_periodo: 'quincenal',
            numero_periodo_anual: num,
            periodo: name,
            estado: 'borrador',
            empleados_count: 0,
            total_devengado: 0,
            total_deducciones: 0,
            total_neto: 0
          });
        
        created++;
      }
    }
    
    return created;
  }
  
  /**
   * Validar que el estado final sea correcto
   */
  private static async validateFinalState(companyId: string): Promise<boolean> {
    const { data: periods } = await supabase
      .from('payroll_periods_real')
      .select('numero_periodo_anual')
      .eq('company_id', companyId)
      .eq('tipo_periodo', 'quincenal')
      .not('numero_periodo_anual', 'is', null);
    
    if (!periods) return false;
    
    const numbers = periods.map(p => p.numero_periodo_anual).sort((a, b) => a - b);
    
    // Verificar que tengamos exactamente 1-24 sin duplicados
    const expected = Array.from({length: 24}, (_, i) => i + 1);
    
    return numbers.length === 24 && 
           numbers.every((num, i) => num === expected[i]);
  }
  
  /**
   * Calcular número correcto para una fecha
   */
  private static calculateCorrectNumber(startDate: string): number {
    const [year, month, day] = startDate.split('-').map(Number);
    const monthsCompleted = month - 1;
    const biweeklyInMonth = day <= 15 ? 1 : 2;
    return monthsCompleted * 2 + biweeklyInMonth;
  }
  
  /**
   * Obtener datos de período estándar
   */
  private static getStandardPeriod(periodNumber: number): {
    startDate: string;
    endDate: string;
    name: string;
  } {
    const monthNames = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    
    const monthIndex = Math.floor((periodNumber - 1) / 2);
    const isFirstHalf = (periodNumber % 2) === 1;
    
    const startDate = isFirstHalf 
      ? new Date(2025, monthIndex, 1)
      : new Date(2025, monthIndex, 16);
    
    const endDate = isFirstHalf 
      ? new Date(2025, monthIndex, 15)
      : new Date(2025, monthIndex + 1, 0);
    
    const name = isFirstHalf 
      ? `1 - 15 ${monthNames[monthIndex]} 2025`
      : `16 - ${endDate.getDate()} ${monthNames[monthIndex]} 2025`;
    
    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      name
    };
  }
}
