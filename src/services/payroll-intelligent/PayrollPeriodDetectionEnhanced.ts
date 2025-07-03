
import { supabase } from '@/integrations/supabase/client';
import { PayrollPeriodDuplicateService } from '../PayrollPeriodDuplicateService';
import { SmartPeriodDetectionService, SmartPeriodDetectionResult } from './SmartPeriodDetectionService';

export interface EnhancedPeriodDetectionResult {
  hasActivePeriod: boolean;
  currentPeriod?: any;
  nextPeriod?: {
    startDate: string;
    endDate: string;
    type: string;
    period: string;
  };
  action: 'resume' | 'create' | 'suggest_next' | 'diagnose';
  message: string;
  duplicatesFound?: number;
  cleanupResult?: any;
}

export class PayrollPeriodDetectionEnhanced {
  /**
   * Detección inteligente de períodos con limpieza automática de duplicados
   */
  static async detectCurrentPeriodStatus(): Promise<EnhancedPeriodDetectionResult> {
    try {
      console.log('🔍 Starting enhanced period detection with smart logic...');

      // PASO 1: Usar el nuevo servicio inteligente
      const smartResult: SmartPeriodDetectionResult = await SmartPeriodDetectionService.detectCurrentPeriod();
      
      console.log('🎯 Smart detection result:', smartResult);

      // PASO 2: Diagnosticar y limpiar duplicados si es necesario
      const diagnosis = await PayrollPeriodDuplicateService.diagnoseDuplicatePeriods();
      let cleanupResult = null;

      if (diagnosis.duplicates_found > 0) {
        console.log(`🧹 Found ${diagnosis.duplicates_found} duplicates, cleaning...`);
        cleanupResult = await PayrollPeriodDuplicateService.cleanSpecificDuplicatePeriods();
        console.log('✅ Duplicates cleaned:', cleanupResult);
      }

      // PASO 3: Analizar resultado del sistema inteligente
      if (smartResult.action === 'resume' && smartResult.existingPeriod) {
        return {
          hasActivePeriod: true,
          currentPeriod: smartResult.existingPeriod,
          action: 'resume',
          message: `Continuar con el período ${smartResult.existingPeriod.periodo}`,
          duplicatesFound: diagnosis.duplicates_found,
          cleanupResult
        };
      }

      // PASO 4: Sugerir creación del período inteligente
      const nextPeriod = {
        startDate: smartResult.suggestedPeriod.startDate,
        endDate: smartResult.suggestedPeriod.endDate,
        type: smartResult.suggestedPeriod.type,
        period: smartResult.suggestedPeriod.periodName
      };

      return {
        hasActivePeriod: false,
        nextPeriod,
        action: 'create',
        message: `Crear período inteligente: ${smartResult.suggestedPeriod.periodName}`,
        duplicatesFound: diagnosis.duplicates_found,
        cleanupResult
      };

    } catch (error) {
      console.error('❌ Error in enhanced period detection:', error);
      return {
        hasActivePeriod: false,
        action: 'diagnose',
        message: 'Error detectando períodos. Revisar configuración.',
        duplicatesFound: 0
      };
    }
  }

  /**
   * Valida que un nuevo período no cause duplicados usando el sistema inteligente
   */
  static async validatePeriodCreation(periodo: string, fechaInicio: string, fechaFin: string): Promise<boolean> {
    return await SmartPeriodDetectionService.validatePeriodCreation(periodo, fechaInicio, fechaFin);
  }
}
