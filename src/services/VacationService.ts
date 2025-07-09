
import { supabase } from '@/integrations/supabase/client';

export interface VacationBalance {
  id: string;
  employee_id: string;
  company_id: string;
  accumulated_days: number;
  initial_balance: number;
  last_calculated: string;
  created_at: string;
  updated_at: string;
}

export class VacationService {
  /**
   * ✅ FASE 1 KISS: Crear balance de vacaciones inicial para un empleado
   */
  static async createVacationBalance(
    employeeId: string, 
    companyId: string, 
    initialDays: number = 0
  ): Promise<{ success: boolean; data?: VacationBalance; error?: string }> {
    try {
      console.log('🏖️ Creando balance de vacaciones:', { employeeId, companyId, initialDays });

      const { data, error } = await supabase
        .from('employee_vacation_balances')
        .insert({
          employee_id: employeeId,
          company_id: companyId,
          initial_balance: initialDays,
          accumulated_days: 0, // Fase 1: solo capturamos inicial
          last_calculated: new Date().toISOString().split('T')[0]
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Error creando balance de vacaciones:', error);
        return { success: false, error: error.message };
      }

      console.log('✅ Balance de vacaciones creado exitosamente:', data);
      return { success: true, data };

    } catch (error: any) {
      console.error('💥 Error inesperado en createVacationBalance:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * ✅ FASE 1 KISS: Obtener balance de vacaciones de un empleado
   */
  static async getVacationBalance(employeeId: string): Promise<{ success: boolean; data?: VacationBalance; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('employee_vacation_balances')
        .select('*')
        .eq('employee_id', employeeId)
        .single();

      if (error) {
        console.error('❌ Error obteniendo balance de vacaciones:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data };

    } catch (error: any) {
      console.error('💥 Error inesperado en getVacationBalance:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * ✅ FASE 1 KISS: Actualizar balance inicial de vacaciones
   */
  static async updateInitialBalance(
    employeeId: string, 
    initialDays: number
  ): Promise<{ success: boolean; data?: VacationBalance; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('employee_vacation_balances')
        .update({ 
          initial_balance: initialDays,
          updated_at: new Date().toISOString()
        })
        .eq('employee_id', employeeId)
        .select()
        .single();

      if (error) {
        console.error('❌ Error actualizando balance inicial:', error);
        return { success: false, error: error.message };
      }

      console.log('✅ Balance inicial actualizado:', data);
      return { success: true, data };

    } catch (error: any) {
      console.error('💥 Error inesperado en updateInitialBalance:', error);
      return { success: false, error: error.message };
    }
  }
}
