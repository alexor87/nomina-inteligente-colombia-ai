/**
 * SERVICIO UNIFICADO DE PERÍODOS - ARQUITECTURA REFACTORIZADA
 * Responsable de TODA la lógica relacionada con períodos de nómina
 * Implementa principios SOLID y patrón Strategy
 */

import { supabase } from '@/integrations/supabase/client';

export interface PeriodInfo {
  id?: string;
  name: string;
  semanticName?: string;
  type: 'semanal' | 'quincenal' | 'mensual';
  startDate: string;
  endDate: string;
  number?: number;
  isValid: boolean;
}

export interface PeriodDetectionResult {
  hasActivePeriod: boolean;
  activePeriod?: any;
  suggestedAction: 'continue' | 'create' | 'conflict';
  message: string;
  periodData: PeriodInfo;
  conflictPeriod?: any;
}

interface PeriodStrategy {
  calculateDates(referenceDate: Date): { startDate: string; endDate: string };
  generateName(startDate: string, endDate: string): string;
  generateSemanticName(number: number, year: number): string;
  calculateNumber(startDate: string): number;
  validatePeriod(startDate: string, endDate: string): boolean;
}

// Estrategias para diferentes tipos de período
class QuincenalStrategy implements PeriodStrategy {
  calculateDates(referenceDate: Date): { startDate: string; endDate: string } {
    const day = referenceDate.getDate();
    const year = referenceDate.getFullYear();
    const month = referenceDate.getMonth();
    
    let startDate: Date;
    let endDate: Date;
    
    if (day <= 15) {
      startDate = new Date(year, month, 1);
      endDate = new Date(year, month, 15);
    } else {
      startDate = new Date(year, month, 16);
      endDate = new Date(year, month + 1, 0);
    }
    
    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    };
  }

  generateName(startDate: string, endDate: string): string {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const monthNames = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    
    const monthName = monthNames[start.getMonth()];
    const year = start.getFullYear();
    
    return `${start.getDate()} - ${end.getDate()} ${monthName} ${year}`;
  }

  generateSemanticName(number: number, year: number): string {
    return `Quincena ${number} del ${year}`;
  }

  calculateNumber(startDate: string): number {
    const date = new Date(startDate);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    
    // Contar quincenas hasta este punto en el año
    const previousMonthsQuincenas = (month - 1) * 2;
    const currentQuincena = day <= 15 ? 1 : 2;
    
    return previousMonthsQuincenas + currentQuincena;
  }

  validatePeriod(startDate: string, endDate: string): boolean {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
    return diffDays >= 13 && diffDays <= 16; // Quincenas pueden variar
  }
}

class MensualStrategy implements PeriodStrategy {
  calculateDates(referenceDate: Date): { startDate: string; endDate: string } {
    const year = referenceDate.getFullYear();
    const month = referenceDate.getMonth();
    
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0);
    
    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    };
  }

  generateName(startDate: string, endDate: string): string {
    const start = new Date(startDate);
    const monthNames = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    
    return `${monthNames[start.getMonth()]} ${start.getFullYear()}`;
  }

  generateSemanticName(number: number, year: number): string {
    const monthNames = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    return `${monthNames[number - 1]} ${year}`;
  }

  calculateNumber(startDate: string): number {
    const date = new Date(startDate);
    return date.getMonth() + 1;
  }

  validatePeriod(startDate: string, endDate: string): boolean {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
    return diffDays >= 28 && diffDays <= 31;
  }
}

class SemanalStrategy implements PeriodStrategy {
  calculateDates(referenceDate: Date): { startDate: string; endDate: string } {
    const dayOfWeek = referenceDate.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    
    const startDate = new Date(referenceDate);
    startDate.setDate(referenceDate.getDate() + mondayOffset);
    
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);
    
    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    };
  }

  generateName(startDate: string, endDate: string): string {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const monthNames = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    
    const monthName = monthNames[start.getMonth()];
    const year = start.getFullYear();
    
    return `Semana ${start.getDate()}-${end.getDate()} ${monthName} ${year}`;
  }

  generateSemanticName(number: number, year: number): string {
    return `Semana ${number} del ${year}`;
  }

  calculateNumber(startDate: string): number {
    // CORREGIDO: Calcular semana consecutiva desde el 1 de enero
    const date = new Date(startDate);
    const startOfYear = new Date(date.getFullYear(), 0, 1); // 1 de enero
    
    // Calcular días transcurridos desde el 1 de enero
    const daysDiff = Math.floor((date.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24));
    
    // Calcular número de semana (1-based)
    const weekNumber = Math.floor(daysDiff / 7) + 1;
    
    return weekNumber;
  }

  validatePeriod(startDate: string, endDate: string): boolean {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
    return diffDays === 7;
  }
}

