
import { supabase } from '@/integrations/supabase/client';
import { PayrollConfigurationService } from './PayrollConfigurationService';

export interface FuturePeriodValidation {
  canCreateFuture: boolean;
  activeFuturePeriod?: any;
  nextSuggestedPeriod?: {
    startDate: string;
    endDate: string;
    type: string;
    period: string;
    calculatedDays: number;
  };
  message: string;
}

export class FuturePeriodService {
  /**
   * VALIDACIÓN DINÁMICA DE PERÍODOS FUTUROS - CORREGIDA
   */
  static async validateFuturePeriodCreation(companyId: string): Promise<FuturePeriodValidation> {
    try {
      console.log('🔮 VALIDANDO CREACIÓN DE PERÍODO FUTURO DINÁMICO...');
      
      // Check if there's already an active future period
      const { data: activePeriods, error } = await supabase
        .from('payroll_periods_real')
        .select('*')
        .eq('company_id', companyId)
        .eq('estado', 'borrador')
        .order('fecha_inicio', { ascending: false });

      if (error) throw error;

      // If there's an active period, can't create another future one
      if (activePeriods && activePeriods.length > 0) {
        return {
          canCreateFuture: false,
          activeFuturePeriod: activePeriods[0],
          message: `Ya existe un período activo: ${activePeriods[0].periodo}`
        };
      }

      // OBTENER CONFIGURACIÓN DINÁMICA DE EMPRESA
      console.log('⚙️ OBTENIENDO CONFIGURACIÓN DINÁMICA DE EMPRESA...');
      const settings = await PayrollConfigurationService.getCompanySettingsForceRefresh(companyId);
      
      const periodicity = settings?.periodicity || 'mensual';
      const customDays = settings?.custom_period_days || 30;
      
      console.log('📊 CONFIGURACIÓN DINÁMICA:', { periodicity, customDays });

      // Find the last closed period
      const { data: lastClosedPeriod } = await supabase
        .from('payroll_periods_real')
        .select('*')
        .eq('company_id', companyId)
        .eq('estado', 'cerrado')
        .order('fecha_fin', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!lastClosedPeriod) {
        // No closed periods, suggest current period using DYNAMIC strategy
        const currentPeriodDates = await this.generateDynamicCurrentPeriodDates(periodicity, customDays);
        const calculatedDays = this.calculatePeriodDays(currentPeriodDates.startDate, currentPeriodDates.endDate);
        
        return {
          canCreateFuture: true,
          nextSuggestedPeriod: {
            ...currentPeriodDates,
            type: periodicity,
            period: this.generatePeriodName(currentPeriodDates.startDate, currentPeriodDates.endDate),
            calculatedDays
          },
          message: `Listo para crear el período actual (${calculatedDays} días)`
        };
      }

      // Calculate next period after the last closed one using DYNAMIC strategy
      const nextPeriodDates = this.calculateDynamicNextPeriodDates(lastClosedPeriod, periodicity, customDays);
      const calculatedDays = this.calculatePeriodDays(nextPeriodDates.startDate, nextPeriodDates.endDate);
      
      return {
        canCreateFuture: true,
        nextSuggestedPeriod: {
          ...nextPeriodDates,
          type: periodicity,
          period: this.generatePeriodName(nextPeriodDates.startDate, nextPeriodDates.endDate),
          calculatedDays
        },
        message: `Listo para crear el siguiente período: ${this.generatePeriodName(nextPeriodDates.startDate, nextPeriodDates.endDate)} (${calculatedDays} días)`
      };

    } catch (error) {
      console.error('❌ Error validando período futuro:', error);
      return {
        canCreateFuture: false,
        message: 'Error validando períodos futuros'
      };
    }
  }

  /**
   * GENERACIÓN DINÁMICA DE PERÍODO ACTUAL
   */
  private static async generateDynamicCurrentPeriodDates(periodicity: string, customDays?: number): Promise<{ startDate: string; endDate: string }> {
    console.log('📅 GENERANDO PERÍODO ACTUAL DINÁMICO:', { periodicity, customDays });
    
    const { PeriodStrategyFactory } = await import('./PeriodGenerationStrategy');
    const strategy = PeriodStrategyFactory.createStrategy(periodicity, customDays);
    
    return strategy.generateCurrentPeriod();
  }

  /**
   * CÁLCULO DINÁMICO DE SIGUIENTE PERÍODO
   */
  private static calculateDynamicNextPeriodDates(
    closedPeriod: any, 
    periodicity: string,
    customDays?: number
  ): { startDate: string; endDate: string } {
    console.log('📅 CALCULANDO SIGUIENTE PERÍODO DINÁMICO:', { 
      lastPeriod: closedPeriod.periodo,
      periodicity, 
      customDays 
    });
    
    const lastEndDate = closedPeriod.fecha_fin;
    
    switch (periodicity) {
      case 'quincenal':
        return this.calculateNextBiWeeklyPeriod(lastEndDate);
      case 'semanal':
        return this.calculateNextWeeklyPeriod(lastEndDate);
      case 'personalizado':
        return this.calculateNextCustomPeriod(lastEndDate, customDays || 30);
      default: // mensual
        return this.calculateNextMonthlyPeriod(lastEndDate);
    }
  }

