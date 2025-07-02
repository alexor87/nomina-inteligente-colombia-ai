import { PayrollPeriod } from '@/types/payroll';
import { PayrollPeriodService } from '../PayrollPeriodService';
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

      // 4. Si no hay período activo, verificar si existe un período que cubra la fecha actual
      const currentDate = new Date().toISOString().split('T')[0];
      const existingPeriodForCurrentDate = await this.findPeriodForDate(currentDate, companyId);
      
      if (existingPeriodForCurrentDate && existingPeriodForCurrentDate.estado !== 'borrador') {
        console.log('📋 Período existente encontrado para fecha actual:', existingPeriodForCurrentDate.id);
        
        // Si el período ya está cerrado/aprobado, calcular el siguiente período disponible
        if (existingPeriodForCurrentDate.estado === 'aprobado' || existingPeriodForCurrentDate.estado === 'cerrado') {
          console.log('🔄 Período ya procesado, calculando siguiente período...');
          
          // Calcular el siguiente período basado en el período existente
          const nextPeriodDates = this.calculateNextPeriodDates(config.periodicity, existingPeriodForCurrentDate as PayrollPeriod);
          
          // Verificar si el período calculado se superpone con uno existente
          const hasOverlap = await this.checkPeriodOverlap(nextPeriodDates.startDate, nextPeriodDates.endDate, companyId);
          
          if (hasOverlap) {
            // Intentar encontrar el siguiente período disponible
            const nextAvailablePeriod = await this.findNextAvailablePeriod(config.periodicity, companyId);
            
            if (nextAvailablePeriod) {
              return {
                action: 'create',
                title: 'Crear siguiente período',
                message: `El período actual ya fue procesado. ¿Deseas abrir el siguiente período de nómina ${PayrollPeriodService.formatPeriodText(nextAvailablePeriod.startDate, nextAvailablePeriod.endDate)}?`,
                currentPeriod: null,
                lastLiquidatedPeriod: existingPeriodForCurrentDate as PayrollPeriod,
                lastLiquidatedPeriodId: existingPeriodForCurrentDate.id,
                nextPeriod: {
                  startDate: nextAvailablePeriod.startDate,
                  endDate: nextAvailablePeriod.endDate,
                  type: config.periodicity
                },
                hasConfiguration: true
              };
            }
          } else {
            // El período calculado no se superpone, ofrecerlo
            return {
              action: 'create',
              title: 'Crear siguiente período',
              message: `El período actual ya fue procesado. ¿Deseas abrir el siguiente período de nómina ${PayrollPeriodService.formatPeriodText(nextPeriodDates.startDate, nextPeriodDates.endDate)}?`,
              currentPeriod: null,
              lastLiquidatedPeriod: existingPeriodForCurrentDate as PayrollPeriod,
              lastLiquidatedPeriodId: existingPeriodForCurrentDate.id,
              nextPeriod: {
                startDate: nextPeriodDates.startDate,
                endDate: nextPeriodDates.endDate,
                type: config.periodicity
              },
              hasConfiguration: true
            };
          }
          
          // Si no se puede calcular el siguiente período, mostrar mensaje de no disponible
          return {
            action: 'view_last',
            title: 'No hay períodos disponibles',
            message: 'No se pudo calcular el siguiente período disponible. Revisa la configuración o contacta soporte.',
            currentPeriod: null,
            lastLiquidatedPeriod: existingPeriodForCurrentDate as PayrollPeriod,
            lastLiquidatedPeriodId: existingPeriodForCurrentDate.id,
            hasConfiguration: true
          };
        }
      }

      // 5. Generar siguiente período inteligentemente
      const nextPeriodDates = this.calculateNextPeriodDates(config.periodicity, lastLiquidatedPeriod);
      
      // 6. Verificar si el período calculado se superpone con uno existente
      const hasOverlap = await this.checkPeriodOverlap(nextPeriodDates.startDate, nextPeriodDates.endDate, companyId);
      
      if (hasOverlap) {
        console.log('⚠️ Período calculado se superpone con uno existente');
        // Intentar calcular el siguiente período disponible
        const nextAvailablePeriod = await this.findNextAvailablePeriod(config.periodicity, companyId);
        
        if (nextAvailablePeriod) {
          return {
            action: 'create',
            title: 'Crear siguiente período disponible',
            message: `Crear período ${PayrollPeriodService.formatPeriodText(nextAvailablePeriod.startDate, nextAvailablePeriod.endDate)}`,
            currentPeriod: null,
            lastLiquidatedPeriod,
            lastLiquidatedPeriodId,
            nextPeriod: {
              startDate: nextAvailablePeriod.startDate,
              endDate: nextAvailablePeriod.endDate,
              type: config.periodicity
            },
            hasConfiguration: true
          };
        } else {
          return {
            action: 'view_last',
            title: 'No hay períodos disponibles',
            message: 'Todos los períodos disponibles ya han sido creados. Revisa el historial de nóminas.',
            currentPeriod: null,
            lastLiquidatedPeriod,
            lastLiquidatedPeriodId,
            hasConfiguration: true
          };
        }
      }

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

  private static async findPeriodForDate(date: string, companyId: string): Promise<any> {
    try {
      const { data: period, error } = await supabase
        .from('payroll_periods_real')
        .select('*')
        .eq('company_id', companyId)
        .lte('fecha_inicio', date)
        .gte('fecha_fin', date)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return period;
    } catch (error) {
      console.error('❌ Error buscando período para fecha:', error);
      return null;
    }
  }

  private static async checkPeriodOverlap(startDate: string, endDate: string, companyId: string): Promise<boolean> {
    try {
      const { data: periods, error } = await supabase
        .from('payroll_periods_real')
        .select('*')
        .eq('company_id', companyId)
        .neq('estado', 'cancelado');

      if (error) throw error;

      if (!periods || periods.length === 0) return false;

      const newStart = new Date(startDate).getTime();
      const newEnd = new Date(endDate).getTime();

      for (const period of periods) {
        const periodStart = new Date(period.fecha_inicio).getTime();
        const periodEnd = new Date(period.fecha_fin).getTime();
        
        // Verificar si hay superposición
        const overlaps = newStart <= periodEnd && newEnd >= periodStart;
        if (overlaps) {
          console.log('⚠️ Superposición detectada con período:', period.id);
          return true;
        }
      }

      return false;
    } catch (error) {
      console.error('❌ Error verificando superposición:', error);
      return false;
    }
  }

  private static calculateNextPeriodDates(periodicity: string, lastPeriod?: PayrollPeriod | null): { startDate: string; endDate: string } {
    if (lastPeriod) {
      // Calcular siguiente período basado en el último
      const lastEndDate = new Date(lastPeriod.fecha_fin);
      const nextStartDate = new Date(lastEndDate);
      nextStartDate.setDate(nextStartDate.getDate() + 1);

      let nextEndDate: Date;
      if (periodicity === 'quincenal') {
        nextEndDate = new Date(nextStartDate);
        nextEndDate.setDate(nextEndDate.getDate() + 14);
      } else { // mensual
        nextEndDate = new Date(nextStartDate);
        nextEndDate.setMonth(nextEndDate.getMonth() + 1);
        nextEndDate.setDate(nextEndDate.getDate() - 1);
      }

      return {
        startDate: nextStartDate.toISOString().split('T')[0],
        endDate: nextEndDate.toISOString().split('T')[0]
      };
    } else {
      // Usar la lógica existente para el primer período
      return PayrollPeriodService.generatePeriodDates(periodicity);
    }
  }

  private static async findNextAvailablePeriod(periodicity: string, companyId: string): Promise<{ startDate: string; endDate: string } | null> {
    try {
      console.log('🔍 Buscando siguiente período disponible para periodicidad:', periodicity);

      // Import validation service to use new validation logic
      const { PayrollPeriodValidationService } = await import('./PayrollPeriodValidationService');

      // Obtener todos los períodos existentes desde payroll_periods_real
      const { data: periods, error } = await supabase
        .from('payroll_periods_real')
        .select('*')
        .eq('company_id', companyId)
        .order('fecha_fin', { ascending: false });

      if (error) throw error;

      if (!periods || periods.length === 0) {
        // Si no hay períodos, generar el primero
        console.log('📅 No hay períodos existentes, generando el primero');
        return PayrollPeriodService.generatePeriodDates(periodicity);
      }

      // Encontrar el último período y calcular el siguiente disponible
      const latestPeriod = periods[0];
      const lastEndDate = new Date(latestPeriod.fecha_fin);
      console.log('📊 Último período encontrado:', latestPeriod.fecha_inicio, '-', latestPeriod.fecha_fin);
      
      // Calcular hasta 12 períodos hacia adelante para encontrar uno disponible
      for (let i = 1; i <= 12; i++) {
        const candidateStart = new Date(lastEndDate);
        candidateStart.setDate(candidateStart.getDate() + 1);

        let candidateEnd: Date;
        if (periodicity === 'quincenal') {
          candidateStart.setDate(candidateStart.getDate() + (i - 1) * 15);
          candidateEnd = new Date(candidateStart);
          candidateEnd.setDate(candidateEnd.getDate() + 14);
        } else if (periodicity === 'semanal') {
          candidateStart.setDate(candidateStart.getDate() + (i - 1) * 7);
          candidateEnd = new Date(candidateStart);
          candidateEnd.setDate(candidateEnd.getDate() + 6);
        } else { // mensual
          candidateStart.setMonth(candidateStart.getMonth() + (i - 1));
          candidateEnd = new Date(candidateStart);
          candidateEnd.setMonth(candidateEnd.getMonth() + 1);
          candidateEnd.setDate(candidateEnd.getDate() - 1);
        }

        const startStr = candidateStart.toISOString().split('T')[0];
        const endStr = candidateEnd.toISOString().split('T')[0];

        console.log(`📅 Evaluando período candidato ${i}: ${startStr} - ${endStr}`);

        // Usar validación integral para verificar si este período es válido
        const validation = await PayrollPeriodValidationService.validatePeriodCreation(
          startStr, 
          endStr, 
          companyId
        );

        if (validation.isValid) {
          console.log(`✅ Período disponible encontrado: ${startStr} - ${endStr}`);
          return { startDate: startStr, endDate: endStr };
        } else {
          console.log(`❌ Período ${startStr} - ${endStr} no válido:`, validation.errors);
        }
      }

      console.log('⚠️ No se encontraron períodos disponibles en los próximos 12 períodos');
      return null;
    } catch (error) {
      console.error('❌ Error encontrando siguiente período disponible:', error);
      return null;
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
          // Intentar encontrar este período en payroll_periods_real por coincidencia de fechas/período
          const { data: payrollPeriods, error } = await supabase
            .from('payroll_periods_real')
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
              console.log('✅ Período encontrado en payroll_periods_real:', matchingPeriod.id);
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

      // Si no hay historial en payrolls, buscar en payroll_periods_real cerrados
      const { data: closedPeriods, error } = await supabase
        .from('payroll_periods_real')
        .select('*')
        .eq('company_id', companyId)
        .in('estado', ['cerrada', 'procesada', 'pagada', 'aprobado'])
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