/**
 * SERVICIO PRINCIPAL UNIFICADO
 */
export class PeriodService {
  private static strategies: Record<string, PeriodStrategy> = {
    quincenal: new QuincenalStrategy(),
    mensual: new MensualStrategy(),
    semanal: new SemanalStrategy()
  };

  /**
   * Generar información completa del período
   */
  static generatePeriodInfo(
    startDate: string, 
    endDate: string, 
    companyId?: string
  ): PeriodInfo {
    if (!this.isValidDateRange(startDate, endDate)) {
      return {
        name: `${startDate} - ${endDate}`,
        type: 'mensual',
        startDate,
        endDate,
        isValid: false
      };
    }

    const type = this.detectPeriodType(startDate, endDate);
    const strategy = this.strategies[type];
    
    const name = strategy.generateName(startDate, endDate);
    const number = strategy.calculateNumber(startDate);
    const year = parseInt(startDate.split('-')[0]);
    const semanticName = strategy.generateSemanticName(number, year);
    
    // Validar coherencia del período
    const isCoherent = this.validatePeriodCoherence(startDate, endDate, type, number);
    
    return {
      name,
      semanticName,
      type,
      startDate,
      endDate,
      number,
      isValid: isCoherent
    };
  }

  /**
   * Validar coherencia entre fechas seleccionadas y número calculado
   */
  private static validatePeriodCoherence(
    startDate: string, 
    endDate: string, 
    type: 'semanal' | 'quincenal' | 'mensual',
    calculatedNumber: number
  ): boolean {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const year = start.getFullYear();
    
    switch (type) {
      case 'semanal':
        // Validar que las fechas correspondan exactamente a la semana calculada
        const expectedWeekStart = new Date(year, 0, 1 + (calculatedNumber - 1) * 7);
        const expectedWeekEnd = new Date(year, 0, 1 + calculatedNumber * 7 - 1);
        
        return start.getTime() === expectedWeekStart.getTime() && 
               end.getTime() === expectedWeekEnd.getTime();
               
      case 'quincenal':
        const month = start.getMonth() + 1;
        const day = start.getDate();
        
        // Primera quincena: 1-15, Segunda quincena: 16-fin de mes
        if (calculatedNumber % 2 === 1) { // Quincena impar (primera del mes)
          return day === 1 && end.getDate() === 15;
        } else { // Quincena par (segunda del mes)
          const lastDayOfMonth = new Date(year, month, 0).getDate();
          return day === 16 && end.getDate() === lastDayOfMonth;
        }
        
      case 'mensual':
        // Validar que sea exactamente del 1 al último día del mes
        const lastDay = new Date(year, calculatedNumber, 0).getDate();
        return start.getDate() === 1 && end.getDate() === lastDay &&
               start.getMonth() + 1 === calculatedNumber;
               
      default:
        return true;
    }
  }

