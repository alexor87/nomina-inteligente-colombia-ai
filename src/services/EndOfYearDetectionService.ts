import { ConfigurationService } from './ConfigurationService';
import { supabase } from '@/integrations/supabase/client';

export interface EndOfYearSituation {
  needsNewYear: boolean;
  currentYear: number;
  nextYear: number;
  lastLiquidatedPeriod: {
    name: string;
    endDate: string;
    isDecember: boolean;
  } | null;
  hasNextYearConfig: boolean;
  hasNextYearPeriods: boolean;
  suggestedAction: 'create_year' | 'none';
}

export class EndOfYearDetectionService {
  /**
   * Detecta si estamos en una situación de fin de año que requiere
   * creación de configuración para el próximo año
   */
  static async detectEndOfYearSituation(companyId: string): Promise<EndOfYearSituation> {
    try {
      console.log('🔍 Detectando situación de fin de año...');
      
      const currentYear = new Date().getFullYear();
      const nextYear = currentYear + 1;
      
      // 1. Obtener el último período liquidado de la empresa
      const { data: lastLiquidatedPeriod } = await supabase
        .from('payroll_periods_real')
        .select('*')
        .eq('company_id', companyId)
        .eq('estado', 'cerrado')
        .order('fecha_fin', { ascending: false })
        .limit(1)
        .single();
      
      console.log('📅 Último período liquidado:', lastLiquidatedPeriod);
      
      // 2. Verificar si es diciembre
      const isDecemberLiquidated = lastLiquidatedPeriod ? 
        new Date(lastLiquidatedPeriod.fecha_fin).getMonth() === 11 : false;
      
      // 3. Verificar si ya existe configuración para el próximo año
      const availableYears = await ConfigurationService.getAvailableYearsAsync();
      const hasNextYearConfig = availableYears.includes(nextYear.toString());
      
      // 4. Verificar si ya existen períodos del próximo año
      const { data: nextYearPeriods } = await supabase
        .from('payroll_periods_real')
        .select('id')
        .eq('company_id', companyId)
        .gte('fecha_inicio', `${nextYear}-01-01`)
        .lt('fecha_inicio', `${nextYear + 1}-01-01`)
        .limit(1);
      
      const hasNextYearPeriods = (nextYearPeriods?.length || 0) > 0;
      
      // 5. Determinar si necesita crear nuevo año
      const needsNewYear = isDecemberLiquidated && 
                          !hasNextYearConfig && 
                          !hasNextYearPeriods;
      
      const result: EndOfYearSituation = {
        needsNewYear,
        currentYear,
        nextYear,
        lastLiquidatedPeriod: lastLiquidatedPeriod ? {
          name: lastLiquidatedPeriod.periodo,
          endDate: lastLiquidatedPeriod.fecha_fin,
          isDecember: isDecemberLiquidated
        } : null,
        hasNextYearConfig,
        hasNextYearPeriods,
        suggestedAction: needsNewYear ? 'create_year' : 'none'
      };
      
      console.log('🎯 Resultado detección fin de año:', result);
      
      return result;
      
    } catch (error) {
      console.error('❌ Error detectando fin de año:', error);
      
      // Retornar estado seguro en caso de error
      return {
        needsNewYear: false,
        currentYear: new Date().getFullYear(),
        nextYear: new Date().getFullYear() + 1,
        lastLiquidatedPeriod: null,
        hasNextYearConfig: false,
        hasNextYearPeriods: false,
        suggestedAction: 'none'
      };
    }
  }
  
  /**
   * Verifica si un período específico es el último de diciembre
   */
  static isPeriodEndOfDecember(endDate: string): boolean {
    const date = new Date(endDate);
    return date.getMonth() === 11; // Diciembre es mes 11 (0-indexado)
  }
  
  /**
   * Obtiene los años sugeridos para crear basándose en el año actual
   */
  static getSuggestedYears(): string[] {
    const currentYear = new Date().getFullYear();
    const availableYears = ConfigurationService.getAvailableYears();
    
    // Sugerir desde el año actual hasta 3 años en el futuro
    const suggestedYears: string[] = [];
    for (let year = currentYear; year <= currentYear + 3; year++) {
      if (!availableYears.includes(year.toString())) {
        suggestedYears.push(year.toString());
      }
    }
    
    return suggestedYears;
  }
}