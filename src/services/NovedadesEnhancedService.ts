/**
 * @deprecated Re-export stub - use SecureNovedadesService directly
 * Provides backward-compatible API surface
 */
import { supabase } from '@/integrations/supabase/client';
import { SecureNovedadesService } from './SecureNovedadesService';
import { PayrollNovedad, CreateNovedadData } from '@/types/novedades-enhanced';

export { PayrollNovedad, CreateNovedadData } from '@/types/novedades-enhanced';

export class NovedadesEnhancedService {
  static async createNovedad(data: CreateNovedadData): Promise<PayrollNovedad | null> {
    return SecureNovedadesService.createNovedad(data as any);
  }

  static async getNovedades(empleadoId: string, periodId: string): Promise<PayrollNovedad[]> {
    return SecureNovedadesService.getNovedadesByEmployee(empleadoId, periodId) as Promise<PayrollNovedad[]>;
  }

  static async getNovedadesByEmployee(empleadoId: string, periodId: string): Promise<PayrollNovedad[]> {
    return SecureNovedadesService.getNovedadesByEmployee(empleadoId, periodId) as Promise<PayrollNovedad[]>;
  }

  static async updateNovedad(id: string, updates: Partial<CreateNovedadData>): Promise<PayrollNovedad | null> {
    return SecureNovedadesService.updateNovedad(id, updates as any);
  }

  static async deleteNovedad(id: string): Promise<void> {
    return SecureNovedadesService.deleteNovedad(id);
  }

  static async getNovedadesByPeriod(periodId: string, companyId: string): Promise<PayrollNovedad[]> {
    const { data, error } = await supabase
      .from('payroll_novedades')
      .select('*')
      .eq('periodo_id', periodId)
      .eq('company_id', companyId);
    if (error) throw error;
    return (data || []) as unknown as PayrollNovedad[];
  }
}