  /**
   * Detectar período para fechas seleccionadas
   */
  static async detectPeriodForDates(
    startDate: string, 
    endDate: string
  ): Promise<PeriodDetectionResult> {
    try {
      const companyId = await this.getCurrentUserCompanyId();
      if (!companyId) {
        throw new Error('No se pudo obtener la empresa del usuario');
      }

      // Generar información del período UNA SOLA VEZ
      const periodInfo = this.generatePeriodInfo(startDate, endDate, companyId);
      
      // Verificar si las fechas seleccionadas son coherentes con el período calculado
      if (!periodInfo.isValid) {
        const warningMessage = `Las fechas seleccionadas no corresponden exactamente a un período ${periodInfo.type} completo. Se creará el período con las fechas seleccionadas.`;
        
        return {
          hasActivePeriod: false,
          suggestedAction: 'create',
          message: warningMessage,
          periodData: {
            ...periodInfo,
            name: periodInfo.semanticName || periodInfo.name,
            isValid: true // Permitir creación pero con advertencia
          }
        };
      }
      
      // Buscar período exacto
      const { data: exactPeriod } = await supabase
        .from('payroll_periods_real')
        .select('*')
        .eq('company_id', companyId)
        .eq('fecha_inicio', startDate)
        .eq('fecha_fin', endDate)
        .maybeSingle();

      if (exactPeriod) {
        return {
          hasActivePeriod: true,
          activePeriod: exactPeriod,
          suggestedAction: 'continue',
          message: `Continuando con período existente: ${exactPeriod.periodo}`,
          periodData: {
            ...periodInfo,
            id: exactPeriod.id,
            name: exactPeriod.periodo
          }
        };
      }

      // Verificar conflictos
      const { data: conflicts } = await supabase
        .from('payroll_periods_real')
        .select('*')
        .eq('company_id', companyId)
        .in('estado', ['borrador', 'en_proceso'])
        .or(`fecha_inicio.lte.${endDate},fecha_fin.gte.${startDate}`)
        .order('created_at', { ascending: false });

      if (conflicts && conflicts.length > 0) {
        const conflictPeriod = conflicts[0];
        return {
          hasActivePeriod: false,
          suggestedAction: 'conflict',
          message: `Existe un período abierto que se solapa: ${conflictPeriod.periodo}`,
          periodData: periodInfo,
          conflictPeriod
        };
      }

      // Sin conflictos, crear nuevo período
      const finalName = periodInfo.semanticName || periodInfo.name;
      
      return {
        hasActivePeriod: false,
        suggestedAction: 'create',
        message: `Crear nuevo período: ${finalName}`,
        periodData: {
          ...periodInfo,
          name: finalName
        }
      };

    } catch (error) {
      const periodInfo = this.generatePeriodInfo(startDate, endDate);
      const fallbackName = periodInfo.semanticName || periodInfo.name;
      
      return {
        hasActivePeriod: false,
        suggestedAction: 'create',
        message: `Error detectando período. Se creará: ${fallbackName}`,
        periodData: {
          ...periodInfo,
          name: fallbackName
        }
      };
    }
  }

  /**
   * Detectar tipo de período basado en duración
   */
  private static detectPeriodType(startDate: string, endDate: string): 'semanal' | 'quincenal' | 'mensual' {
    const days = this.calculateDaysBetween(startDate, endDate);
    
    if (days <= 7) return 'semanal';
    if (days <= 16) return 'quincenal';
    return 'mensual';
  }

  /**
   * Calcular días entre fechas
   */
  private static calculateDaysBetween(startDate: string, endDate: string): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  }

  /**
   * Validar rango de fechas
   */
  private static isValidDateRange(startDate: string, endDate: string): boolean {
    if (!startDate || !endDate) return false;
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    return start <= end && !isNaN(start.getTime()) && !isNaN(end.getTime());
  }

  /**
   * Obtener company ID del usuario actual
   */
  private static async getCurrentUserCompanyId(): Promise<string | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      return profile?.company_id || null;
    } catch {
      return null;
    }
  }

  /**
   * Generar período automático basado en configuración de empresa
   */
  static async generateAutomaticPeriod(companyId: string): Promise<PeriodInfo> {
    try {
      // Obtener configuración de empresa
      const { data: settings } = await supabase
        .from('company_settings')
        .select('periodicity')
        .eq('company_id', companyId)
        .single();

      const periodicity = (settings?.periodicity as 'semanal' | 'quincenal' | 'mensual') || 'quincenal';
      const strategy = this.strategies[periodicity];
      
      const { startDate, endDate } = strategy.calculateDates(new Date());
      
      return this.generatePeriodInfo(startDate, endDate, companyId);
    } catch {
      // Fallback a quincenal
      const strategy = this.strategies.quincenal;
      const { startDate, endDate } = strategy.calculateDates(new Date());
      
      return this.generatePeriodInfo(startDate, endDate, companyId);
    }
  }
}
