import { SecureNovedadesService } from './SecureNovedadesService';
import { PayrollNovedad, CreateNovedadData } from '@/types/novedades';

/**
 * 🔒 SECURITY MIGRATION: NovedadesService now delegates to SecureNovedadesService
 * This provides backward compatibility while ensuring all operations are secure
 * @deprecated Use SecureNovedadesService directly for better security
 */
export class NovedadesService {
  
  static async getCurrentUserCompanyId(): Promise<string | null> {
    console.warn('🔒 [SECURITY] NovedadesService.getCurrentUserCompanyId is deprecated. Use SecureNovedadesService.');
    return SecureNovedadesService['getCurrentUserCompanyId']();
  }

  static async createNovedad(novedadData: CreateNovedadData): Promise<PayrollNovedad | null> {
    console.warn('🔒 [SECURITY] NovedadesService.createNovedad is deprecated. Use SecureNovedadesService.');
    return SecureNovedadesService.createNovedad(novedadData);
  }

  static async getNovedadesByEmployee(empleadoId: string, periodId: string): Promise<PayrollNovedad[]> {
    console.warn('🔒 [SECURITY] NovedadesService.getNovedadesByEmployee is deprecated. Use SecureNovedadesService.');
    return SecureNovedadesService.getNovedadesByEmployee(empleadoId, periodId);
  }

  static async updateNovedad(id: string, updates: Partial<CreateNovedadData>): Promise<PayrollNovedad | null> {
    console.warn('🔒 [SECURITY] NovedadesService.updateNovedad is deprecated. Use SecureNovedadesService.');
    return SecureNovedadesService.updateNovedad(id, updates);
  }

  static async deleteNovedad(id: string): Promise<void> {
    console.warn('🔒 [SECURITY] NovedadesService.deleteNovedad is deprecated. Use SecureNovedadesService.');
    return SecureNovedadesService.deleteNovedad(id);
  }
}