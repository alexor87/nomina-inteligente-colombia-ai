import { supabase } from '@/integrations/supabase/client';
import { PAYROLL_STATES } from '@/constants/payrollStates';
import { PeriodNameUnifiedService } from './payroll-intelligent/PeriodNameUnifiedService';
import { PayrollPeriodCalculationService } from './payroll-intelligent/PayrollPeriodCalculationService';
import { PayrollConfigurationService } from './payroll-intelligent/PayrollConfigurationService';

interface CompanySettings {
  id: string;
  company_id: string;
  periodicity: 'mensual' | 'quincenal' | 'semanal' | 'personalizado';
  custom_period_days?: number;
  created_at: string;
  updated_at: string;
}

interface PayrollPeriod {
  id: string;
  company_id: string;
  fecha_inicio: string;
  fecha_fin: string;
  estado: 'borrador' | 'en_proceso' | 'cerrado' | 'aprobado';
  tipo_periodo: 'mensual' | 'quincenal' | 'semanal' | 'personalizado';
  periodo: string;
  empleados_count: number;
  total_devengado: number;
  total_deducciones: number;
  total_neto: number;
  created_at: string;
  updated_at: string;
}

export interface PeriodStatus {
  hasActivePeriod: boolean;
  currentPeriod?: PayrollPeriod;
  nextPeriod?: {
    startDate: string;
    endDate: string;
    type: string;
    calculatedDays: number;
  };
  action: 'resume' | 'create' | 'suggest_next';
  message: string;
}

export class PayrollPeriodIntelligentService {
  /**
   * DETECCIÓN DINÁMICA CORREGIDA - RESPETA CONFIGURACIÓN DE EMPRESA
   */
  static async detectCurrentPeriod(): Promise<PeriodStatus> {
    try {
      console.log('🎯 DETECCIÓN DINÁMICA - RESPETANDO CONFIGURACIÓN DE EMPRESA...');
      
      const companyId = await this.getCurrentUserCompanyId();
      if (!companyId) {
        throw new Error('No se encontró información de la empresa');
      }

      console.log('🏢 Company ID detectado:', companyId);

      // PASO 1: OBTENER CONFIGURACIÓN DINÁMICA DE EMPRESA
      const settings = await this.ensureCompanySettings(companyId);
      const periodicity = settings.periodicity;
      const customDays = settings.custom_period_days;
      
      console.log('⚙️ Configuración dinámica asegurada:', { periodicity, customDays });
      
      // PASO 2: GENERAR PERÍODO ACTUAL USANDO CONFIGURACIÓN DINÁMICA
      const actualCurrentPeriodDates = await this.generateDynamicTodaysPeriodDates(periodicity, customDays);
      console.log('📊 PERÍODO ACTUAL DINÁMICO CALCULADO:', actualCurrentPeriodDates);

      // PASO 3: Buscar período activo existente
      const activePeriod = await this.findActivePeriod(companyId);
      
      if (activePeriod) {
        console.log('🔍 Período activo encontrado:', activePeriod.periodo);
        
        // VALIDACIÓN CRÍTICA: Verificar si el período activo corresponde al período actual
        const isCurrentPeriod = this.isPeriodCurrent(activePeriod, actualCurrentPeriodDates);
        
        if (isCurrentPeriod) {
          console.log('✅ Período activo ES el período actual, FORZANDO corrección de nombre...');
          await this.forceCorrectPeriodName(activePeriod);
          
          return {
            hasActivePeriod: true,
            currentPeriod: activePeriod,
            action: 'resume',
            message: `Continuando con el período actual ${activePeriod.periodo}`
          };
        } else {
          console.log('⚠️ Período activo NO es el período actual, creando período correcto...');
          // Cerrar período obsoleto y crear el correcto
          await this.closeObsoletePeriod(activePeriod);
        }
      }

      // PASO 4: Verificar si ya existe el período actual correcto
      const existingCurrentPeriod = await this.findPeriodByDates(
        companyId, 
        actualCurrentPeriodDates.startDate, 
        actualCurrentPeriodDates.endDate
      );
      
      if (existingCurrentPeriod) {
        console.log('✅ Período actual correcto ya existe:', existingCurrentPeriod.periodo);
        
        // Asegurar que esté en estado borrador
        if (existingCurrentPeriod.estado !== 'borrador') {
          console.log('🔄 Convirtiendo período a borrador...');
          const { error } = await supabase
            .from('payroll_periods_real')
            .update({ estado: 'borrador' })
            .eq('id', existingCurrentPeriod.id);
            
          if (!error) {
            existingCurrentPeriod.estado = 'borrador';
          }
        }
        
        await this.forceCorrectPeriodName(existingCurrentPeriod);
        
        return {
          hasActivePeriod: true,
          currentPeriod: existingCurrentPeriod,
          action: 'resume',
          message: `Continuando con el período actual ${existingCurrentPeriod.periodo}`
        };
      }

      // PASO 5: CREAR PERÍODO ACTUAL AUTOMÁTICAMENTE CON CONFIGURACIÓN DINÁMICA
      console.log('🆕 CREANDO PERÍODO ACTUAL AUTOMÁTICAMENTE CON CONFIGURACIÓN DINÁMICA...');
      const newCurrentPeriod = await this.createAutomaticPeriod(
        companyId, 
        actualCurrentPeriodDates, 
        periodicity
      );
      
      return {
        hasActivePeriod: true,
        currentPeriod: newCurrentPeriod,
        action: 'create',
        message: `Período actual creado automáticamente: ${newCurrentPeriod.periodo}`
      };

    } catch (error) {
      console.error('❌ ERROR CRÍTICO EN DETECCIÓN DINÁMICA:', error);
      throw error;
    }
  }

