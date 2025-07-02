import { supabase } from '@/integrations/supabase/client';
import { PAYROLL_STATES } from '@/constants/payrollStates';

// Tipos específicos para este servicio basados en la base de datos real
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
  // 📅 1. Detección automática del período MEJORADA con manejo post-cierre
  static async detectCurrentPeriod(): Promise<PeriodStatus> {
    try {
      console.log('🔍 INICIANDO DETECCIÓN AUTOMÁTICA MEJORADA...');
      
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
        return {
          hasActivePeriod: true,
          currentPeriod: activePeriod,
          action: 'resume',
          message: `Continuando con el período ${activePeriod.periodo}`
        };
      }

      console.log('📋 No hay período activo, buscando último período cerrado...');

      // PASO 3: BUSCAR ÚLTIMO PERÍODO CERRADO CON RETRY MEJORADO
      const lastClosedPeriod = await this.findLastClosedPeriodWithRetry(companyId);
      
      if (lastClosedPeriod) {
        console.log('🔒 Último período cerrado encontrado:', lastClosedPeriod.periodo);
        console.log('📅 Fechas:', lastClosedPeriod.fecha_inicio, '-', lastClosedPeriod.fecha_fin);
        console.log('📊 Estado confirmado:', lastClosedPeriod.estado);
        
        // Calcular siguiente período basado en el cerrado
        const nextPeriodDates = this.generateNextPeriodFromClosed(lastClosedPeriod, periodicity);
        console.log('📊 Siguiente período calculado:', nextPeriodDates);
        
        // Verificar si ya existe un período para esas fechas
        const existingNextPeriod = await this.findPeriodByDates(companyId, nextPeriodDates.startDate, nextPeriodDates.endDate);
        
        if (existingNextPeriod) {
          console.log('⚠️ Ya existe período para esas fechas:', existingNextPeriod.id);
          // Buscar el siguiente disponible
          const nextAvailableDates = this.generateSubsequentPeriod(nextPeriodDates, periodicity);
          
          return {
            hasActivePeriod: false,
            nextPeriod: {
              startDate: nextAvailableDates.startDate,
              endDate: nextAvailableDates.endDate,
              type: periodicity
            },
            action: 'suggest_next',
            message: `Crear siguiente período disponible: ${this.formatPeriodName(nextAvailableDates.startDate, nextAvailableDates.endDate)}`
          };
        }
        
        return {
          hasActivePeriod: false,
          nextPeriod: {
            startDate: nextPeriodDates.startDate,
            endDate: nextPeriodDates.endDate,
            type: periodicity
          },
          action: 'suggest_next',
          message: `Crear siguiente período: ${this.formatPeriodName(nextPeriodDates.startDate, nextPeriodDates.endDate)}`
        };
      }

      // PASO 4: Si no hay períodos cerrados, crear el primer período
      console.log('🆕 No hay períodos previos, creando primer período...');
      const currentPeriodDates = this.generatePeriodDates(new Date(), periodicity);
      const newPeriod = await this.createAutomaticPeriod(companyId, currentPeriodDates, periodicity);
      
      return {
        hasActivePeriod: true,
        currentPeriod: newPeriod,
        action: 'create',
        message: `Primer período creado: ${newPeriod.periodo}`
      };

    } catch (error) {
      console.error('❌ ERROR CRÍTICO EN DETECCIÓN:', error);
      throw error;
    }
  }

  // 🆕 NUEVO: Buscar último período cerrado con retry para problemas post-cierre
  static async findLastClosedPeriodWithRetry(companyId: string, maxRetries: number = 3): Promise<PayrollPeriod | null> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔍 Buscando último período cerrado (intento ${attempt}/${maxRetries})`);
        
        const { data, error } = await supabase
          .from('payroll_periods_real')
          .select('*')
          .eq('company_id', companyId)
          .eq('estado', PAYROLL_STATES.CERRADO)
          .order('fecha_fin', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) {
          console.error(`❌ Error en intento ${attempt}:`, error);
          if (attempt === maxRetries) throw error;
          continue;
        }
        
        if (data) {
          console.log(`✅ Período cerrado encontrado en intento ${attempt}:`, data.periodo, 'ID:', data.id);
          console.log(`📊 Estado verificado: "${data.estado}"`);
          return data as PayrollPeriod;
        } else {
          console.log(`ℹ️ No se encontró período cerrado en intento ${attempt}`);
        }
        
        // Si no encontramos nada pero no hay error, esperar un poco antes del siguiente intento
        if (attempt < maxRetries) {
          console.log(`⏰ Esperando 1000ms antes del siguiente intento...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
      } catch (error) {
        console.error(`❌ Error en intento ${attempt} buscando período cerrado:`, error);
        if (attempt === maxRetries) {
          console.error('❌ Todos los intentos fallaron');
          return null;
        }
        // Esperar antes del siguiente intento
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
    
    return null;
  }

  // 🆕 NUEVO: Asegurar configuración de empresa
  static async ensureCompanySettings(companyId: string): Promise<CompanySettings> {
    try {
      console.log('⚙️ Verificando configuración de empresa...');
      
      // Intentar obtener configuración existente
      let { data: settings, error } = await supabase
        .from('company_settings')
        .select('*')
        .eq('company_id', companyId)
        .single();

      if (error && error.code === 'PGRST116') {
        // No existe configuración, crear una por defecto
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

  // 🆕 NUEVO: Buscar último período cerrado
  static async findLastClosedPeriod(companyId: string): Promise<PayrollPeriod | null> {
    try {
      const { data, error } = await supabase
        .from('payroll_periods_real')
        .select('*')
        .eq('company_id', companyId)
        .eq('estado', 'cerrado')
        .order('fecha_fin', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        console.log('🔒 Último período cerrado:', data.periodo, 'ID:', data.id);
      }
      
      return data as PayrollPeriod;
    } catch (error) {
      console.error('❌ Error buscando último período cerrado:', error);
      return null;
    }
  }

  // 🆕 NUEVO: Generar siguiente período basado en período cerrado específico
  static generateNextPeriodFromClosed(closedPeriod: PayrollPeriod, periodicity: string) {
    console.log('📅 Generando siguiente período desde período cerrado:', closedPeriod.periodo);
    
    const lastEndDate = new Date(closedPeriod.fecha_fin);
    console.log('📆 Última fecha fin:', lastEndDate.toISOString().split('T')[0]);
    
    // El siguiente período inicia el día después del cierre
    const nextStartDate = new Date(lastEndDate);
    nextStartDate.setDate(nextStartDate.getDate() + 1);
    
    let nextEndDate: Date;
    
    switch (periodicity) {
      case 'mensual':
        nextEndDate = new Date(nextStartDate);
        nextEndDate.setMonth(nextEndDate.getMonth() + 1);
        nextEndDate.setDate(nextEndDate.getDate() - 1);
        break;
        
      case 'quincenal':
        nextEndDate = new Date(nextStartDate);
        nextEndDate.setDate(nextEndDate.getDate() + 14);
        break;
        
      case 'semanal':
        nextEndDate = new Date(nextStartDate);
        nextEndDate.setDate(nextEndDate.getDate() + 6);
        break;
        
      default:
        nextEndDate = new Date(nextStartDate);
        nextEndDate.setMonth(nextEndDate.getMonth() + 1);
        nextEndDate.setDate(nextEndDate.getDate() - 1);
    }

    const result = {
      startDate: nextStartDate.toISOString().split('T')[0],
      endDate: nextEndDate.toISOString().split('T')[0]
    };
    
    console.log('✅ Siguiente período calculado:', result);
    return result;
  }

  // 🆕 NUEVO: Buscar período por fechas específicas
  static async findPeriodByDates(companyId: string, startDate: string, endDate: string): Promise<PayrollPeriod | null> {
    try {
      const { data, error } = await supabase
        .from('payroll_periods_real')
        .select('*')
        .eq('company_id', companyId)
        .eq('fecha_inicio', startDate)
        .eq('fecha_fin', endDate)
        .maybeSingle();

      if (error) throw error;
      return data as PayrollPeriod;
    } catch (error) {
      console.error('❌ Error buscando período por fechas:', error);
      return null;
    }
  }

  // 🆕 NUEVO: Generar período subsecuente si ya existe
  static generateSubsequentPeriod(currentDates: { startDate: string; endDate: string }, periodicity: string) {
    const currentEndDate = new Date(currentDates.endDate);
    const nextStartDate = new Date(currentEndDate);
    nextStartDate.setDate(nextStartDate.getDate() + 1);
    
    return this.generatePeriodDates(nextStartDate, periodicity);
  }

  // 🔄 2. Reglas de generación y validación de períodos CORREGIDAS
  static generatePeriodDates(currentDate: Date, periodicity: string) {
    const today = new Date(currentDate);
    let startDate: Date;
    let endDate: Date;

    switch (periodicity) {
      case 'mensual':
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        break;
      
      case 'quincenal':
        const day = today.getDate();
        if (day <= 15) {
          startDate = new Date(today.getFullYear(), today.getMonth(), 1);
          endDate = new Date(today.getFullYear(), today.getMonth(), 15);
        } else {
          startDate = new Date(today.getFullYear(), today.getMonth(), 16);
          endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        }
        break;
      
      case 'semanal':
        const dayOfWeek = today.getDay();
        const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        startDate = new Date(today);
        startDate.setDate(today.getDate() + mondayOffset);
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        break;
      
      default:
        throw new Error(`Periodicidad no soportada: ${periodicity}`);
    }

    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    };
  }

  static formatPeriodName(startDate: string, endDate: string): string {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    const months = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    
    if (start.getMonth() === end.getMonth()) {
      if (start.getDate() === 1 && end.getDate() <= 15) {
        return `${months[start.getMonth()]} ${start.getFullYear()} - 1ra Quincena`;
      } else if (start.getDate() === 16) {
        return `${months[start.getMonth()]} ${start.getFullYear()} - 2da Quincena`;
      } else {
        return `${months[start.getMonth()]} ${start.getFullYear()}`;
      }
    } else {
      return `${start.getDate()}/${start.getMonth() + 1} - ${end.getDate()}/${end.getMonth() + 1}/${end.getFullYear()}`;
    }
  }

  // Métodos auxiliares existentes
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

  static async getCompanySettings(companyId: string): Promise<CompanySettings | null> {
    try {
      const { data, error } = await supabase
        .from('company_settings')
        .select('*')
        .eq('company_id', companyId)
        .single();

      if (error) throw error;
      return data as CompanySettings;
    } catch (error) {
      console.error('Error getting company settings:', error);
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
      const periodName = this.formatPeriodName(dates.startDate, dates.endDate);
      
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
