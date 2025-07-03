
import { supabase } from '@/integrations/supabase/client';
import { PayrollPeriodDetectionEnhanced } from './PayrollPeriodDetectionEnhanced';
import { SmartPeriodDetectionService } from './SmartPeriodDetectionService';
import { UNIFIED_PAYROLL_STATES, ACTIVE_STATES, CLOSED_STATES } from '@/constants/payrollStatesUnified';
import { PayrollDiagnosticService } from './PayrollDiagnosticService';

export interface RobustPeriodStatus {
  hasActivePeriod: boolean;
  currentPeriod?: any;
  nextPeriod?: {
    startDate: string;
    endDate: string;
    type: string;
  };
  action: 'resume' | 'create' | 'diagnose' | 'emergency';
  message: string;
  diagnostic?: any;
}

export class PayrollPeriodDetectionRobust {
  
  static async detectWithDiagnosis(): Promise<RobustPeriodStatus> {
    try {
      console.log('🔍 DETECCIÓN ROBUSTA CON SISTEMA INTELIGENTE...');
      
      // Paso 1: Usar el sistema inteligente como base
      const smartResult = await SmartPeriodDetectionService.detectCurrentPeriod();
      
      console.log('🎯 Smart result:', smartResult);

      // Paso 2: Obtener company ID para diagnósticos adicionales
      const companyId = await this.getCurrentUserCompanyId();
      if (!companyId) {
        console.error('❌ No se encontró company_id');
        return this.createEmergencyResponse('No se encontró información de la empresa');
      }

      // Paso 3: Analizar resultado inteligente y tomar decisión
      if (smartResult.action === 'resume' && smartResult.existingPeriod) {
        console.log('✅ Período activo encontrado por sistema inteligente');
        return {
          hasActivePeriod: true,
          currentPeriod: smartResult.existingPeriod,
          action: 'resume',
          message: `Continuando con período inteligente: ${smartResult.existingPeriod.periodo}`,
          diagnostic: smartResult
        };
      }

      // Paso 4: Sugerir creación usando lógica inteligente
      console.log('🆕 Sistema inteligente sugiere crear nuevo período');
      
      const nextPeriod = {
        startDate: smartResult.suggestedPeriod.startDate,
        endDate: smartResult.suggestedPeriod.endDate,
        type: smartResult.suggestedPeriod.type
      };

      return {
        hasActivePeriod: false,
        nextPeriod,
        action: 'create',
        message: `Crear período inteligente: ${smartResult.suggestedPeriod.periodName} (${smartResult.periodicity})`,
        diagnostic: smartResult
      };

    } catch (error) {
      console.error('💥 Error crítico en detección robusta:', error);
      return this.createEmergencyResponse('Error crítico en detección de período');
    }
  }

  static async createPeriodFromSuggestion(nextPeriod: {startDate: string; endDate: string; type: string}): Promise<any> {
    try {
      const suggestion = {
        startDate: nextPeriod.startDate,
        endDate: nextPeriod.endDate,
        periodName: `Período ${nextPeriod.startDate} - ${nextPeriod.endDate}`,
        type: nextPeriod.type
      };

      return await SmartPeriodDetectionService.createSuggestedPeriod(suggestion);
    } catch (error) {
      console.error('❌ Error creando período desde sugerencia:', error);
      throw error;
    }
  }

  private static createEmergencyResponse(message: string): RobustPeriodStatus {
    return {
      hasActivePeriod: false,
      action: 'emergency',
      message,
      diagnostic: null
    };
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

  /**
   * Método mejorado que usa la detección enhanced con sistema inteligente
   */
  static async detectCurrentPeriodStatusEnhanced() {
    console.log('🔄 Using enhanced period detection with smart system...');
    return await PayrollPeriodDetectionEnhanced.detectCurrentPeriodStatus();
  }
}
