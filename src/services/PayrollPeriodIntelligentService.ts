
import { supabase } from '@/integrations/supabase/client';
import { PayrollPeriodService, PayrollPeriod } from './PayrollPeriodService';

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

export class PayrollPeriodIntelligentService {
  // Detectar estado inteligente del módulo de nómina
  static async detectPeriodStatus(): Promise<PeriodStatus> {
    try {
      console.log('🔍 Detectando estado inteligente del módulo de nómina...');
      
      const companyId = await PayrollPeriodService.getCurrentUserCompanyId();
      if (!companyId) {
        return {
          action: 'configure',
          message: 'Para poder liquidar la nómina, primero debes configurar la periodicidad desde el módulo de Configuración.',
          title: 'Configuración requerida'
        };
      }

      // Verificar configuración de empresa
      const companySettings = await PayrollPeriodService.getCompanySettings();
      if (!companySettings) {
        return {
          action: 'configure',
          message: 'Para poder liquidar la nómina, primero debes configurar la periodicidad desde el módulo de Configuración.',
          title: 'Configuración requerida'
        };
      }

      // Buscar periodo activo (borrador o en proceso)
      const activePeriod = await this.getActivePeriod(companyId);
      
      if (activePeriod) {
        // Existe un periodo abierto - reanudar
        const periodText = PayrollPeriodService.formatPeriodText(
          activePeriod.fecha_inicio, 
          activePeriod.fecha_fin
        );
        
        return {
          action: 'resume',
          currentPeriod: activePeriod,
          message: `Retomando la nómina en curso ${periodText}`,
          title: 'Nómina en curso'
        };
      }

      // No hay periodo activo - verificar si hay periodo cerrado reciente
      const lastClosedPeriod = await this.getLastClosedPeriod(companyId);
      const nextPeriodDates = this.calculateNextPeriod(
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
          message: `Ya cerraste la nómina ${lastPeriodText}. ¿Deseas iniciar la siguiente nómina ${nextPeriodText}?`,
          title: 'Iniciar nuevo periodo'
        };
      }

      // Primer periodo - crear automáticamente
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
    return data;
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
    return data;
  }

  // Calcular siguiente periodo basado en el último cerrado
  private static calculateNextPeriod(
    periodicity: string, 
    lastPeriod?: PayrollPeriod | null
  ): { startDate: string; endDate: string } {
    if (!lastPeriod) {
      // Si no hay periodo anterior, usar la fecha actual
      return PayrollPeriodService.generatePeriodDates(periodicity);
    }

    const lastEndDate = new Date(lastPeriod.fecha_fin);
    const nextStartDate = new Date(lastEndDate);
    nextStartDate.setDate(lastEndDate.getDate() + 1); // Día siguiente al último periodo

    // Calcular el fin del siguiente periodo
    let nextEndDate: Date;
    
    switch (periodicity) {
      case 'semanal':
        nextEndDate = new Date(nextStartDate);
        nextEndDate.setDate(nextStartDate.getDate() + 6);
        break;
        
      case 'quincenal':
        nextEndDate = new Date(nextStartDate);
        nextEndDate.setDate(nextStartDate.getDate() + 14);
        break;
        
      case 'mensual':
        nextEndDate = new Date(nextStartDate);
        nextEndDate.setMonth(nextStartDate.getMonth() + 1);
        nextEndDate.setDate(0); // Último día del mes
        break;
        
      default:
        // Fallback a mensual
        nextEndDate = new Date(nextStartDate);
        nextEndDate.setMonth(nextStartDate.getMonth() + 1);
        nextEndDate.setDate(0);
    }

    return {
      startDate: nextStartDate.toISOString().split('T')[0],
      endDate: nextEndDate.toISOString().split('T')[0]
    };
  }

  // Crear nuevo periodo inteligentemente
  static async createNextPeriod(nextPeriod: { startDate: string; endDate: string; type: string }): Promise<PayrollPeriod | null> {
    try {
      console.log('🚀 Creando nuevo periodo:', nextPeriod);
      
      const newPeriod = await PayrollPeriodService.createPayrollPeriod(
        nextPeriod.startDate,
        nextPeriod.endDate,
        nextPeriod.type
      );

      if (newPeriod) {
        // Registrar en logs de auditoría
        await this.logPeriodAction('create_period', newPeriod.id, {
          startDate: nextPeriod.startDate,
          endDate: nextPeriod.endDate,
          type: nextPeriod.type
        });
      }

      return newPeriod;
    } catch (error) {
      console.error('❌ Error creando nuevo periodo:', error);
      return null;
    }
  }

  // Registrar acciones en logs de auditoría
  private static async logPeriodAction(action: string, periodId: string, details: any): Promise<void> {
    try {
      const companyId = await PayrollPeriodService.getCurrentUserCompanyId();
      if (!companyId) return;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from('dashboard_activity').insert({
        company_id: companyId,
        user_email: user.email || '',
        type: 'payroll',
        action: action,
        // Almacenar detalles como string JSON ya que no hay columna details
        created_at: new Date().toISOString()
      });

      console.log(`📝 Acción registrada: ${action} para periodo ${periodId}`);
    } catch (error) {
      console.warn('⚠️ No se pudo registrar la acción en logs:', error);
    }
  }

  // Validar que no haya periodos superpuestos
  static async validateNonOverlappingPeriod(
    startDate: string, 
    endDate: string, 
    excludePeriodId?: string
  ): Promise<{ isValid: boolean; conflictPeriod?: PayrollPeriod }> {
    try {
      const companyId = await PayrollPeriodService.getCurrentUserCompanyId();
      if (!companyId) return { isValid: false };

      const query = supabase
        .from('payroll_periods')
        .select('*')
        .eq('company_id', companyId)
        .or(`fecha_inicio.lte.${endDate},fecha_fin.gte.${startDate}`);

      if (excludePeriodId) {
        query.neq('id', excludePeriodId);
      }

      const { data, error } = await query;

      if (error) throw error;

      if (data && data.length > 0) {
        return { 
          isValid: false, 
          conflictPeriod: data[0] as PayrollPeriod 
        };
      }

      return { isValid: true };
    } catch (error) {
      console.error('❌ Error validando superposición de periodos:', error);
      return { isValid: false };
    }
  }
}