  /**
   * NUEVA FUNCIÓN: Generar fechas del período ACTUAL usando configuración dinámica
   */
  static async generateDynamicTodaysPeriodDates(periodicity: string, customDays?: number): Promise<{ startDate: string; endDate: string }> {
    try {
      console.log('📅 GENERANDO PERÍODO ACTUAL DINÁMICO para:', { periodicity, customDays });
      
      const { PeriodStrategyFactory } = await import('./payroll-intelligent/PeriodGenerationStrategy');
      const strategy = PeriodStrategyFactory.createStrategy(periodicity, customDays);
      
      // CORRECCIÓN: Usar método dinámico para período actual
      const currentPeriod = strategy.generateCurrentPeriod();
      console.log('✅ PERÍODO ACTUAL DINÁMICO GENERADO:', currentPeriod);
      
      return currentPeriod;
    } catch (error) {
      console.error('❌ Error generando período actual dinámico:', error);
      // Fallback dinámico basado en configuración
      const { PeriodStrategyFactory } = await import('./payroll-intelligent/PeriodGenerationStrategy');
      const strategy = PeriodStrategyFactory.createStrategy(periodicity || 'mensual', customDays);
      const fallback = strategy.generateCurrentPeriod();
      console.log('🔄 FALLBACK DINÁMICO GENERADO:', fallback);
      return fallback;
    }
  }

  /**
   * NUEVA FUNCIÓN: Forzar corrección del nombre del período
   */
  static async forceCorrectPeriodName(period: PayrollPeriod): Promise<void> {
    try {
      console.log('🔧 FORZANDO CORRECCIÓN DE NOMBRE DEL PERÍODO:', period.id);
      
      const { getPeriodNameFromDates } = await import('@/utils/periodDateUtils');
      const correctName = getPeriodNameFromDates(period.fecha_inicio, period.fecha_fin);
      
      console.log(`📝 COMPARANDO NOMBRES: "${period.periodo}" vs "${correctName}"`);
      
      if (correctName !== period.periodo) {
        console.log(`🚨 NOMBRE INCORRECTO DETECTADO - FORZANDO CORRECCIÓN: "${period.periodo}" → "${correctName}"`);
        
        // Actualizar FORZOSAMENTE el nombre del período
        const { error } = await supabase
          .from('payroll_periods_real')
          .update({ 
            periodo: correctName,
            updated_at: new Date().toISOString()
          })
          .eq('id', period.id);

        if (error) {
          console.error('❌ Error forzando corrección de nombre:', error);
        } else {
          console.log('✅ NOMBRE FORZOSAMENTE CORREGIDO');
          period.periodo = correctName; // Actualizar en memoria
        }
      } else {
        console.log('✅ Nombre ya es correcto:', correctName);
      }
    } catch (error) {
      console.error('❌ Error en corrección forzada:', error);
    }
  }

  /**
   * NUEVO: Verificar si un período corresponde al período actual
   */
  static isPeriodCurrent(period: PayrollPeriod, currentDates: { startDate: string; endDate: string }): boolean {
    const matches = period.fecha_inicio === currentDates.startDate && 
                   period.fecha_fin === currentDates.endDate;
    
    console.log('🔍 VERIFICANDO SI ES PERÍODO ACTUAL:', {
      period: `${period.fecha_inicio} - ${period.fecha_fin}`,
      current: `${currentDates.startDate} - ${currentDates.endDate}`,
      matches
    });
    
    return matches;
  }

