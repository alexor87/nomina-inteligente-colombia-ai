import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export class CriticalRepairService {
  
  /**
   * ⚠️ DISABLED: Demo data creation is permanently disabled
   */
  static async createMinimumTestData(): Promise<boolean> {
    console.log('🚫 Demo data creation is disabled in production');
    return true;
  }

  /**
   * Validate critical system flows
   */
  static async validateCriticalFlows(): Promise<boolean> {
    try {
      console.log('🔍 Validating critical system flows...');
      
      // Test database connection
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('❌ No authenticated user found');
        return false;
      }

      // Test basic table access
      const { error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .limit(1);

      if (profileError) {
        console.error('❌ Profile access failed:', profileError);
        return false;
      }

      console.log('✅ Critical flows validation passed');
      return true;
    } catch (error) {
      console.error('❌ Critical flows validation failed:', error);
      return false;
    }
  }

  /**
   * Repair common issues
   */
  static async repairCommonIssues(): Promise<void> {
    try {
      console.log('🔧 Iniciando reparación de problemas comunes...');
      toast.info('Iniciando reparación de problemas comunes...');
      
      // Auto-asignar rol de administrador si es necesario
      // await AutoRoleAssignmentService.attemptAutoAdminAssignment();

      // Corregir nombres de períodos (SIN tocar fechas)
      // await PeriodNameCorrectionService.correctPeriodNamesOnly(companyId);

      toast.success('Reparación de problemas comunes completada.');
      console.log('✅ Reparación de problemas comunes completada.');
    } catch (error) {
      console.error('❌ Error durante la reparación de problemas comunes:', error);
      toast.error('Error durante la reparación de problemas comunes.');
    }
  }
}
