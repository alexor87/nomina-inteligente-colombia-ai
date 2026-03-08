import { SecureNovedadesService } from './SecureNovedadesService';
import { PayrollNovedad, CreateNovedadData } from '@/types/novedades';

/**
 * @deprecated Use SecureNovedadesService directly
 */
export class NovedadesService {
  static async getCurrentUserCompanyId(): Promise<string | null> {
    return SecureNovedadesService['getCurrentUserCompanyId']();
  }

  static async createNovedad(novedadData: CreateNovedadData): Promise<PayrollNovedad | null> {
    return SecureNovedadesService.createNovedad(novedadData);
  }

  static async getNovedadesByEmployee(empleadoId: string, periodId: string): Promise<PayrollNovedad[]> {
    return SecureNovedadesService.getNovedadesByEmployee(empleadoId, periodId);
  }

  static async updateNovedad(id: string, updates: Partial<CreateNovedadData>): Promise<PayrollNovedad | null> {
    return SecureNovedadesService.updateNovedad(id, updates);
  }

  static async deleteNovedad(id: string): Promise<void> {
    return SecureNovedadesService.deleteNovedad(id);
  }
}
