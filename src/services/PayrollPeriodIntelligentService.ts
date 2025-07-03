import { supabase } from '@/integrations/supabase/client';
import { PAYROLL_STATES } from '@/constants/payrollStates';
import { PeriodNameUnifiedService } from './payroll-intelligent/PeriodNameUnifiedService';
import { PayrollPeriodCalculationService } from './payroll-intelligent/PayrollPeriodCalculationService';

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
  };
  action: 'resume' | 'create' | 'suggest_next';
  message: string;
}

export class PayrollPeriodIntelligentService {
  /**
   * DETECCIÓN MEJORADA - PRIORIDAD ABSOLUTA AL PERÍODO ACTUAL
   * 1. Buscar período activo (borrador)
   * 2. Detectar período ACTUAL basado en fecha de HOY
   * 3. Solo como fallback: buscar siguiente período
   */
  static async detectCurrentPeriod(): Promise<PeriodStatus> {
    try {
      console.log('🎯 DETECCIÓN CON PRIORIDAD ABSOLUTA AL PERÍODO ACTUAL...');
      
      const companyId = await this.getCurrentUserCompanyId();
      if (!companyId) {
        throw new Error('No se encontró información de la empresa');
      }

      console.log('🏢 Company ID detectado:', companyId);

      // PASO 1: ASEGURAR CONFIGURACIÓN DE EMPRESA
      const settings = await this.ensureCompanySettings(companyId);
      const periodicity = settings.periodicity;
      
      console.log('⚙️ Configuración asegurada - periodicidad:', periodicity);
      
      // PASO 2: Buscar período activo (borrador)
      const activePeriod = await this.findActivePeriod(companyId);
      
      if (activePeriod) {
        console.log('✅ Período activo encontrado:', activePeriod.periodo);
        // VALIDAR que el nombre coincida con las fechas
        await this.validatePeriodNameConsistency(activePeriod);
        
        return {
          hasActivePeriod: true,
          currentPeriod: activePeriod,
          action: 'resume',
          message: `Continuando con el período ${activePeriod.periodo}`
        };
      }

      console.log('📅 No hay período activo, detectando período ACTUAL basado en FECHA DE HOY...');

      // PASO 3: DETECTAR PERÍODO ACTUAL BASADO EN FECHA DE HOY
      const currentPeriodDates = await this.generateTodaysPeriodDates(periodicity);
      console.log('📊 Fechas del período ACTUAL calculadas:', currentPeriodDates);

      // Verificar si ya existe un período que coincida con las fechas actuales
      const existingCurrentPeriod = await this.findPeriodByDates(companyId, currentPeriodDates.startDate, currentPeriodDates.endDate);
      
      if (existingCurrentPeriod) {
        console.log('✅ Período actual existente encontrado:', existingCurrentPeriod.periodo);
        
        // VALIDAR consistencia de nombre
        await this.validatePeriodNameConsistency(existingCurrentPeriod);
        
        if (existingCurrentPeriod.estado === 'borrador') {
          return {
            hasActivePeriod: true,
            currentPeriod: existingCurrentPeriod,
            action: 'resume',
            message: `Continuando con el período actual ${existingCurrentPeriod.periodo}`
          };
        } else {
          // Si el período actual ya está cerrado, buscar el siguiente
          console.log('📋 Período actual ya cerrado, buscando siguiente...');
          return await this.handleClosedCurrentPeriod(companyId, periodicity, existingCurrentPeriod);
        }
      }

      // PASO 4: Si no existe período actual, crearlo automáticamente
      console.log('🆕 Creando período actual automáticamente...');
      const newCurrentPeriod = await this.createAutomaticPeriod(companyId, currentPeriodDates, periodicity);
      
      return {
        hasActivePeriod: true,
        currentPeriod: newCurrentPeriod,
        action: 'create',
        message: `Período actual creado: ${newCurrentPeriod.periodo}`
      };

    } catch (error) {
      console.error('❌ ERROR CRÍTICO EN DETECCIÓN:', error);
      throw error;
    }
  }

  /**
   * NUEVO: Generar fechas del período ACTUAL basado en la fecha de HOY
   */
  static async generateTodaysPeriodDates(periodicity: string): Promise<{ startDate: string; endDate: string }> {
    try {
      const { PeriodStrategyFactory } = await import('./payroll-intelligent/PeriodGenerationStrategy');
      const strategy = PeriodStrategyFactory.createStrategy(periodicity);
      
      // Usar método específico para período actual (no siguiente)
      const currentPeriod = strategy.generateCurrentPeriod();
      console.log('📅 Período actual generado basado en HOY:', currentPeriod);
      
      return currentPeriod;
    } catch (error) {
      console.error('❌ Error generando período actual:', error);
      // Fallback: usar lógica de primer período
      const { PeriodStrategyFactory } = await import('./payroll-intelligent/PeriodGenerationStrategy');
      const strategy = PeriodStrategyFactory.createStrategy(periodicity);
      return strategy.generateFirstPeriod();
    }
  }

  /**
   * NUEVO: Validar consistencia entre nombre del período y fechas almacenadas
   */
  static async validatePeriodNameConsistency(period: PayrollPeriod): Promise<void> {
    try {
      const { getPeriodNameFromDates } = await import('@/utils/periodDateUtils');
      const correctName = getPeriodNameFromDates(period.fecha_inicio, period.fecha_fin);
      
      if (correctName !== period.periodo) {
        console.log(`⚠️ INCONSISTENCIA DETECTADA: "${period.periodo}" → "${correctName}"`);
        
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
      }
    } catch (error) {
      console.error('❌ Error validando consistencia:', error);
    }
  }

  /**
   * NUEVO: Buscar período por fechas exactas
   */
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

  /**
   * NUEVO: Manejar cuando el período actual ya está cerrado
   */
  static async handleClosedCurrentPeriod(companyId: string, periodicity: string, closedPeriod: PayrollPeriod): Promise<PeriodStatus> {
    try {
      console.log('🔒 Manejando período actual cerrado, calculando siguiente...');
      
      // Calcular siguiente período basado en el período actual cerrado
      const nextPeriodDates = await PayrollPeriodCalculationService.calculateNextPeriodFromDatabase(
        periodicity, 
        companyId
      );

      return {
        hasActivePeriod: false,
        nextPeriod: {
          startDate: nextPeriodDates.startDate,
          endDate: nextPeriodDates.endDate,
          type: periodicity
        },
        action: 'suggest_next',
        message: `Período actual (${closedPeriod.periodo}) ya cerrado. Listo para crear siguiente: ${nextPeriodDates.startDate} - ${nextPeriodDates.endDate}`
      };
    } catch (error) {
      console.error('❌ Error manejando período cerrado:', error);
      throw error;
    }
  }

  // 🆕 NUEVO: Buscar último período cerrado con robustez mejorada
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
      
      let { data: settings, error } = await supabase
        .from('company_settings')
        .select('*')
        .eq('company_id', companyId)
        .single();

      if (error && error.code === 'PGRST116') {
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
        settings = newSettings;
      } else if (error) {
        throw error;
      }

      console.log('📊 Configuración obtenida:', settings?.periodicity);
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
      const periodName = PeriodNameUnifiedService.generateUnifiedPeriodName({
        startDate: dates.startDate,
        endDate: dates.endDate,
        periodicity: periodicity as any
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
      
      console.log('✅ Período automático creado:', data);
      return data as PayrollPeriod;
    } catch (error) {
      console.error('❌ Error creating automatic period:', error);
      throw error;
    }
  }

  // 🔒 3. Validación de estados y reglas
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
