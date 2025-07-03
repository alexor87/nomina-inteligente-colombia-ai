
import { supabase } from '@/integrations/supabase/client';
import { PayrollPeriodDuplicateService } from '../PayrollPeriodDuplicateService';
import { addDays, format, startOfMonth, endOfMonth, addMonths, subDays } from 'date-fns';

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
      console.log('🔍 Starting enhanced period detection...');

      // PASO 1: Diagnosticar y limpiar duplicados automáticamente
      const diagnosis = await PayrollPeriodDuplicateService.diagnoseDuplicatePeriods();
      let cleanupResult = null;

      if (diagnosis.duplicates_found > 0) {
        console.log(`🧹 Found ${diagnosis.duplicates_found} duplicates, cleaning...`);
        cleanupResult = await PayrollPeriodDuplicateService.cleanSpecificDuplicatePeriods();
        console.log('✅ Duplicates cleaned:', cleanupResult);
      }

      // PASO 2: Obtener períodos actuales después de la limpieza
      const { data: periods, error } = await supabase
        .from('payroll_periods_real')
        .select('*')
        .order('fecha_fin', { ascending: false })
        .limit(10);

      if (error) {
        console.error('❌ Error fetching periods:', error);
        throw error;
      }

      console.log('📊 Periods after cleanup:', periods);

      // PASO 3: Buscar período activo (borrador o en_proceso)
      const activePeriod = periods?.find(p => ['borrador', 'en_proceso'].includes(p.estado));

      if (activePeriod) {
        console.log('✅ Active period found:', activePeriod);
        return {
          hasActivePeriod: true,
          currentPeriod: activePeriod,
          action: 'resume',
          message: `Continuar con el período ${activePeriod.periodo}`,
          duplicatesFound: diagnosis.duplicates_found,
          cleanupResult
        };
      }

      // PASO 4: Determinar siguiente período basado en el último cerrado
      const lastClosedPeriod = periods?.find(p => p.estado === 'cerrado');
      
      if (!lastClosedPeriod) {
        // No hay períodos previos, sugerir el primer período
        const nextPeriod = this.generateFirstPeriod();
        return {
          hasActivePeriod: false,
          nextPeriod,
          action: 'create',
          message: 'Crear el primer período de nómina',
          duplicatesFound: diagnosis.duplicates_found,
          cleanupResult
        };
      }

      // PASO 5: Generar siguiente período basado en el último cerrado
      const nextPeriod = this.generateNextPeriod(lastClosedPeriod);
      
      console.log('🎯 Next period suggested:', nextPeriod);

      return {
        hasActivePeriod: false,
        nextPeriod,
        action: 'create',
        message: `Crear nuevo período: ${nextPeriod.period}`,
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
   * Genera el primer período quincenal del mes actual
   */
  private static generateFirstPeriod() {
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    const endDate = new Date(now.getFullYear(), now.getMonth(), 15);

    return {
      startDate: format(startDate, 'yyyy-MM-dd'),
      endDate: format(endDate, 'yyyy-MM-dd'),
      type: 'quincenal',
      period: `1 - 15 ${format(now, 'MMMM yyyy')}`
    };
  }

  /**
   * Genera el siguiente período basado en el último período cerrado
   */
  private static generateNextPeriod(lastPeriod: any) {
    const lastEndDate = new Date(lastPeriod.fecha_fin);
    const nextStartDate = addDays(lastEndDate, 1);
    
    // Determinar si es primera o segunda quincena
    const dayOfMonth = nextStartDate.getDate();
    
    if (dayOfMonth === 1) {
      // Primera quincena del mes
      const endDate = new Date(nextStartDate.getFullYear(), nextStartDate.getMonth(), 15);
      return {
        startDate: format(nextStartDate, 'yyyy-MM-dd'),
        endDate: format(endDate, 'yyyy-MM-dd'),
        type: 'quincenal',
        period: `1 - 15 ${format(nextStartDate, 'MMMM yyyy')}`
      };
    } else {
      // Segunda quincena del mes
      const endDate = endOfMonth(nextStartDate);
      return {
        startDate: format(nextStartDate, 'yyyy-MM-dd'),
        endDate: format(endDate, 'yyyy-MM-dd'),
        type: 'quincenal',
        period: `16 - ${endDate.getDate()} ${format(nextStartDate, 'MMMM yyyy')}`
      };
    }
  }

  /**
   * Valida que un nuevo período no cause duplicados
   */
  static async validatePeriodCreation(periodo: string, fechaInicio: string, fechaFin: string): Promise<boolean> {
    return await PayrollPeriodDuplicateService.validateNewPeriod(periodo, fechaInicio, fechaFin);
  }
}
