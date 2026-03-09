import { supabase } from '@/integrations/supabase/client';

export interface SubscriptionPlan {
  id: string;
  plan_id: string;
  nombre: string;
  precio: number;
  max_employees: number;
  max_payrolls_per_month: number;
  caracteristicas: string[];
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface PlanFormData {
  plan_id: string;
  nombre: string;
  precio: number;
  max_employees: number;
  max_payrolls_per_month: number;
  caracteristicas: string[];
  sort_order: number;
}

export const PlanService = {
  async getPlans(activeOnly = false): Promise<SubscriptionPlan[]> {
    let query = supabase
      .from('subscription_plans')
      .select('*')
      .order('sort_order', { ascending: true });

    if (activeOnly) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as unknown as SubscriptionPlan[];
  },

  async createPlan(plan: PlanFormData): Promise<void> {
    const { error } = await supabase
      .from('subscription_plans')
      .insert({
        plan_id: plan.plan_id,
        nombre: plan.nombre,
        precio: plan.precio,
        max_employees: plan.max_employees,
        max_payrolls_per_month: plan.max_payrolls_per_month,
        caracteristicas: plan.caracteristicas as unknown as any,
        sort_order: plan.sort_order,
      });
    if (error) throw error;
  },

  async updatePlan(id: string, plan: Partial<PlanFormData>): Promise<void> {
    const updateData: Record<string, any> = { updated_at: new Date().toISOString() };
    if (plan.nombre !== undefined) updateData.nombre = plan.nombre;
    if (plan.precio !== undefined) updateData.precio = plan.precio;
    if (plan.max_employees !== undefined) updateData.max_employees = plan.max_employees;
    if (plan.max_payrolls_per_month !== undefined) updateData.max_payrolls_per_month = plan.max_payrolls_per_month;
    if (plan.caracteristicas !== undefined) updateData.caracteristicas = plan.caracteristicas;
    if (plan.sort_order !== undefined) updateData.sort_order = plan.sort_order;
    if (plan.plan_id !== undefined) updateData.plan_id = plan.plan_id;

    const { error } = await supabase
      .from('subscription_plans')
      .update(updateData)
      .eq('id', id);
    if (error) throw error;
  },

  async togglePlanStatus(id: string, isActive: boolean): Promise<void> {
    const { error } = await supabase
      .from('subscription_plans')
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
  },
};
