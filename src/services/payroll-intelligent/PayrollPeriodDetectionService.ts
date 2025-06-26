import { PayrollPeriodService, PayrollPeriod } from '../PayrollPeriodService';
import { PayrollConfigurationService } from './PayrollConfigurationService';
import { PayrollHistoryService } from '../PayrollHistoryService';
import { supabase } from '@/integrations/supabase/client';

export interface PeriodStatus {
  action: 'create' | 'resume' | 'configure' | 'view_last';
  title: string;
  message: string;
  currentPeriod?: PayrollPeriod | null;
  lastLiquidatedPeriod?: PayrollPeriod | null;
  lastLiquidatedPeriodId?: string;
  nextPeriod?: {
    startDate: string;
    endDate: string;
    type: string;
  } | null;
  hasConfiguration?: boolean;
}

export class PayrollPeriodDetectionService {
  static async detectPeriodStatus(): Promise<PeriodStatus> {
    try {
      console.log('🔍 Iniciando detección inteligente de período...');

      const companyId = await PayrollPeriodService.getCurrentUserCompanyId();
      if (!companyId) {
        return {
          action: 'configure',
          title: 'Configuración requerida',
          message: 'No se encontró información de la empresa',
          hasConfiguration: false
        };
      }

      // 1. Verificar configuración de periodicidad
      const config = await PayrollConfigurationService.getCompanySettingsForceRefresh(companyId);
      if (!config || !config.periodicity) {
        console.log('❌ No hay configuración de periodicidad');
        return {
          action: 'configure',
          title: 'Configurar periodicidad',
          message: 'Configura la periodicidad de nómina en Configuración para continuar',
          hasConfiguration: false
        };
      }

      console.log('✅ Configuración encontrada:', config.periodicity);

      // 2. Buscar período activo en payroll_periods
      const activePeriod = await PayrollPeriodService.getCurrentActivePeriod();
      
      // 3. Buscar el último período liquidado
      const { lastLiquidatedPeriod, lastLiquidatedPeriodId } = await this.findLastLiquidatedPeriod();

      if (activePeriod) {
        console.log('📋 Período activo encontrado:', activePeriod.id);
        return {
          action: 'resume',
          title: 'Continuar período actual',
          message: `Continúa con el período ${PayrollPeriodService.formatPeriodText(activePeriod.fecha_inicio, activePeriod.fecha_fin)}`,
          currentPeriod: activePeriod,
          lastLiquidatedPeriod,
          lastLiquidatedPeriodId,
          hasConfiguration: true
        };
      }

      // 4. Si no hay período activo, generar siguiente período
      const nextPeriodDates = PayrollPeriodService.generatePeriodDates(config.periodicity);
      
      console.log('📅 Siguiente período calculado:', nextPeriodDates);

      return {
        action: 'create',
        title: lastLiquidatedPeriod ? 'Crear nuevo período' : 'Primer período de nómina',
        message: lastLiquidatedPeriod 
          ? `Crear nuevo período de nómina ${PayrollPeriodService.formatPeriodText(nextPeriodDates.startDate, nextPeriodDates.endDate)}`
          : 'Crear tu primer período de nómina',
        currentPeriod: null,
        lastLiquidatedPeriod,
        lastLiquidatedPeriodId,
        nextPeriod: {
          startDate: nextPeriodDates.startDate,
          endDate: nextPeriodDates.endDate,
          type: config.periodicity
        },
        hasConfiguration: true
      };

    } catch (error) {
      console.error('❌ Error en detección de período:', error);
      return {
        action: 'configure',
        title: 'Error de configuración',
        message: 'Error al detectar el estado de la nómina. Verifica la configuración.',
        hasConfiguration: false
      };
    }
  }

  private static async findLastLiquidatedPeriod(): Promise<{
    lastLiquidatedPeriod: PayrollPeriod | null;
    lastLiquidatedPeriodId: string | null;
  }> {
    try {
      const companyId = await PayrollPeriodService.getCurrentUserCompanyId();
      if (!companyId) return { lastLiquidatedPeriod: null, lastLiquidatedPeriodId: null };

      console.log('🔍 Buscando último período liquidado en historial...');

      // Primero buscar en payrolls (datos reales del historial)
      const payrollHistory = await PayrollHistoryService.getPayrollPeriods();
      
      if (payrollHistory && payrollHistory.length > 0) {
        console.log('📋 Períodos encontrados en historial:', payrollHistory.length);
        
        // Ordenar por fecha de creación (más reciente primero)
        const sortedHistory = payrollHistory.sort((a, b) => 
          new Date(b.fechaCreacion || '').getTime() - new Date(a.fechaCreacion || '').getTime()
        );
        
        const lastHistoryRecord = sortedHistory[0];
        console.log('📊 Último período del historial:', lastHistoryRecord?.periodo);

        if (lastHistoryRecord) {
          // Intentar encontrar este período en payroll_periods por coincidencia de fechas/período
          const { data: payrollPeriods, error } = await supabase
            .from('payroll_periods')
            .select('*')
            .eq('company_id', companyId)
            .neq('estado', 'borrador')
            .order('created_at', { ascending: false })
            .limit(10);

          if (!error && payrollPeriods && payrollPeriods.length > 0) {
            // Buscar coincidencia por fechas o período
            const matchingPeriod = payrollPeriods.find(p => {
              const formattedPeriod = PayrollPeriodService.formatPeriodText(p.fecha_inicio, p.fecha_fin);
              return formattedPeriod === lastHistoryRecord.periodo;
            });

            if (matchingPeriod) {
              console.log('✅ Período encontrado en payroll_periods:', matchingPeriod.id);
              return {
                lastLiquidatedPeriod: matchingPeriod as PayrollPeriod,
                lastLiquidatedPeriodId: matchingPeriod.id
              };
            }
          }

          // Si no se encuentra en payroll_periods, usar el ID del historial
          console.log('📝 Usando ID del historial:', lastHistoryRecord.id);
          return {
            lastLiquidatedPeriod: null,
            lastLiquidatedPeriodId: lastHistoryRecord.id
          };
        }
      }

      // Si no hay historial en payrolls, buscar en payroll_periods cerrados
      const { data: closedPeriods, error } = await supabase
        .from('payroll_periods')
        .select('*')
        .eq('company_id', companyId)
        .in('estado', ['cerrada', 'procesada', 'pagada'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && closedPeriods) {
        console.log('📋 Último período cerrado encontrado:', closedPeriods.id);
        return {
          lastLiquidatedPeriod: closedPeriods as PayrollPeriod,
          lastLiquidatedPeriodId: closedPeriods.id
        };
      }

      console.log('ℹ️ No se encontraron períodos liquidados');
      return { lastLiquidatedPeriod: null, lastLiquidatedPeriodId: null };

    } catch (error) {
      console.error('❌ Error buscando último período liquidado:', error);
      return { lastLiquidatedPeriod: null, lastLiquidatedPeriodId: null };
    }
  }
}
