
import { IncompleteRegistrationDetector } from './IncompleteRegistrationDetector';
import { UserRegistrationCompleter } from './UserRegistrationCompleter';
import { YohannaRegistrationService } from './YohannaRegistrationService';
import { AutoRecoveryService } from './AutoRecoveryService';

// Re-export types for backward compatibility
export type { IncompleteRegistration, CompanyCreationData, RecoveryResult } from '@/types/registration-recovery';

export class RegistrationRecoveryService {
  // Detectar usuarios con registros incompletos
  static async findIncompleteRegistrations() {
    return IncompleteRegistrationDetector.findIncompleteRegistrations();
  }

  // Completar un registro específico
  static async completeUserRegistration(userId: string, companyData?: any) {
    return UserRegistrationCompleter.completeUserRegistration(userId, companyData);
  }

  // Completar registro de Yohanna específicamente
  static async completeYohannaRegistration() {
    return YohannaRegistrationService.completeYohannaRegistration();
  }

  // Ejecutar recuperación automática para todos los registros incompletos
  static async runAutoRecovery() {
    return AutoRecoveryService.runAutoRecovery();
  }
}
