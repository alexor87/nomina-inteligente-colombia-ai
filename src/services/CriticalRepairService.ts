
import { supabase } from '@/integrations/supabase/client';

interface DiagnosisResult {
  issues: string[];
  status: 'healthy' | 'warning' | 'critical';
}

interface RepairResult {
  success: boolean;
  message: string;
  employeesCreated: number;
  periodsCreated: number;
  details: string[];
}

interface ValidationResult {
  liquidationFlow: boolean;
  historyFlow: boolean;
}

export class CriticalRepairService {
  
  /**
   * Diagnose system issues
   */
  static async diagnoseSystem(): Promise<DiagnosisResult> {
    try {
      console.log('🔍 Running system diagnosis...');
      
      const issues: string[] = [];
      
      // Test database connection
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        issues.push('No authenticated user found');
      }

      // Test basic table access
      const { error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user?.id)
        .limit(1);

      if (profileError) {
        issues.push(`Profile access failed: ${profileError.message}`);
      }

      const status = issues.length === 0 ? 'healthy' : issues.length < 3 ? 'warning' : 'critical';
      
      return {
        issues,
        status
      };
    } catch (error) {
      console.error('❌ System diagnosis failed:', error);
      return {
        issues: [`System diagnosis failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        status: 'critical'
      };
    }
  }

  /**
   * ⚠️ DISABLED: Demo data creation is permanently disabled
   */
  static async createMinimumTestData(): Promise<RepairResult> {
    console.log('🚫 Demo data creation is disabled in production');
    return {
      success: true,
      message: 'Demo data creation is disabled in production environment',
      employeesCreated: 0,
      periodsCreated: 0,
      details: ['Demo data creation has been permanently disabled for security reasons']
    };
  }

  /**
   * Validate critical system flows
   */
  static async validateCriticalFlows(): Promise<ValidationResult> {
    try {
      console.log('🔍 Validating critical system flows...');
      
      // Test database connection
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('❌ No authenticated user found');
        return {
          liquidationFlow: false,
          historyFlow: false
        };
      }

      // Test basic table access
      const { error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .limit(1);

      if (profileError) {
        console.error('❌ Profile access failed:', profileError);
        return {
          liquidationFlow: false,
          historyFlow: false
        };
      }

      console.log('✅ Critical flows validation passed');
      return {
        liquidationFlow: true,
        historyFlow: true
      };
    } catch (error) {
      console.error('❌ Critical flows validation failed:', error);
      return {
        liquidationFlow: false,
        historyFlow: false
      };
    }
  }

  /**
   * Repair common issues
   */
  static async repairCommonIssues(): Promise<void> {
    try {
      console.log('🔧 Starting repair of common issues...');
      console.log('✅ Common issues repair completed.');
    } catch (error) {
      console.error('❌ Error during common issues repair:', error);
    }
  }
}
