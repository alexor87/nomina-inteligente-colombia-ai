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
  validationError?: string;
}

export interface PeriodDetectionResult {
  hasActivePeriod: boolean;
  activePeriod?: any;
  suggestedAction: 'continue' | 'create' | 'conflict' | 'invalid';
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

  // CONSTANTES DE VALIDACIÓN EMPRESARIAL
  private static readonly MAX_DAYS_SEMANAL = 10;
  private static readonly MAX_DAYS_QUINCENAL = 20;
  private static readonly MAX_DAYS_MENSUAL = 35;
  private static readonly MAX_DAYS_ABSOLUTE = 35; // Límite absoluto para cualquier período de nómina

  /**
   * Validar rango empresarial de fechas
   */
  private static validateBusinessDateRange(startDate: string, endDate: string): {
    isValid: boolean;
    error?: string;
    maxDaysForType?: number;
  } {
    const days = this.calculateDaysBetween(startDate, endDate);
    
    // Validación absoluta: ningún período de nómina puede ser mayor a 35 días
    if (days > this.MAX_DAYS_ABSOLUTE) {
      return {
        isValid: false,
        error: `Rango de fechas demasiado amplio para un período de nómina (${days} días). Máximo permitido: 35 días.`
      };
    }

    // Detectar tipo tentativo para validaciones específicas
    const tentativeType = this.detectPeriodType(startDate, endDate);
    let maxDaysForType: number;
    
    switch (tentativeType) {
      case 'semanal':
        maxDaysForType = this.MAX_DAYS_SEMANAL;
        break;
      case 'quincenal':
        maxDaysForType = this.MAX_DAYS_QUINCENAL;
        break;
      default:
        maxDaysForType = this.MAX_DAYS_MENSUAL;
        break;
    }

    if (days > maxDaysForType) {
      return {
        isValid: false,
        error: `Rango demasiado amplio para período ${tentativeType} (${days} días). Máximo para ${tentativeType}: ${maxDaysForType} días.`,
        maxDaysForType
      };
    }

    return { isValid: true };
  }

  /**
   * Generar información completa del período con validación empresarial
   */
  static generatePeriodInfo(
    startDate: string, 
    endDate: string, 
    companyId?: string
  ): PeriodInfo {
    // PRIMERO: Validar rango básico
    if (!this.isValidDateRange(startDate, endDate)) {
      return {
        name: `${startDate} - ${endDate}`,
        type: 'mensual',
        startDate,
        endDate,
        isValid: false,
        validationError: 'Rango de fechas inválido'
      };
    }

    // SEGUNDO: Validar rango empresarial
    const businessValidation = this.validateBusinessDateRange(startDate, endDate);
    if (!businessValidation.isValid) {
      return {
        name: `Rango inválido (${this.calculateDaysBetween(startDate, endDate)} días)`,
        type: 'mensual',
        startDate,
        endDate,
        isValid: false,
        validationError: businessValidation.error
      };
    }

    // TERCERO: Procesar período normalmente
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
   * Detectar período para fechas seleccionadas con validación empresarial
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

      // CRÍTICO: Generar información del período UNA SOLA VEZ con validación empresarial
      const periodInfo = this.generatePeriodInfo(startDate, endDate, companyId);
      
      // Si el rango es empresarialmente inválido, retornar inmediatamente
      if (!periodInfo.isValid && periodInfo.validationError) {
        return {
          hasActivePeriod: false,
          suggestedAction: 'invalid',
          message: periodInfo.validationError,
          periodData: periodInfo
        };
      }
      
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
   * ✅ CORREGIDO: Calcular días entre fechas SIN problemas de UTC
   */
  private static calculateDaysBetween(startDate: string, endDate: string): number {
    // Parsear fechas como fechas locales para evitar problemas de UTC
    const [startYear, startMonth, startDay] = startDate.split('-').map(Number);
    const [endYear, endMonth, endDay] = endDate.split('-').map(Number);
    
    // Crear fechas usando constructor local (mes es 0-indexado)
    const start = new Date(startYear, startMonth - 1, startDay);
    const end = new Date(endYear, endMonth - 1, endDay);
    
    // Calcular diferencia en milisegundos y convertir a días
    const diffTime = end.getTime() - start.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 para incluir ambos días
    
    console.log('📅 PeriodService - Calculating days:', { startDate, endDate, diffDays });
    return diffDays;
  }

  /**
   * Validar rango de fechas
   */
  private static isValidDateRange(startDate: string, endDate: string): boolean {
    if (!startDate || !endDate) return false;
    
    // Usar parsing local para evitar problemas de UTC
    const [startYear, startMonth, startDay] = startDate.split('-').map(Number);
    const [endYear, endMonth, endDay] = endDate.split('-').map(Number);
    
    const start = new Date(startYear, startMonth - 1, startDay);
    const end = new Date(endYear, endMonth - 1, endDay);
    
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

  /**
   * NUEVA: Crear período desde información predefinida
   */
  static async createPeriodFromGenerated(
    companyId: string,
    periodData: {
      fecha_inicio: string;
      fecha_fin: string;
      tipo_periodo: 'semanal' | 'quincenal' | 'mensual';
      numero_periodo_anual: number;
      etiqueta_visible: string;
    }
  ): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('payroll_periods_real')
        .insert({
          company_id: companyId,
          fecha_inicio: periodData.fecha_inicio,
          fecha_fin: periodData.fecha_fin,
          tipo_periodo: periodData.tipo_periodo,
          numero_periodo_anual: periodData.numero_periodo_anual,
          periodo: periodData.etiqueta_visible,
          estado: 'en_proceso',
          empleados_count: 0,
          total_devengado: 0,
          total_deducciones: 0,
          total_neto: 0
        })
        .select('id')
        .single();

      if (error) throw error;
      
      console.log('✅ Período creado desde datos predefinidos:', periodData.etiqueta_visible);
      return data.id;
    } catch (error) {
      console.error('Error creando período desde datos predefinidos:', error);
      return null;
    }
  }

  /**
   * NUEVA: Verificar si un período ya existe
   */
  static async checkPeriodExists(
    companyId: string,
    startDate: string,
    endDate: string
  ): Promise<{ exists: boolean; periodId?: string; periodo?: string }> {
    try {
      const { data } = await supabase
        .from('payroll_periods_real')
        .select('id, periodo')
        .eq('company_id', companyId)
        .eq('fecha_inicio', startDate)
        .eq('fecha_fin', endDate)
        .maybeSingle();

      return {
        exists: !!data,
        periodId: data?.id,
        periodo: data?.periodo
      };
    } catch (error) {
      console.error('Error verificando existencia de período:', error);
      return { exists: false };
    }
  }
}
