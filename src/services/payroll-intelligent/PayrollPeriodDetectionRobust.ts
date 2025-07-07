
import { supabase } from '@/integrations/supabase/client';
import { PayrollDiagnosticService } from './PayrollDiagnosticService';
import { PayrollDataIntegrityService } from './PayrollDataIntegrityService';

export interface RobustPeriodStatus {
  hasActivePeriod: boolean;
  currentPeriod?: any;
  suggestedPeriod?: any;
  nextPeriod?: any;
  action: 'resume' | 'create' | 'diagnose' | 'emergency';
  message: string;
  diagnostic?: any;
}

export class PayrollPeriodDetectionRobust {
  
  static async detectWithDiagnosis(): Promise<RobustPeriodStatus> {
    try {
      console.log('🔍 DETECCIÓN ROBUSTA CON DIAGNÓSTICO INICIADA...');
      
      const companyId = await this.getCurrentUserCompanyId();
      if (!companyId) {
        throw new Error('No se pudo obtener la empresa del usuario');
      }

      console.log('🏢 Company ID detectado:', companyId);

      // PASO 1: Ejecutar diagnóstico completo
      const diagnostic = await PayrollDiagnosticService.generateCompleteDiagnostic(companyId);
      
      // PASO 2: Generar reporte de integridad
      const integrityReport = await PayrollDataIntegrityService.generateIntegrityReport(companyId);
      
      console.log('📊 Diagnóstico completado:', {
        totalPeriods: diagnostic.totalPeriods,
        issues: diagnostic.issues.length,
        recommendations: diagnostic.recommendations.length
      });

      // PASO 3: Determinar acción basada en diagnóstico
      if (diagnostic.issues.length > 0) {
        console.log('⚠️ Se detectaron problemas en los datos:', diagnostic.issues);
        
        return {
          hasActivePeriod: false,
          action: 'diagnose',
          message: `Se detectaron ${diagnostic.issues.length} problemas en los datos`,
          diagnostic: { ...diagnostic, integrityReport }
        };
      }

      // PASO 4: Buscar período activo si no hay problemas
      const activePeriod = await this.findActivePeriod(companyId);
      
      if (activePeriod) {
        console.log('✅ Período activo encontrado:', activePeriod.periodo);
        
        return {
          hasActivePeriod: true,
          currentPeriod: activePeriod,
          action: 'resume',
          message: `Continuar con período activo: ${activePeriod.periodo}`,
          diagnostic: { ...diagnostic, integrityReport }
        };
      }

      // PASO 5: Sugerir nuevo período si no hay activo
      const suggestedPeriod = await this.generateCurrentPeriodSuggestion();
      
      return {
        hasActivePeriod: false,
        nextPeriod: suggestedPeriod,
        action: 'create',
        message: `Crear nuevo período: ${suggestedPeriod.periodName}`,
        diagnostic: { ...diagnostic, integrityReport }
      };

    } catch (error) {
      console.error('💥 Error en detección robusta:', error);
      
      return {
        hasActivePeriod: false,
        action: 'emergency',
        message: `Error crítico: ${error}`,
        diagnostic: null
      };
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

  private static async findActivePeriod(companyId: string): Promise<any | null> {
    try {
      const { data } = await supabase.rpc('get_active_period_for_company');
      
      if (data?.has_active_period) {
        return data.period;
      }
      
      return null;
    } catch (error) {
      console.error('Error buscando período activo:', error);
      return null;
    }
  }

  private static async generateCurrentPeriodSuggestion(): Promise<any> {
    try {
      const { data } = await supabase.rpc('detect_current_smart_period');
      
      if (data?.success && data.calculated_period) {
        return {
          startDate: data.calculated_period.start_date,
          endDate: data.calculated_period.end_date,
          periodName: data.calculated_period.period_name,
          type: data.calculated_period.type
        };
      }
      
      // Fallback para julio 2025
      return {
        startDate: '2025-07-01',
        endDate: '2025-07-15',
        periodName: '1 - 15 Julio 2025',
        type: 'quincenal'
      };
      
    } catch (error) {
      console.error('Error generando sugerencia de período:', error);
      throw error;
    }
  }

  static async createPeriodFromSuggestion(suggestion: any): Promise<any> {
    try {
      const companyId = await this.getCurrentUserCompanyId();
      if (!companyId) {
        throw new Error('No se pudo obtener la empresa del usuario');
      }

      const { data: newPeriod, error } = await supabase
        .from('payroll_periods_real')
        .insert({
          company_id: companyId,
          periodo: suggestion.periodName,
          fecha_inicio: suggestion.startDate,
          fecha_fin: suggestion.endDate,
          tipo_periodo: suggestion.type || 'quincenal',
          estado: 'borrador',
          empleados_count: 0,
          total_devengado: 0,
          total_deducciones: 0,
          total_neto: 0
        })
        .select()
        .single();

      if (error) {
        console.error('Error creando período:', error);
        throw error;
      }

      console.log('✅ Período creado exitosamente:', newPeriod.periodo);
      return newPeriod;

    } catch (error) {
      console.error('Error creando período desde sugerencia:', error);
      throw error;
    }
  }
}
