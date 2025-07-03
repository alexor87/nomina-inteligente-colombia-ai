
import { supabase } from '@/integrations/supabase/client';
import { PAYROLL_STATES } from '@/constants/payrollStates';
import { SmartPeriodDetectionService } from './payroll-intelligent/SmartPeriodDetectionService';

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
   * DETECCIÓN UNIFICADA CON SERVICIOS INTELIGENTES
   * Utiliza el nuevo SmartPeriodDetectionService
   */
  static async detectCurrentPeriod(): Promise<PeriodStatus> {
    try {
      console.log('🎯 DETECCIÓN UNIFICADA CON SERVICIOS INTELIGENTES...');
      
      // ✅ CORRECCIÓN: Obtener company_id ANTES de la detección
      const companyId = await this.getCurrentUserCompanyId();
      if (!companyId) {
        throw new Error('No se pudo determinar la empresa del usuario');
      }
      
      console.log('🏢 Company ID obtenido:', companyId);
      
      // Usar el nuevo servicio inteligente
      const detection = await SmartPeriodDetectionService.detectCurrentPeriod();
      
      // ✅ CORRECCIÓN: Convertir a formato esperado con company_id REAL
      const status: PeriodStatus = {
        hasActivePeriod: detection.action === 'resume',
        currentPeriod: detection.existing_period || detection.active_period ? {
          id: (detection.existing_period || detection.active_period)!.id,
          company_id: companyId, // ✅ USAR COMPANY_ID REAL
          fecha_inicio: (detection.existing_period || detection.active_period)!.fecha_inicio,
          fecha_fin: (detection.existing_period || detection.active_period)!.fecha_fin,
          estado: (detection.existing_period || detection.active_period)!.estado as any,
          tipo_periodo: detection.calculated_period.type as any,
          periodo: (detection.existing_period || detection.active_period)!.periodo,
          empleados_count: 0,
          total_devengado: 0,
          total_deducciones: 0,
          total_neto: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        } : undefined,
        nextPeriod: detection.action === 'create' ? {
          startDate: detection.calculated_period.start_date,
          endDate: detection.calculated_period.end_date,
          type: detection.calculated_period.type
        } : undefined,
        action: detection.action === 'resume' ? 'resume' : 'suggest_next',
        message: detection.message
      };
      
      console.log('✅ DETECCIÓN UNIFICADA COMPLETADA:', status);
      console.log('🏢 Company ID en período:', status.currentPeriod?.company_id);
      
      return status;
      
    } catch (error) {
      console.error('❌ ERROR EN DETECCIÓN UNIFICADA:', error);
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
      // Usar el servicio inteligente para crear períodos
      const detection = await SmartPeriodDetectionService.detectCurrentPeriod();
      const newPeriod = await SmartPeriodDetectionService.createPeriodFromDetection(detection);
      
      console.log('✅ Período automático creado exitosamente:', newPeriod);
      return newPeriod as PayrollPeriod;
    } catch (error) {
      console.error('❌ Error creating automatic period:', error);
      throw error;
    }
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
            periodicity: 'quincenal'
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
}