  /**
   * NUEVO: Cerrar período obsoleto
   */
  static async closeObsoletePeriod(period: PayrollPeriod): Promise<void> {
    try {
      console.log('🔒 CERRANDO PERÍODO OBSOLETO:', period.periodo);
      
      const { error } = await supabase
        .from('payroll_periods_real')
        .update({ 
          estado: 'cerrado',
          updated_at: new Date().toISOString()
        })
        .eq('id', period.id);

      if (error) {
        console.error('❌ Error cerrando período obsoleto:', error);
      } else {
        console.log('✅ Período obsoleto cerrado exitosamente');
      }
    } catch (error) {
      console.error('❌ Error en cierre de período obsoleto:', error);
    }
  }

  /**
   * CORREGIDO: Validar consistencia entre nombre del período y fechas almacenadas
   */
  static async validatePeriodNameConsistency(period: PayrollPeriod): Promise<void> {
    try {
      const { getPeriodNameFromDates } = await import('@/utils/periodDateUtils');
      const correctName = getPeriodNameFromDates(period.fecha_inicio, period.fecha_fin);
      
      if (correctName !== period.periodo) {
        console.log(`🔧 CORRECCIÓN DE NOMBRE: "${period.periodo}" → "${correctName}"`);
        
        // Corregir el nombre automáticamente
        const { error } = await supabase
          .from('payroll_periods_real')
          .update({ 
            periodo: correctName,
            updated_at: new Date().toISOString()
          })
          .eq('id', period.id);

        if (error) {
          console.error('❌ Error corrigiendo nombre:', error);
        } else {
          console.log('✅ Nombre corregido automáticamente');
          period.periodo = correctName; // Actualizar en memoria
        }
      } else {
        console.log('✅ Nombre ya es consistente:', correctName);
      }
    } catch (error) {
      console.error('❌ Error validando consistencia:', error);
    }
  }

