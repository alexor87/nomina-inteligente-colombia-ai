
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
      // Use the correct RPC function name from the database
      const result = await supabase.rpc('diagnose_duplicate_periods');
      
      if (result.error) {
        console.error('❌ Error diagnosing duplicate periods:', result.error);
        throw result.error;
      }
      
      console.log('🔍 Diagnosis result:', result.data);
      
      // Parse the JSON response to match our interface
      const data = result.data as any;
      return {
        success: data.success || false,
        duplicates_found: data.duplicates_found || 0,
        company_id: data.company_id || '',
        duplicate_periods: data.duplicate_periods || []
      };
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
      // Use the correct RPC function name from the database
      const result = await supabase.rpc('clean_specific_duplicate_periods');
      
      if (result.error) {
        console.error('❌ Error cleaning duplicate periods:', result.error);
        throw result.error;
      }
      
      console.log('🧹 Cleanup result:', result.data);
      
      // Parse the JSON response to match our interface
      const data = result.data as any;
      return {
        success: data.success || false,
        periods_deleted: data.periods_deleted || 0,
        payrolls_updated: data.payrolls_updated || 0,
        company_id: data.company_id || ''
      };
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
      // Get current user's company ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      const companyId = profile?.company_id;
      if (!companyId) return false;

      // Verificar duplicados por nombre
      const { data: existingByName, error: nameError } = await supabase
        .from('payroll_periods_real')
        .select('id, periodo, estado')
        .eq('company_id', companyId)
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
        .eq('company_id', companyId)
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
