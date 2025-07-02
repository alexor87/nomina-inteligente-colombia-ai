
import { supabase } from '@/integrations/supabase/client';
import { PayrollPeriod, CompanySettings } from '@/types/payroll';

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
  // 📅 1. Detección automática del período
  static async detectCurrentPeriod(): Promise<PeriodStatus> {
    try {
      console.log('🔍 Iniciando detección automática de período...');
      
      const companyId = await this.getCurrentUserCompanyId();
      if (!companyId) {
        throw new Error('No se encontró información de la empresa');
      }

      // Obtener configuración de periodicidad
      const settings = await this.getCompanySettings(companyId);
      const periodicity = settings?.periodicity || 'mensual';
      
      console.log('📊 Periodicidad configurada:', periodicity);
      
      // Buscar período activo (borrador)
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

      // Verificar si el período actual ya está cerrado
      const currentPeriodDates = this.generatePeriodDates(new Date(), periodicity);
      const closedPeriod = await this.findClosedPeriod(companyId, currentPeriodDates.startDate, currentPeriodDates.endDate);
      
      if (closedPeriod) {
        console.log('📋 Período actual ya está cerrado, sugiriendo siguiente período');
        const nextPeriodDates = this.generateNextPeriodDates(closedPeriod, periodicity);
        
        return {
          hasActivePeriod: false,
          nextPeriod: {
            startDate: nextPeriodDates.startDate,
            endDate: nextPeriodDates.endDate,
            type: periodicity
          },
          action: 'suggest_next',
          message: `El período actual ya está cerrado. Crear nuevo período ${this.formatPeriodName(nextPeriodDates.startDate, nextPeriodDates.endDate)}`
        };
      }

      // Crear nuevo período para fechas actuales
      console.log('🆕 Creando nuevo período automáticamente...');
      const newPeriod = await this.createAutomaticPeriod(companyId, currentPeriodDates, periodicity);
      
      return {
        hasActivePeriod: true,
        currentPeriod: newPeriod,
        action: 'create',
        message: `Nuevo período creado: ${newPeriod.periodo}`
      };

    } catch (error) {
      console.error('❌ Error en detección automática:', error);
      throw error;
    }
  }

  // 🔄 2. Reglas de generación y validación de períodos
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

  static generateNextPeriodDates(closedPeriod: PayrollPeriod, periodicity: string) {
    const lastEndDate = new Date(closedPeriod.fecha_fin);
    const nextStartDate = new Date(lastEndDate);
    nextStartDate.setDate(nextStartDate.getDate() + 1);
    
    return this.generatePeriodDates(nextStartDate, periodicity);
  }

  static formatPeriodName(startDate: string, endDate: string): string {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    const months = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    
    if (start.getMonth() === end.getMonth()) {
      return `${months[start.getMonth()]} ${start.getFullYear()}`;
    } else {
      return `${start.getDate()}/${start.getMonth() + 1} - ${end.getDate()}/${end.getMonth() + 1}/${end.getFullYear()}`;
    }
  }

  // Métodos auxiliares
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
      return data;
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
      return data;
    } catch (error) {
      console.error('Error finding active period:', error);
      return null;
    }
  }

  static async findClosedPeriod(companyId: string, startDate: string, endDate: string): Promise<PayrollPeriod | null> {
    try {
      const { data, error } = await supabase
        .from('payroll_periods_real')
        .select('*')
        .eq('company_id', companyId)
        .eq('fecha_inicio', startDate)
        .eq('fecha_fin', endDate)
        .eq('estado', 'cerrado')
        .maybeSingle();

      if (error) throw error;
      return data;
    } catch (error) {
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
      return data;
    } catch (error) {
      console.error('❌ Error creating automatic period:', error);
      throw error;
    }
  }

  // 🔒 3. Validación de estados y reglas
  static async validatePeriodRules(companyId: string, startDate: string, endDate: string): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Validar períodos superpuestos
    const { data: overlapping } = await supabase
      .from('payroll_periods_real')
      .select('*')
      .eq('company_id', companyId)
      .neq('estado', 'cancelado')
      .or(`fecha_inicio.lte.${endDate},fecha_fin.gte.${startDate}`);

    if (overlapping && overlapping.length > 0) {
      errors.push('Existe superposición con períodos existentes');
    }

    // Validar múltiples períodos abiertos
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
