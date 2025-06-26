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
  // Cache para evitar múltiples llamadas
  private static configCache: { [key: string]: any } = {};
  private static cacheTimestamp: { [key: string]: number } = {};
  private static CACHE_DURATION = 5000; // 5 segundos

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
      const companySettings = await this.getCompanySettingsForceRefresh(companyId);
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
      const nextPeriodDates = this.calculateNextPeriod(
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

  // Obtener configuración de empresa con refresh forzado y sin cache
  private static async getCompanySettingsForceRefresh(companyId: string) {
    try {
      console.log('🔄 Forzando refresh completo de configuración para empresa:', companyId);
      
      // Invalidar cache explícitamente
      delete this.configCache[companyId];
      delete this.cacheTimestamp[companyId];
      
      // Hacer consulta directa con timestamp para evitar cache del navegador
      const timestamp = Date.now();
      console.log('⏰ Timestamp de consulta:', timestamp);
      
      const { data, error } = await supabase
        .from('company_settings')
        .select('*')
        .eq('company_id', companyId)
        // Agregar un filtro dummy que siempre sea true para forzar nueva consulta
        .gte('created_at', '1970-01-01')
        .single();

      if (error) {
        console.log('❌ Error en consulta de configuración:', error);
        console.log('No company settings found, will create defaults');
        return null;
      }
      
      console.log('✅ Configuración obtenida directamente de BD:', data);
      console.log('📊 Periodicidad actual en BD:', data.periodicity);
      
      // Guardar en cache con timestamp actual
      this.configCache[companyId] = data;
      this.cacheTimestamp[companyId] = timestamp;
      
      return data;
    } catch (error) {
      console.error('❌ Error getting company configuration:', error);
      return null;
    }
  }

  // Método para invalidar cache manualmente
  static invalidateConfigurationCache(companyId?: string) {
    if (companyId) {
      delete this.configCache[companyId];
      delete this.cacheTimestamp[companyId];
      console.log('🗑️ Cache invalidado para empresa:', companyId);
    } else {
      this.configCache = {};
      this.cacheTimestamp = {};
      console.log('🗑️ Cache completo invalidado');
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

  // Calcular siguiente periodo basado en el último cerrado
  private static calculateNextPeriod(
    periodicity: string, 
    lastPeriod?: PayrollPeriod | null
  ): { startDate: string; endDate: string } {
    console.log('📊 Calculando periodo con periodicidad:', periodicity);
    
    if (!lastPeriod) {
      // Si no hay periodo anterior, usar la periodicidad configurada correctamente
      console.log('📅 No hay periodo anterior, generando periodo inicial con periodicidad:', periodicity);
      const result = PayrollPeriodService.generatePeriodDates(periodicity);
      console.log('📅 Periodo inicial generado:', result);
      return result;
    }

    const lastEndDate = new Date(lastPeriod.fecha_fin);
    const nextStartDate = new Date(lastEndDate);
    nextStartDate.setDate(lastEndDate.getDate() + 1); // Día siguiente al último periodo

    // Calcular el fin del siguiente periodo basado en la periodicidad configurada
    let nextEndDate: Date;
    
    switch (periodicity) {
      case 'semanal':
        console.log('📅 Calculando periodo semanal');
        nextEndDate = new Date(nextStartDate);
        nextEndDate.setDate(nextStartDate.getDate() + 6); // 7 días total
        break;
        
      case 'quincenal':
        console.log('📅 Calculando periodo quincenal');
        nextEndDate = new Date(nextStartDate);
        nextEndDate.setDate(nextStartDate.getDate() + 14); // 15 días total
        break;
        
      case 'mensual':
        console.log('📅 Calculando periodo mensual');
        nextEndDate = new Date(nextStartDate);
        nextEndDate.setMonth(nextStartDate.getMonth() + 1);
        nextEndDate.setDate(0); // Último día del mes
        break;
        
      default:
        // Fallback a mensual
        console.log('📅 Periodicidad no reconocida, usando mensual como fallback');
        nextEndDate = new Date(nextStartDate);
        nextEndDate.setMonth(nextStartDate.getMonth() + 1);
        nextEndDate.setDate(0);
    }

    const result = {
      startDate: nextStartDate.toISOString().split('T')[0],
      endDate: nextEndDate.toISOString().split('T')[0]
    };

    console.log('📅 Periodo calculado:', result);
    return result;
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
