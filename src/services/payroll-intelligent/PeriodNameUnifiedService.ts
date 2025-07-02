
import { supabase } from '@/integrations/supabase/client';
import { PAYROLL_STATES, STATE_MAPPING } from '@/constants/payrollStates';

export interface PeriodNameConfig {
  startDate: string;
  endDate: string;
  periodicity: 'mensual' | 'quincenal' | 'semanal' | 'personalizado';
  customDays?: number;
}

export interface PeriodStateInfo {
  dbState: string;
  displayState: string;
  isEditable: boolean;
  canReopen: boolean;
}

export class PeriodNameUnifiedService {
  // Cache para evitar recálculos
  private static nameCache = new Map<string, string>();
  private static stateCache = new Map<string, PeriodStateInfo>();
  
  /**
   * MÉTODO PRINCIPAL: Generar nombre de período de forma unificada
   */
  static generateUnifiedPeriodName(config: PeriodNameConfig): string {
    const cacheKey = `${config.startDate}-${config.endDate}-${config.periodicity}`;
    
    if (this.nameCache.has(cacheKey)) {
      return this.nameCache.get(cacheKey)!;
    }

    console.log('🏷️ Generando nombre unificado para:', config);

    const start = new Date(config.startDate);
    const end = new Date(config.endDate);
    
    // Validar fechas
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      console.error('❌ Fechas inválidas:', config);
      return 'Período Inválido';
    }

    let periodName: string;

    switch (config.periodicity) {
      case 'mensual':
        periodName = this.generateMonthlyName(start, end);
        break;
      case 'quincenal':
        periodName = this.generateBiweeklyName(start, end);
        break;
      case 'semanal':
        periodName = this.generateWeeklyName(start, end);
        break;
      case 'personalizado':
        periodName = this.generateCustomName(start, end, config.customDays);
        break;
      default:
        periodName = this.generateDefaultName(start, end);
    }

    // Guardar en cache
    this.nameCache.set(cacheKey, periodName);
    console.log('✅ Nombre generado:', periodName);
    
    return periodName;
  }

  /**
   * Generar nombre para períodos mensuales
   */
  private static generateMonthlyName(start: Date, end: Date): string {
    const months = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    // Si es un mes completo
    if (this.isFullMonth(start, end)) {
      return `${months[start.getMonth()]} ${start.getFullYear()}`;
    }

    // Si no es un mes completo, mostrar rango
    return this.generateDateRangeName(start, end);
  }

  /**
   * Generar nombre para períodos quincenales
   */
  private static generateBiweeklyName(start: Date, end: Date): string {
    const months = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    const startDay = start.getDate();
    const endDay = end.getDate();
    const month = start.getMonth();
    const year = start.getFullYear();

    // Primera quincena (1-15)
    if (startDay === 1 && endDay <= 15) {
      return `${months[month]} ${year} - 1ra Quincena`;
    }

    // Segunda quincena (16-fin de mes)
    if (startDay >= 16 && this.isEndOfMonth(end)) {
      return `${months[month]} ${year} - 2da Quincena`;
    }

    // Quincena personalizada
    return this.generateDateRangeName(start, end);
  }

  /**
   * Generar nombre para períodos semanales
   */
  private static generateWeeklyName(start: Date, end: Date): string {
    const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
    if (diffDays === 7) {
      return `Semana del ${this.formatShortDate(start)} al ${this.formatShortDate(end)}`;
    }

    return this.generateDateRangeName(start, end);
  }

  /**
   * Generar nombre para períodos personalizados
   */
  private static generateCustomName(start: Date, end: Date, customDays?: number): string {
    const actualDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
    if (customDays && actualDays === customDays) {
      return `Período ${customDays} días (${this.formatShortDate(start)} - ${this.formatShortDate(end)})`;
    }

    return this.generateDateRangeName(start, end);
  }

  /**
   * Generar nombre por defecto (rango de fechas)
   */
  private static generateDefaultName(start: Date, end: Date): string {
    return this.generateDateRangeName(start, end);
  }

  /**
   * Generar nombre de rango de fechas consistente
   */
  private static generateDateRangeName(start: Date, end: Date): string {
    // Si las fechas son del mismo mes y año
    if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
      return `${start.getDate()} al ${end.getDate()} ${this.getMonthShortName(start.getMonth())} ${start.getFullYear()}`;
    }

    // Si son de diferentes meses
    return `${this.formatShortDate(start)} - ${this.formatShortDate(end)}`;
  }

  /**
   * MANEJO DE ESTADOS UNIFICADO
   */
  static getUnifiedStateInfo(dbState: string): PeriodStateInfo {
    if (this.stateCache.has(dbState)) {
      return this.stateCache.get(dbState)!;
    }

    console.log('🔄 Procesando estado de DB:', dbState);

    const displayState = STATE_MAPPING[dbState] || 'con_errores';
    const isEditable = dbState === PAYROLL_STATES.BORRADOR || dbState === PAYROLL_STATES.REABIERTO;
    const canReopen = dbState === PAYROLL_STATES.CERRADO || dbState === PAYROLL_STATES.PROCESADA;

    const stateInfo: PeriodStateInfo = {
      dbState,
      displayState,
      isEditable,
      canReopen
    };

    this.stateCache.set(dbState, stateInfo);
    console.log('📊 Estado procesado:', stateInfo);

    return stateInfo;
  }

  // UTILIDADES PRIVADAS
  private static isFullMonth(start: Date, end: Date): boolean {
    const isFirstDay = start.getDate() === 1;
    const isLastDay = this.isEndOfMonth(end);
    const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
    
    return isFirstDay && isLastDay && sameMonth;
  }

  private static isEndOfMonth(date: Date): boolean {
    const nextDay = new Date(date);
    nextDay.setDate(date.getDate() + 1);
    return nextDay.getDate() === 1;
  }

  private static formatShortDate(date: Date): string {
    return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
  }

  private static getMonthShortName(monthIndex: number): string {
    const shortMonths = [
      'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
      'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
    ];
    return shortMonths[monthIndex];
  }

  /**
   * Limpiar cache cuando sea necesario
   */
  static clearCache(): void {
    this.nameCache.clear();
    this.stateCache.clear();
    console.log('🧹 Cache de nombres y estados limpiado');
  }

  /**
   * Migrar nombres existentes para normalizarlos
   */
  static async normalizeExistingPeriods(companyId: string): Promise<void> {
    try {
      console.log('🔄 Iniciando normalización de períodos existentes...');

      const { data: periods, error } = await supabase
        .from('payroll_periods_real')
        .select('*')
        .eq('company_id', companyId);

      if (error) throw error;

      if (!periods || periods.length === 0) {
        console.log('ℹ️ No hay períodos para normalizar');
        return;
      }

      console.log(`📊 Normalizando ${periods.length} períodos...`);

      for (const period of periods) {
        const config: PeriodNameConfig = {
          startDate: period.fecha_inicio,
          endDate: period.fecha_fin,
          periodicity: period.tipo_periodo as any || 'mensual'
        };

        const normalizedName = this.generateUnifiedPeriodName(config);

        if (normalizedName !== period.periodo) {
          console.log(`🔄 Actualizando "${period.periodo}" → "${normalizedName}"`);

          const { error: updateError } = await supabase
            .from('payroll_periods_real')
            .update({ periodo: normalizedName })
            .eq('id', period.id);

          if (updateError) {
            console.error('❌ Error actualizando período:', updateError);
          }
        }
      }

      console.log('✅ Normalización completada');
    } catch (error) {
      console.error('❌ Error en normalización:', error);
      throw error;
    }
  }
}
