
import { getWeek } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

export interface PeriodNumberResult {
  success: boolean;
  numero_periodo_anual?: number;
  warning?: string;
  error?: string;
}

export class PeriodNumberCalculationService {
  
  /**
   * Calcula el número ordinal del período dentro del año
   */
  static async calculatePeriodNumber(
    companyId: string,
    startDate: string,
    endDate: string,
    tipoPeriodo: 'mensual' | 'quincenal' | 'semanal'
  ): Promise<PeriodNumberResult> {
    try {
      console.log('📊 Calculando número de período:', { 
        companyId, startDate, endDate, tipoPeriodo 
      });
      
      const year = new Date(startDate).getFullYear();
      let calculatedNumber: number;
      
      // Calcular número según tipo de período
      switch (tipoPeriodo) {
        case 'mensual':
          calculatedNumber = this.calculateMonthlyPeriodNumber(startDate);
          break;
        case 'quincenal':
          calculatedNumber = await this.calculateBiweeklyPeriodNumber(companyId, startDate, year);
          break;
        case 'semanal':
          calculatedNumber = this.calculateWeeklyPeriodNumber(startDate);
          break;
        default:
          return { success: false, error: 'Tipo de período no soportado' };
      }
      
      // Validar que no exista ya ese número para la empresa/año/tipo
      const isDuplicate = await this.checkDuplicateNumber(
        companyId, year, tipoPeriodo, calculatedNumber
      );
      
      if (isDuplicate) {
        return {
          success: false,
          error: `Ya existe un período ${tipoPeriodo} #${calculatedNumber} para el año ${year}`
        };
      }
      
      // Validar coherencia de fechas vs periodicidad
      const coherenceCheck = this.validatePeriodCoherence(startDate, endDate, tipoPeriodo);
      
      return {
        success: true,
        numero_periodo_anual: calculatedNumber,
        warning: coherenceCheck.warning
      };
      
    } catch (error) {
      console.error('Error calculando número de período:', error);
      return { 
        success: false, 
        error: 'Error interno calculando número de período' 
      };
    }
  }
  
  /**
   * Calcula número para período mensual (1-12)
   */
  private static calculateMonthlyPeriodNumber(startDate: string): number {
    const date = new Date(startDate);
    return date.getMonth() + 1; // getMonth() es 0-indexed
  }
  
  /**
   * Calcula número para período quincenal (conteo cronológico)
   */
  private static async calculateBiweeklyPeriodNumber(
    companyId: string, 
    startDate: string, 
    year: number
  ): Promise<number> {
    const startDay = new Date(startDate).getDate();
    const startMonth = new Date(startDate).getMonth() + 1;
    
    // Contar quincenas hasta este punto en el año
    let biweeklyCount = 0;
    
    for (let month = 1; month <= startMonth; month++) {
      if (month < startMonth) {
        // Meses completos: 2 quincenas por mes
        biweeklyCount += 2;
      } else {
        // Mes actual: determinar si es primera o segunda quincena
        if (startDay <= 15) {
          biweeklyCount += 1; // Primera quincena
        } else {
          biweeklyCount += 2; // Segunda quincena
        }
      }
    }
    
    return biweeklyCount;
  }
  
  /**
   * Calcula número para período semanal (semana ISO del año)
   */
  private static calculateWeeklyPeriodNumber(startDate: string): number {
    const date = new Date(startDate);
    return getWeek(date, { weekStartsOn: 1 }); // Lunes como primer día
  }
  
  /**
   * Verifica si ya existe un período con el mismo número
   */
  private static async checkDuplicateNumber(
    companyId: string,
    year: number,
    tipoPeriodo: string,
    numeroCalculado: number
  ): Promise<boolean> {
    const { data, error } = await supabase
      .from('payroll_periods_real')
      .select('id')
      .eq('company_id', companyId)
      .eq('tipo_periodo', tipoPeriodo)
      .eq('numero_periodo_anual', numeroCalculado)
      .gte('fecha_inicio', `${year}-01-01`)
      .lt('fecha_inicio', `${year + 1}-01-01`)
      .limit(1);
    
    if (error) {
      console.error('Error verificando duplicados:', error);
      return false;
    }
    
    return data && data.length > 0;
  }
  
  /**
   * Valida coherencia entre fechas y tipo de período
   */
  private static validatePeriodCoherence(
    startDate: string, 
    endDate: string, 
    tipoPeriodo: string
  ): { warning?: string } {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
    let expectedMinDays: number;
    let expectedMaxDays: number;
    
    switch (tipoPeriodo) {
      case 'mensual':
        expectedMinDays = 28;
        expectedMaxDays = 31;
        break;
      case 'quincenal':
        expectedMinDays = 14;
        expectedMaxDays = 16;
        break;
      case 'semanal':
        expectedMinDays = 7;
        expectedMaxDays = 7;
        break;
      default:
        return {};
    }
    
    if (diffDays < expectedMinDays || diffDays > expectedMaxDays) {
      return {
        warning: `Período ${tipoPeriodo} de ${diffDays} días es atípico (esperado: ${expectedMinDays}-${expectedMaxDays} días)`
      };
    }
    
    return {};
  }
  
  /**
   * Genera nombre semántico del período basado en el número
   */
  static getSemanticPeriodName(
    numeroAnual: number | null,
    tipoPeriodo: string,
    year: number,
    fallbackName: string
  ): string {
    if (!numeroAnual) {
      return fallbackName; // Períodos antiguos sin numeración
    }
    
    switch (tipoPeriodo) {
      case 'mensual':
        const monthNames = [
          'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
          'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
        ];
        return `${monthNames[numeroAnual - 1]} ${year}`;
      
      case 'quincenal':
        return `Quincena ${numeroAnual} del ${year}`;
      
      case 'semanal':
        return `Semana ${numeroAnual} del ${year}`;
      
      default:
        return fallbackName;
    }
  }
}
