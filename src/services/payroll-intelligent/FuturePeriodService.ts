
import { supabase } from '@/integrations/supabase/client';
import { PayrollPeriodIntelligentService } from '@/services/PayrollPeriodIntelligentService';

export interface FuturePeriodValidation {
  canCreateFuture: boolean;
  activeFuturePeriod?: any;
  nextSuggestedPeriod?: {
    startDate: string;
    endDate: string;
    type: string;
    period: string;
  };
  message: string;
}

export class FuturePeriodService {
  /**
   * Validate if a future period can be created
   */
  static async validateFuturePeriodCreation(companyId: string): Promise<FuturePeriodValidation> {
    try {
      console.log('🔮 Validando creación de período futuro...');
      
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

      // Get company periodicity
      const { data: settings } = await supabase
        .from('company_settings')
        .select('periodicity')
        .eq('company_id', companyId)
        .single();

      const periodicity = settings?.periodicity || 'mensual';

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
        // No closed periods, suggest current period
        const currentPeriodDates = await this.generateCurrentPeriodDates(periodicity);
        return {
          canCreateFuture: true,
          nextSuggestedPeriod: {
            ...currentPeriodDates,
            type: periodicity,
            period: this.generatePeriodName(currentPeriodDates.startDate, currentPeriodDates.endDate)
          },
          message: 'Listo para crear el período actual'
        };
      }

      // Calculate next period after the last closed one
      const nextPeriodDates = this.calculateNextPeriodDates(lastClosedPeriod, periodicity);
      
      return {
        canCreateFuture: true,
        nextSuggestedPeriod: {
          ...nextPeriodDates,
          type: periodicity,
          period: this.generatePeriodName(nextPeriodDates.startDate, nextPeriodDates.endDate)
        },
        message: `Listo para crear el siguiente período: ${this.generatePeriodName(nextPeriodDates.startDate, nextPeriodDates.endDate)}`
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
   * Generate current period dates based on periodicity
   */
  private static async generateCurrentPeriodDates(periodicity: string): Promise<{ startDate: string; endDate: string }> {
    const { PeriodStrategyFactory } = await import('./PeriodGenerationStrategy');
    const strategy = PeriodStrategyFactory.createStrategy(periodicity);
    return strategy.generateCurrentPeriod();
  }

  /**
   * Calculate next period dates after a closed period
   */
  private static calculateNextPeriodDates(
    closedPeriod: any, 
    periodicity: string
  ): { startDate: string; endDate: string } {
    const lastEndDate = new Date(closedPeriod.fecha_fin);
    const nextStartDate = new Date(lastEndDate);
    nextStartDate.setDate(nextStartDate.getDate() + 1);

    let nextEndDate: Date;

    switch (periodicity) {
      case 'quincenal':
        nextEndDate = new Date(nextStartDate);
        nextEndDate.setDate(nextEndDate.getDate() + 14);
        break;
      case 'semanal':
        nextEndDate = new Date(nextStartDate);
        nextEndDate.setDate(nextEndDate.getDate() + 6);
        break;
      default: // mensual
        nextEndDate = new Date(nextStartDate);
        nextEndDate.setMonth(nextEndDate.getMonth() + 1);
        nextEndDate.setDate(nextEndDate.getDate() - 1);
        break;
    }

    return {
      startDate: nextStartDate.toISOString().split('T')[0],
      endDate: nextEndDate.toISOString().split('T')[0]
    };
  }

  /**
   * Generate period name from dates
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
}
