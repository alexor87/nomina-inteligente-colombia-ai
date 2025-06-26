
import { supabase } from '@/integrations/supabase/client';

export class EmployeeStatusService {
  static async changeStatus(id: string, newStatus: string) {
    const { error } = await supabase
      .from('employees')
      .update({ estado: newStatus })
      .eq('id', id);

    if (error) throw error;
  }

  static async updateCentroCosto(id: string, centroCosto: string) {
    const { error } = await supabase
      .from('employees')
      .update({ centro_costo: centroCosto } as any)
      .eq('id', id);

    if (error) throw error;
  }

  static async updateNivelRiesgoARL(id: string, nivelRiesgo: 'I' | 'II' | 'III' | 'IV' | 'V') {
    const { error } = await supabase
      .from('employees')
      .update({ nivel_riesgo_arl: nivelRiesgo } as any)
      .eq('id', id);

    if (error) throw error;
  }
}
