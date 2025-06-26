
import { IncompleteRegistrationDetector } from './IncompleteRegistrationDetector';
import { UserRegistrationCompleter } from './UserRegistrationCompleter';
import { YohannaRegistrationService } from './YohannaRegistrationService';
import type { RecoveryResult, IncompleteRegistration } from '@/types/registration-recovery';

export class AutoRecoveryService {
  static async runAutoRecovery(): Promise<RecoveryResult> {
    try {
      console.log('🚀 Starting auto-recovery process...');
      
      const incompleteRegistrations = await IncompleteRegistrationDetector.findIncompleteRegistrations();
      const results: Array<{ email: string; success: boolean; error?: string }> = [];
      let completed = 0;
      let failed = 0;

      for (const registration of incompleteRegistrations) {
        try {
          let success = false;

          // Para Yohanna, usar datos específicos
          if (registration.email === 'yohanna.munozes@gmail.com') {
            success = await YohannaRegistrationService.completeYohannaRegistration();
          } else {
            // Para otros usuarios, solo completar si ya tienen empresa
            if (registration.company_id) {
              success = await UserRegistrationCompleter.completeUserRegistration(registration.user_id);
            }
          }

          if (success) {
            completed++;
            results.push({ email: registration.email, success: true });
          } else {
            failed++;
            results.push({ 
              email: registration.email, 
              success: false, 
              error: 'Recovery failed' 
            });
          }
        } catch (error) {
          failed++;
          results.push({ 
            email: registration.email, 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error' 
          });
        }
      }

      console.log('📊 Auto-recovery completed:', { total: incompleteRegistrations.length, completed, failed });
      return {
        total: incompleteRegistrations.length,
        completed,
        failed,
        results
      };
    } catch (error) {
      console.error('❌ Error in auto-recovery:', error);
      return { total: 0, completed: 0, failed: 0, results: [] };
    }
  }
}
