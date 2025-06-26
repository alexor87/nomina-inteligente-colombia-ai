
import { supabase } from '@/integrations/supabase/client';
import { PayrollPeriodService, PayrollPeriod } from '../PayrollPeriodService';
import { PayrollConfigurationService } from './PayrollConfigurationService';
import { PayrollPeriodCalculationService } from './PayrollPeriodCalculationService';

export interface PeriodStatus {
  action: 'resume' | 'create_new' | 'configure' | 'error';
  currentPeriod?: PayrollPeriod;
  nextPeriod?: {
    startDate: string;
    endDate: string;
    type: string;
  };
  message: string;
  title: string;
}

export class PayrollPeriodDetectionService {
  // Detectar estado inteligente del módulo de nómina
  static async detectPeriodStatus(): Promise<PeriodStatus> {
    try {
      console.log('🔍 Detectando estado inteligente del módulo de nómina...');
      
      const companyId = await PayrollPeriodService.getCurrentUserCompanyId();
      if (!companyId) {
        console.log('❌ No se encontró company_id');
        return {
          action: 'configure',
          message: 'Para poder liquidar la nómina, primero debes configurar la periodicidad desde el módulo de Configuración.',
          title: 'Configuración requerida'
        };
      }

      // Verificar configuración de empresa - forzar refresh completo
      const companySettings = await PayrollConfigurationService.forceRefreshConfiguration(companyId);
      if (!companySettings) {
        console.log('❌ No se encontró configuración de empresa');
        return {
          action: 'configure',
          message: 'Para poder liquidar la nómina, primero debes configurar la periodicidad desde el módulo de Configuración.',
          title: 'Configuración requerida'
        };
      }

      console.log('✅ Configuración encontrada:', companySettings);
      console.log('📊 Periodicidad configurada:', companySettings.periodicity);

      // Buscar periodo activo (borrador o en proceso)
      const activePeriod = await this.getActivePeriod(companyId);
      
      if (activePeriod) {
        // Existe un periodo abierto - reanudar
        const periodText = PayrollPeriodService.formatPeriodText(
          activePeriod.fecha_inicio, 
          activePeriod.fecha_fin
        );
        
        console.log('🔄 Periodo activo encontrado:', activePeriod.id);
        
        return {
          action: 'resume',
          currentPeriod: activePeriod,
          message: `Retomando la nómina en curso ${periodText}`,
          title: 'Nómina en curso'
        };
      }

      // No hay periodo activo - verificar si hay periodo cerrado reciente
      const lastClosedPeriod = await this.getLastClosedPeriod(companyId);
      const nextPeriodDates = PayrollPeriodCalculationService.calculateNextPeriod(
        companySettings.periodicity,
        lastClosedPeriod
      );

      console.log('📅 Calculando siguiente periodo:', nextPeriodDates);

      if (lastClosedPeriod) {
        const lastPeriodText = PayrollPeriodService.formatPeriodText(
          lastClosedPeriod.fecha_inicio,
          lastClosedPeriod.fecha_fin
        );
        const nextPeriodText = PayrollPeriodService.formatPeriodText(
          nextPeriodDates.startDate,
          nextPeriodDates.endDate
        );

        console.log('✅ Último periodo cerrado encontrado, sugeriendo siguiente');

        return {
          action: 'create_new',
          currentPeriod: lastClosedPeriod,
          nextPeriod: {
            startDate: nextPeriodDates.startDate,
            endDate: nextPeriodDates.endDate,
            type: companySettings.periodicity
          },
          message: `Ya cerraste la nómina ${lastPeriodText}. ¿Deseas iniciar la siguiente nómina ${nextPeriodText}?`,
          title: 'Iniciar nuevo periodo'
        };
      }

      // Primer periodo - crear automáticamente
      console.log('🆕 Primera nómina - creando periodo inicial');
      
      return {
        action: 'create_new',
        nextPeriod: {
          startDate: nextPeriodDates.startDate,
          endDate: nextPeriodDates.endDate,
          type: companySettings.periodicity
        },
        message: `¿Deseas iniciar tu primera nómina ${PayrollPeriodService.formatPeriodText(nextPeriodDates.startDate, nextPeriodDates.endDate)}?`,
        title: 'Primera nómina'
      };

    } catch (error) {
      console.error('❌ Error detectando estado del periodo:', error);
      return {
        action: 'error',
        message: 'Ocurrió un error al verificar el estado de la nómina. Intenta nuevamente.',
        title: 'Error'
      };
    }
  }

  // Obtener periodo activo (borrador o en proceso)
  private static async getActivePeriod(companyId: string): Promise<PayrollPeriod | null> {
    const { data, error } = await supabase
      .from('payroll_periods')
      .select('*')
      .eq('company_id', companyId)
      .in('estado', ['borrador', 'en_proceso'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data as PayrollPeriod | null;
  }

  // Obtener último periodo cerrado
  private static async getLastClosedPeriod(companyId: string): Promise<PayrollPeriod | null> {
    const { data, error } = await supabase
      .from('payroll_periods')
      .select('*')
      .eq('company_id', companyId)
      .eq('estado', 'aprobado')
      .order('fecha_fin', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data as PayrollPeriod | null;
  }
}