  /**
   * CÁLCULO ESPECÍFICO PARA PERÍODOS QUINCENALES
   */
  private static calculateNextBiWeeklyPeriod(lastEndDate: string): { startDate: string; endDate: string } {
    const lastEnd = new Date(lastEndDate);
    const nextStart = new Date(lastEnd);
    nextStart.setDate(lastEnd.getDate() + 1);
    
    const startDay = nextStart.getDate();
    const month = nextStart.getMonth();
    const year = nextStart.getFullYear();
    
    if (startDay === 1) {
      // Primera quincena (1-15)
      return {
        startDate: new Date(year, month, 1).toISOString().split('T')[0],
        endDate: new Date(year, month, 15).toISOString().split('T')[0]
      };
    } else if (startDay === 16) {
      // Segunda quincena (16-fin del mes)
      return {
        startDate: new Date(year, month, 16).toISOString().split('T')[0],
        endDate: new Date(year, month + 1, 0).toISOString().split('T')[0]
      };
    } else {
      // Ajustar a la quincena más cercana
      if (startDay <= 15) {
        return {
          startDate: new Date(year, month, 1).toISOString().split('T')[0],
          endDate: new Date(year, month, 15).toISOString().split('T')[0]
        };
      } else {
        return {
          startDate: new Date(year, month, 16).toISOString().split('T')[0],
          endDate: new Date(year, month + 1, 0).toISOString().split('T')[0]
        };
      }
    }
  }

  /**
   * CÁLCULO ESPECÍFICO PARA PERÍODOS MENSUALES
   */
  private static calculateNextMonthlyPeriod(lastEndDate: string): { startDate: string; endDate: string } {
    const lastEnd = new Date(lastEndDate);
    const nextStart = new Date(lastEnd);
    nextStart.setDate(lastEnd.getDate() + 1);
    
    const month = nextStart.getMonth();
    const year = nextStart.getFullYear();
    
    return {
      startDate: new Date(year, month, 1).toISOString().split('T')[0],
      endDate: new Date(year, month + 1, 0).toISOString().split('T')[0]
    };
  }

  /**
   * CÁLCULO ESPECÍFICO PARA PERÍODOS SEMANALES
   */
  private static calculateNextWeeklyPeriod(lastEndDate: string): { startDate: string; endDate: string } {
    const lastEnd = new Date(lastEndDate);
    const nextStart = new Date(lastEnd);
    nextStart.setDate(lastEnd.getDate() + 1);
    
    const nextEnd = new Date(nextStart);
    nextEnd.setDate(nextStart.getDate() + 6);
    
    return {
      startDate: nextStart.toISOString().split('T')[0],
      endDate: nextEnd.toISOString().split('T')[0]
    };
  }

  /**
   * CÁLCULO ESPECÍFICO PARA PERÍODOS PERSONALIZADOS
   */
  private static calculateNextCustomPeriod(lastEndDate: string, customDays: number): { startDate: string; endDate: string } {
    const lastEnd = new Date(lastEndDate);
    const nextStart = new Date(lastEnd);
    nextStart.setDate(lastEnd.getDate() + 1);
    
    const nextEnd = new Date(nextStart);
    nextEnd.setDate(nextStart.getDate() + customDays - 1);
    
    return {
      startDate: nextStart.toISOString().split('T')[0],
      endDate: nextEnd.toISOString().split('T')[0]
    };
  }

  /**
   * Create a future period with validation
   */
  static async createFuturePeriod(
    companyId: string, 
    periodData: { startDate: string; endDate: string; type: string; period: string }
  ): Promise<{ success: boolean; period?: any; message: string }> {
    try {
      // Validate first
      const validation = await this.validateFuturePeriodCreation(companyId);
      
      if (!validation.canCreateFuture) {
        return {
          success: false,
          message: validation.message
        };
      }

      // Create the period
      const { data: newPeriod, error } = await supabase
        .from('payroll_periods_real')
        .insert({
          company_id: companyId,
          fecha_inicio: periodData.startDate,
          fecha_fin: periodData.endDate,
          tipo_periodo: periodData.type,
          periodo: periodData.period,
          estado: 'borrador'
        })
        .select()
        .single();

      if (error) throw error;

      console.log('✅ Período futuro creado:', newPeriod.periodo);
      
      return {
        success: true,
        period: newPeriod,
        message: `Período ${newPeriod.periodo} creado exitosamente`
      };

    } catch (error) {
      console.error('❌ Error creando período futuro:', error);
      return {
        success: false,
        message: 'Error creando período futuro'
      };
    }
  }

  /**
   * UTILIDADES AUXILIARES
   */
  private static generatePeriodName(startDate: string, endDate: string): string {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    const startMonth = start.toLocaleDateString('es-CO', { month: 'long' });
    const endMonth = end.toLocaleDateString('es-CO', { month: 'long' });
    const year = start.getFullYear();
    
    if (startMonth === endMonth) {
      return `${startMonth.charAt(0).toUpperCase() + startMonth.slice(1)} ${year}`;
    } else {
      return `${startMonth.charAt(0).toUpperCase() + startMonth.slice(1)} - ${endMonth.charAt(0).toUpperCase() + endMonth.slice(1)} ${year}`;
    }
  }

  private static calculatePeriodDays(startDate: string, endDate: string): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  }
}
