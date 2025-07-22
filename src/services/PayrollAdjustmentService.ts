
import { supabase } from '@/integrations/supabase/client';

export interface PayrollAdjustment {
  id: string;
  period_id: string;
  employee_id: string;
  concept: string;
  amount: number;
  observations: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CreateAdjustmentInput {
  periodId: string;
  employeeId: string;
  concept: string;
  amount: number;
  observations: string;
}

export class PayrollAdjustmentService {
  static async createAdjustment(input: CreateAdjustmentInput): Promise<PayrollAdjustment> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      // Validar que no existe un ajuste duplicado
      const { data: existingAdjustment } = await supabase
        .from('payroll_adjustments')
        .select('id')
        .eq('period_id', input.periodId)
        .eq('employee_id', input.employeeId)
        .eq('concept', input.concept)
        .maybeSingle();

      if (existingAdjustment) {
        throw new Error('Ya existe un ajuste para este concepto y empleado en este período');
      }

      const { data, error } = await supabase
        .from('payroll_adjustments')
        .insert({
          period_id: input.periodId,
          employee_id: input.employeeId,
          concept: input.concept,
          amount: input.amount,
          observations: input.observations,
          created_by: user.id
        })
        .select()
        .single();

      if (error) throw error;

      console.log('✅ Ajuste creado exitosamente:', data);
      return data;
    } catch (error) {
      console.error('❌ Error creando ajuste:', error);
      throw error;
    }
  }

  static async getAdjustmentsByPeriod(periodId: string): Promise<PayrollAdjustment[]> {
    try {
      const { data, error } = await supabase
        .from('payroll_adjustments')
        .select(`
          *,
          employee:employees(nombre, apellido),
          creator:profiles!created_by(full_name)
        `)
        .eq('period_id', periodId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('❌ Error obteniendo ajustes:', error);
      throw error;
    }
  }

  static async validateAdjustmentPermissions(periodId: string): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      // Verificar que el usuario tiene rol de administrador
      const { data: userRole } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'administrador')
        .maybeSingle();

      return !!userRole;
    } catch (error) {
      console.error('❌ Error validando permisos:', error);
      return false;
    }
  }
}
