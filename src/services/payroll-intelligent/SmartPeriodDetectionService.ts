
import { supabase } from '@/integrations/supabase/client';
import { addDays, format, startOfMonth, endOfMonth } from 'date-fns';

export interface SmartPeriodSuggestion {
  startDate: string;
  endDate: string;
  periodName: string;
  type: string;
}

export interface SmartPeriodDetectionResult {
  success: boolean;
  currentDate: string;
  periodicity: string;
  suggestedPeriod: SmartPeriodSuggestion;
  existingPeriod?: {
    id: string;
    periodo: string;
    estado: string;
    fecha_inicio: string;
    fecha_fin: string;
  };
  action: 'resume' | 'create';
}

export class SmartPeriodDetectionService {
  /**
   * Detecta inteligentemente el período actual basado en la fecha y configuración de empresa
   */
  static async detectCurrentPeriod(): Promise<SmartPeriodDetectionResult> {
    try {
      console.log('🎯 DETECCIÓN INTELIGENTE: Iniciando análisis basado en fecha actual...');
      
      const { data, error } = await supabase.rpc('detect_smart_current_period');
      
      if (error) {
        console.error('❌ Error en detección inteligente:', error);
        throw error;
      }
      
      console.log('✅ Detección inteligente completada:', data);
      
      return {
        success: data.success,
        currentDate: data.current_date,
        periodicity: data.periodicity,
        suggestedPeriod: {
          startDate: data.suggested_period.start_date,
          endDate: data.suggested_period.end_date,
          periodName: data.suggested_period.period_name,
          type: data.suggested_period.type
        },
        existingPeriod: data.existing_period,
        action: data.action
      };
      
    } catch (error) {
      console.error('❌ Error crítico en detección inteligente:', error);
      throw error;
    }
  }

  /**
   * Crea el período sugerido por el sistema inteligente
   */
  static async createSuggestedPeriod(suggestion: SmartPeriodSuggestion): Promise<any> {
    try {
      const companyId = await this.getCurrentUserCompanyId();
      if (!companyId) throw new Error('No company ID found');

      console.log('🆕 Creando período inteligente:', suggestion.periodName);

      const { data, error } = await supabase
        .from('payroll_periods_real')
        .insert({
          company_id: companyId,
          fecha_inicio: suggestion.startDate,
          fecha_fin: suggestion.endDate,
          tipo_periodo: suggestion.type,
          periodo: suggestion.periodName,
          estado: 'borrador'
        })
        .select()
        .single();

      if (error) throw error;

      console.log('✅ Período inteligente creado exitosamente:', data);
      return data;

    } catch (error) {
      console.error('❌ Error creando período inteligente:', error);
      throw error;
    }
  }

  /**
   * Valida que un nuevo período no cause conflictos
   */
  static async validatePeriodCreation(
    periodName: string, 
    startDate: string, 
    endDate: string
  ): Promise<boolean> {
    try {
      const companyId = await this.getCurrentUserCompanyId();
      if (!companyId) return false;

      // Verificar duplicados por nombre
      const { data: existingByName, error: nameError } = await supabase
        .from('payroll_periods_real')
        .select('id, periodo, estado')
        .eq('company_id', companyId)
        .eq('periodo', periodName);

      if (nameError) throw nameError;

      if (existingByName && existingByName.length > 0) {
        console.warn('⚠️ Ya existe un período con el mismo nombre:', existingByName);
        return false;
      }

      // Verificar solapamiento de fechas
      const { data: overlapping, error: dateError } = await supabase
        .from('payroll_periods_real')
        .select('id, periodo, fecha_inicio, fecha_fin')
        .eq('company_id', companyId)
        .or(
          `and(fecha_inicio.lte.${startDate},fecha_fin.gte.${startDate}),` +
          `and(fecha_inicio.lte.${endDate},fecha_fin.gte.${endDate}),` +
          `and(fecha_inicio.gte.${startDate},fecha_fin.lte.${endDate})`
        );

      if (dateError) throw dateError;

      if (overlapping && overlapping.length > 0) {
        console.warn('⚠️ Existe solapamiento de fechas:', overlapping);
        return false;
      }

      return true;
    } catch (error) {
      console.error('❌ Error en validación:', error);
      return false;
    }
  }

  private static async getCurrentUserCompanyId(): Promise<string | null> {
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
}
