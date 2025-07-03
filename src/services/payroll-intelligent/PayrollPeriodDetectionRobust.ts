
import { supabase } from '@/integrations/supabase/client';
import { UNIFIED_PAYROLL_STATES, ACTIVE_STATES, CLOSED_STATES, isValidPayrollState } from '@/constants/payrollStatesUnified';
import { PayrollDiagnosticService } from './PayrollDiagnosticService';
import { PeriodNameUnifiedService } from './PeriodNameUnifiedService';

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
      console.log('🔍 DETECCIÓN ROBUSTA CON DIAGNÓSTICO INICIADA...');
      
      // Paso 1: Obtener company ID
      const companyId = await this.getCurrentUserCompanyId();
      if (!companyId) {
        console.error('❌ No se encontró company_id');
        return this.createEmergencyResponse('No se encontró información de la empresa');
      }

      console.log('🏢 Company ID:', companyId);

      // Paso 2: Ejecutar diagnóstico completo
      const diagnostic = await PayrollDiagnosticService.generateCompleteDiagnostic(companyId);
      
      // Paso 3: Analizar diagnóstico y decidir acción
      return this.analyzeAndDecide(companyId, diagnostic);

    } catch (error) {
      console.error('💥 Error crítico en detección robusta:', error);
      return this.createEmergencyResponse('Error crítico en detección de período');
    }
  }

  private static async analyzeAndDecide(companyId: string, diagnostic: any): Promise<RobustPeriodStatus> {
    console.log('🧠 ANALIZANDO DIAGNÓSTICO...');
    
    // Análisis 1: ¿Hay período activo?
    const activePeriods = diagnostic.periodsReal.filter((p: any) => 
      ACTIVE_STATES.includes(p.estado)
    );

    if (activePeriods.length === 1) {
      console.log('✅ Período activo único encontrado:', activePeriods[0].periodo);
      return {
        hasActivePeriod: true,
        currentPeriod: activePeriods[0],
        action: 'resume',
        message: `Continuando con período activo: ${activePeriods[0].periodo}`,
        diagnostic
      };
    }

    if (activePeriods.length > 1) {
      console.log('⚠️ Múltiples períodos activos - requiere intervención');
      return {
        hasActivePeriod: false,
        action: 'diagnose',
        message: `Se encontraron ${activePeriods.length} períodos activos. Requiere revisión manual.`,
        diagnostic
      };
    }

    // Análisis 2: ¿Hay períodos cerrados para calcular siguiente?
    const closedPeriods = diagnostic.periodsReal.filter((p: any) => 
      CLOSED_STATES.includes(p.estado)
    ).sort((a: any, b: any) => new Date(b.fecha_fin).getTime() - new Date(a.fecha_fin).getTime());

    if (closedPeriods.length > 0) {
      console.log('📅 Último período cerrado encontrado:', closedPeriods[0].periodo);
      
      // Intentar calcular siguiente período
      const nextPeriod = await this.calculateNextPeriod(companyId, closedPeriods[0]);
      
      if (nextPeriod) {
        return {
          hasActivePeriod: false,
          nextPeriod,
          action: 'create',
          message: `Crear siguiente período: ${nextPeriod.startDate} - ${nextPeriod.endDate}`,
          diagnostic
        };
      }
    }

    // Análisis 3: No hay períodos - crear el primero
    if (diagnostic.periodsReal.length === 0) {
      console.log('🆕 No hay períodos - crear el primero');
      
      const firstPeriod = await this.calculateFirstPeriod(companyId);
      
      return {
        hasActivePeriod: false,
        nextPeriod: firstPeriod,
        action: 'create',
        message: 'Crear primer período de nómina',
        diagnostic
      };
    }

    // Fallback: Situación compleja requiere diagnóstico
    console.log('🔧 Situación compleja detectada');
    return {
      hasActivePeriod: false,
      action: 'diagnose',
      message: 'Situación compleja detectada. Revisar diagnóstico.',
      diagnostic
    };
  }

  private static async calculateNextPeriod(companyId: string, lastPeriod: any): Promise<{startDate: string; endDate: string; type: string} | null> {
    try {
      // Obtener configuración de empresa
      const { data: settings } = await supabase
        .from('company_settings')
        .select('periodicity')
        .eq('company_id', companyId)
        .single();

      const periodicity = settings?.periodicity || 'mensual';
      
      // Calcular siguiente período
      const lastEndDate = new Date(lastPeriod.fecha_fin);
      const nextStartDate = new Date(lastEndDate);
      nextStartDate.setDate(nextStartDate.getDate() + 1);

      let nextEndDate: Date;

      switch (periodicity) {
        case 'quincenal':
          nextEndDate = new Date(nextStartDate);
          nextEndDate.setDate(nextEndDate.getDate() + 14);
          break;
        case 'semanal':
          nextEndDate = new Date(nextStartDate);
          nextEndDate.setDate(nextEndDate.getDate() + 6);
          break;
        default: // mensual
          nextEndDate = new Date(nextStartDate);
          nextEndDate.setMonth(nextEndDate.getMonth() + 1);
          nextEndDate.setDate(nextEndDate.getDate() - 1);
      }

      return {
        startDate: nextStartDate.toISOString().split('T')[0],
        endDate: nextEndDate.toISOString().split('T')[0],
        type: periodicity
      };

    } catch (error) {
      console.error('❌ Error calculando siguiente período:', error);
      return null;
    }
  }

  private static async calculateFirstPeriod(companyId: string): Promise<{startDate: string; endDate: string; type: string}> {
    try {
      // Obtener configuración
      const { data: settings } = await supabase
        .from('company_settings')
        .select('periodicity')
        .eq('company_id', companyId)
        .single();

      const periodicity = settings?.periodicity || 'mensual';
      const today = new Date();
      
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
          startDate = new Date(today.getFullYear(), today.getMonth(), 1);
          endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      }

      return {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        type: periodicity
      };

    } catch (error) {
      console.error('❌ Error calculando primer período:', error);
      // Fallback a período mensual actual
      const today = new Date();
      return {
        startDate: new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0],
        endDate: new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0],
        type: 'mensual'
      };
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

  static async createPeriodFromSuggestion(nextPeriod: {startDate: string; endDate: string; type: string}): Promise<any> {
    try {
      const companyId = await this.getCurrentUserCompanyId();
      if (!companyId) throw new Error('No company ID found');

      // Generar nombre unificado
      const periodName = PeriodNameUnifiedService.generateUnifiedPeriodName({
        startDate: nextPeriod.startDate,
        endDate: nextPeriod.endDate,
        periodicity: nextPeriod.type as any
      });

      console.log('🆕 Creando período:', periodName);

      const { data, error } = await supabase
        .from('payroll_periods_real')
        .insert({
          company_id: companyId,
          fecha_inicio: nextPeriod.startDate,
          fecha_fin: nextPeriod.endDate,
          tipo_periodo: nextPeriod.type,
          periodo: periodName,
          estado: UNIFIED_PAYROLL_STATES.BORRADOR
        })
        .select()
        .single();

      if (error) throw error;

      console.log('✅ Período creado exitosamente:', data);
      return data;

    } catch (error) {
      console.error('❌ Error creando período:', error);
      throw error;
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
