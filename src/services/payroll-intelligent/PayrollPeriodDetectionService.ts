import { supabase } from '@/integrations/supabase/client';
import { PayrollPeriodService, PayrollPeriod } from '../PayrollPeriodService';
import { PayrollConfigurationService } from './PayrollConfigurationService';
import { PayrollPeriodCalculationService } from './PayrollPeriodCalculationService';
import { PayrollAuditEnhancedService } from './PayrollAuditEnhancedService';
import { PayrollPerformanceService } from './PayrollPerformanceService';

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
  systemMetrics?: Record<string, any>;
}

export class PayrollPeriodDetectionService {
  // Detectar estado inteligente del módulo de nómina con métricas mejoradas
  static async detectPeriodStatus(): Promise<PeriodStatus> {
    const startTime = performance.now();
    
    try {
      console.log('🔍 Detectando estado inteligente del módulo de nómina...');
      
      const companyId = await PayrollPeriodService.getCurrentUserCompanyId();
      if (!companyId) {
        await PayrollAuditEnhancedService.logEnhancedAction({
          action: 'detection_failed',
          entity_type: 'system',
          details: { reason: 'company_id_not_found' }
        });
        
        return {
          action: 'configure',
          message: 'Para poder liquidar la nómina, primero debes configurar la periodicidad desde el módulo de Configuración.',
          title: 'Configuración requerida'
        };
      }

      // Cargar métricas del sistema de forma paralela
      const [companySettings, activePeriod, systemMetrics] = await Promise.all([
        PayrollConfigurationService.getCompanySettingsForceRefresh(companyId),
        this.getActivePeriod(companyId),
        PayrollPerformanceService.calculateSystemMetrics(companyId)
      ]);

      // Verificar configuración de empresa
      if (!companySettings || !companySettings.periodicity) {
        await PayrollAuditEnhancedService.logEnhancedAction({
          action: 'configuration_missing',
          entity_type: 'system',
          details: { company_id: companyId }
        });

        return {
          action: 'configure',
          message: 'Para poder liquidar la nómina, primero debes configurar la periodicidad desde el módulo de Configuración.',
          title: 'Configuración requerida',
          systemMetrics
        };
      }

      await PayrollAuditEnhancedService.logEnhancedAction({
        action: 'configuration_validated',
        entity_type: 'system',
        details: { 
          periodicity: companySettings.periodicity,
          system_metrics: systemMetrics
        }
      });

      // Si hay período activo, validar consistencia
      if (activePeriod) {
        if (activePeriod.tipo_periodo !== companySettings.periodicity) {
          const lastClosedPeriod = await this.getLastClosedPeriod(companyId);
          const nextPeriodDates = PayrollPeriodCalculationService.calculateNextPeriod(
            companySettings.periodicity,
            lastClosedPeriod
          );

          const nextPeriodText = PayrollPeriodService.formatPeriodText(
            nextPeriodDates.startDate,
            nextPeriodDates.endDate
          );

          return {
            action: 'create_new',
            currentPeriod: activePeriod,
            nextPeriod: {
              startDate: nextPeriodDates.startDate,
              endDate: nextPeriodDates.endDate,
              type: companySettings.periodicity
            },
            message: `Hay un cambio en la configuración de periodicidad. ¿Deseas crear un nuevo período ${companySettings.periodicity} ${nextPeriodText}?`,
            title: 'Actualizar periodicidad',
            systemMetrics
          };
        }

        // Período activo válido - reanudar
        const periodText = PayrollPeriodService.formatPeriodText(
          activePeriod.fecha_inicio, 
          activePeriod.fecha_fin
        );

        await PayrollAuditEnhancedService.logEnhancedAction({
          action: 'resume_period',
          entity_type: 'period',
          entity_id: activePeriod.id,
          details: { 
            period_type: activePeriod.tipo_periodo,
            period_dates: periodText
          }
        });
        
        return {
          action: 'resume',
          currentPeriod: activePeriod,
          message: `Retomando la nómina ${activePeriod.tipo_periodo} en curso ${periodText}`,
          title: 'Nómina en curso',
          systemMetrics
        };
      }

      // No hay período activo - calcular siguiente
      const lastClosedPeriod = await this.getLastClosedPeriod(companyId);
      const nextPeriodDates = PayrollPeriodCalculationService.calculateNextPeriod(
        companySettings.periodicity,
        lastClosedPeriod
      );

      if (lastClosedPeriod) {
        const lastPeriodText = PayrollPeriodService.formatPeriodText(
          lastClosedPeriod.fecha_inicio,
          lastClosedPeriod.fecha_fin
        );
        const nextPeriodText = PayrollPeriodService.formatPeriodText(
          nextPeriodDates.startDate,
          nextPeriodDates.endDate
        );

        return {
          action: 'create_new',
          currentPeriod: lastClosedPeriod,
          nextPeriod: {
            startDate: nextPeriodDates.startDate,
            endDate: nextPeriodDates.endDate,
            type: companySettings.periodicity
          },
          message: `Ya cerraste la nómina ${lastPeriodText}. ¿Deseas iniciar la siguiente nómina ${companySettings.periodicity} ${nextPeriodText}?`,
          title: 'Iniciar nuevo periodo',
          systemMetrics
        };
      }

      // Primera nómina
      const nextPeriodText = PayrollPeriodService.formatPeriodText(
        nextPeriodDates.startDate,
        nextPeriodDates.endDate
      );
      
      return {
        action: 'create_new',
        nextPeriod: {
          startDate: nextPeriodDates.startDate,
          endDate: nextPeriodDates.endDate,
          type: companySettings.periodicity
        },
        message: `¿Deseas iniciar tu primera nómina ${companySettings.periodicity} ${nextPeriodText}?`,
        title: 'Primera nómina',
        systemMetrics
      };

    } catch (error) {
      const duration = performance.now() - startTime;
      
      await PayrollAuditEnhancedService.logEnhancedAction({
        action: 'detection_error',
        entity_type: 'system',
        details: { 
          error: error instanceof Error ? error.message : 'Unknown error',
          duration_ms: duration
        }
      });

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
