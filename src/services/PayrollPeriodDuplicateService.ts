
import { supabase } from '@/integrations/supabase/client';

export interface DuplicatePeriodDiagnosis {
  success: boolean;
  duplicates_found: number;
  company_id: string;
  duplicate_periods: Array<{
    periodo: string;
    count: number;
    period_ids: string[];
    estados: string[];
    fechas_creacion: string[];
  }>;
}

export interface DuplicateCleanupResult {
  success: boolean;
  periods_deleted: number;
  payrolls_updated: number;
  company_id: string;
}

export class PayrollPeriodDuplicateService {
  /**
   * Diagnostica períodos duplicados en la empresa actual
   */
  static async diagnoseDuplicatePeriods(): Promise<DuplicatePeriodDiagnosis> {
    try {
      const { data, error } = await supabase.rpc('diagnose_duplicate_periods');
      
      if (error) {
        console.error('❌ Error diagnosing duplicate periods:', error);
        throw error;
      }
      
      console.log('🔍 Diagnosis result:', data);
      return data;
    } catch (error) {
      console.error('❌ Error in diagnoseDuplicatePeriods:', error);
      throw error;
    }
  }

  /**
   * Limpia períodos duplicados específicos
   */
  static async cleanSpecificDuplicatePeriods(): Promise<DuplicateCleanupResult> {
    try {
      const { data, error } = await supabase.rpc('clean_specific_duplicate_periods');
      
      if (error) {
        console.error('❌ Error cleaning duplicate periods:', error);
        throw error;
      }
      
      console.log('🧹 Cleanup result:', data);
      return data;
    } catch (error) {
      console.error('❌ Error in cleanSpecificDuplicatePeriods:', error);
      throw error;
    }
  }

  /**
   * Verifica si existen períodos duplicados antes de crear uno nuevo
   */
  static async validateNewPeriod(periodo: string, fechaInicio: string, fechaFin: string): Promise<boolean> {
    try {
      // Verificar duplicados por nombre
      const { data: existingByName, error: nameError } = await supabase
        .from('payroll_periods_real')
        .select('id, periodo, estado')
        .eq('periodo', periodo);

      if (nameError) {
        console.error('❌ Error checking period name:', nameError);
        throw nameError;
      }

      if (existingByName && existingByName.length > 0) {
        console.warn('⚠️ Period with same name already exists:', existingByName);
        return false;
      }

      // Verificar solapamiento de fechas
      const { data: overlapping, error: dateError } = await supabase
        .from('payroll_periods_real')
        .select('id, periodo, fecha_inicio, fecha_fin')
        .or(
          `and(fecha_inicio.lte.${fechaInicio},fecha_fin.gte.${fechaInicio}),` +
          `and(fecha_inicio.lte.${fechaFin},fecha_fin.gte.${fechaFin}),` +
          `and(fecha_inicio.gte.${fechaInicio},fecha_fin.lte.${fechaFin})`
        );

      if (dateError) {
        console.error('❌ Error checking date overlap:', dateError);
        throw dateError;
      }

      if (overlapping && overlapping.length > 0) {
        console.warn('⚠️ Period with overlapping dates exists:', overlapping);
        return false;
      }

      return true;
    } catch (error) {
      console.error('❌ Error in validateNewPeriod:', error);
      throw error;
    }
  }
}