  static async findPeriodByDates(companyId: string, startDate: string, endDate: string): Promise<PayrollPeriod | null> {
    try {
      console.log('🔍 Buscando período por fechas exactas:', startDate, '-', endDate);
      
      const { data, error } = await supabase
        .from('payroll_periods_real')
        .select('*')
        .eq('company_id', companyId)
        .eq('fecha_inicio', startDate)
        .eq('fecha_fin', endDate)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('❌ Error buscando período por fechas:', error);
        return null;
      }
      
      if (data) {
        console.log('✅ Período encontrado por fechas:', data.periodo);
      } else {
        console.log('ℹ️ No se encontró período para las fechas especificadas');
      }
      
      return data as PayrollPeriod;
    } catch (error) {
      console.error('❌ Error en búsqueda por fechas:', error);
      return null;
    }
  }

  static async handleClosedCurrentPeriod(companyId: string, periodicity: string, closedPeriod: PayrollPeriod, customDays?: number): Promise<PeriodStatus> {
    try {
      console.log('🔒 Manejando período actual cerrado, calculando siguiente con configuración dinámica...');
      
      const nextPeriodDates = await PayrollPeriodCalculationService.calculateNextPeriodFromDatabase(
        periodicity, 
        companyId
      );

      // Calcular días del siguiente período
      const calculatedDays = this.calculatePeriodDays(nextPeriodDates.startDate, nextPeriodDates.endDate);

      return {
        hasActivePeriod: false,
        nextPeriod: {
          startDate: nextPeriodDates.startDate,
          endDate: nextPeriodDates.endDate,
          type: periodicity,
          calculatedDays
        },
        action: 'suggest_next',
        message: `Período actual (${closedPeriod.periodo}) ya cerrado. Listo para crear siguiente: ${nextPeriodDates.startDate} - ${nextPeriodDates.endDate} (${calculatedDays} días)`
      };
    } catch (error) {
      console.error('❌ Error manejando período cerrado:', error);
      throw error;
    }
  }

  /**
   * NUEVA FUNCIÓN: Calcular días de un período
   */
  static calculatePeriodDays(startDate: string, endDate: string): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  }

  static async findLastClosedPeriodRobust(companyId: string, maxRetries: number = 5): Promise<PayrollPeriod | null> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔍 Búsqueda robusta de período cerrado (intento ${attempt}/${maxRetries})`);
        
        const { data, error } = await supabase
          .from('payroll_periods_real')
          .select('*')
          .eq('company_id', companyId)
          .in('estado', [PAYROLL_STATES.CERRADO, PAYROLL_STATES.PROCESADA, PAYROLL_STATES.PAGADA])
          .order('fecha_fin', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) {
          console.error(`❌ Error en intento ${attempt}:`, error);
          if (attempt === maxRetries) throw error;
          continue;
        }
        
        if (data) {
          console.log(`✅ Período cerrado encontrado en intento ${attempt}:`, data.periodo);
          return data as PayrollPeriod;
        } else {
          console.log(`ℹ️ No se encontró período cerrado en intento ${attempt}`);
        }
        
        if (attempt < maxRetries) {
          console.log(`⏰ Esperando ${1000 * attempt}ms antes del siguiente intento...`);
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
        
      } catch (error) {
        console.error(`❌ Error en intento ${attempt}:`, error);
        if (attempt === maxRetries) {
          console.error('❌ Todos los intentos fallaron');
          return null;
        }
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
    
    return null;
  }

  static async ensureCompanySettings(companyId: string): Promise<CompanySettings> {
    try {
      console.log('⚙️ Verificando configuración de empresa...');
      
      // USAR SERVICIO DE CONFIGURACIÓN PARA OBTENER DATOS FRESCOS
      const settings = await PayrollConfigurationService.getCompanySettingsForceRefresh(companyId);
      
      if (!settings) {
        console.log('🆕 Creando configuración por defecto...');
        
        const { data: newSettings, error: insertError } = await supabase
          .from('company_settings')
          .insert({
            company_id: companyId,
            periodicity: 'mensual'
          })
          .select()
          .single();

        if (insertError) throw insertError;
        
        console.log('✅ Configuración creada exitosamente');
        return newSettings as CompanySettings;
      }

      console.log('📊 Configuración obtenida:', { periodicity: settings.periodicity, customDays: settings.custom_period_days });
      return settings as CompanySettings;
    } catch (error) {
      console.error('❌ Error asegurando configuración:', error);
      throw error;
    }
  }

  static async getCurrentUserCompanyId(): Promise<string | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      return profile?.company_id || null;
    } catch (error) {
      console.error('Error getting company ID:', error);
      return null;
    }
  }

  static async findActivePeriod(companyId: string): Promise<PayrollPeriod | null> {
    try {
      const { data, error } = await supabase
        .from('payroll_periods_real')
        .select('*')
        .eq('company_id', companyId)
        .eq('estado', 'borrador')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as PayrollPeriod;
    } catch (error) {
      console.error('Error finding active period:', error);
      return null;
    }
  }

  static async createAutomaticPeriod(companyId: string, dates: { startDate: string; endDate: string }, periodicity: string): Promise<PayrollPeriod> {
    try {
      const { getPeriodNameFromDates } = await import('@/utils/periodDateUtils');
      const periodName = getPeriodNameFromDates(dates.startDate, dates.endDate);
      
      console.log('🆕 CREANDO PERÍODO AUTOMÁTICO:', {
        companyId,
        dates,
        periodicity,
        periodName
      });
      
      const { data, error } = await supabase
        .from('payroll_periods_real')
        .insert({
          company_id: companyId,
          fecha_inicio: dates.startDate,
          fecha_fin: dates.endDate,
          tipo_periodo: periodicity,
          periodo: periodName,
          estado: 'borrador'
        })
        .select()
        .single();

      if (error) throw error;
      
      console.log('✅ Período automático creado exitosamente:', data);
      return data as PayrollPeriod;
    } catch (error) {
      console.error('❌ Error creating automatic period:', error);
      throw error;
    }
  }

  static async validatePeriodRules(companyId: string, startDate: string, endDate: string): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];

    const { data: overlapping } = await supabase
      .from('payroll_periods_real')
      .select('*')
      .eq('company_id', companyId)
      .neq('estado', 'cancelado')
      .or(`fecha_inicio.lte.${endDate},fecha_fin.gte.${startDate}`);

    if (overlapping && overlapping.length > 0) {
      errors.push('Existe superposición con períodos existentes');
    }

    const { data: openPeriods } = await supabase
      .from('payroll_periods_real')
      .select('*')
      .eq('company_id', companyId)
      .eq('estado', 'borrador');

    if (openPeriods && openPeriods.length > 1) {
      errors.push('Solo se permite un período abierto por empresa');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}
