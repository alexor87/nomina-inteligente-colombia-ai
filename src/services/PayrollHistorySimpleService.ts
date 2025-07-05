
/**
 * ✅ SERVICIO DE HISTORIAL SIMPLE - REPARACIÓN CRÍTICA
 * Conectado con arquitectura unificada
 */

import { supabase } from '@/integrations/supabase/client';
import { PayrollStateManager } from './PayrollStateManager';

export interface PayrollHistoryPeriod {
  id: string;
  period: string;
  startDate: string;
  endDate: string;
  type: 'semanal' | 'quincenal' | 'mensual';
  employeesCount: number;
  status: 'borrador' | 'active' | 'cerrado';
  totalGrossPay: number;
  totalNetPay: number;
  totalDeductions: number;
  totalCost: number;
  employerContributions: number;
  paymentStatus: 'pagado' | 'parcial' | 'pendiente';
  version: number;
  createdAt: string;
  updatedAt: string;
  editable: boolean;
}

export class PayrollHistorySimpleService {
  /**
   * Obtener períodos de historial usando arquitectura unificada
   */
  static async getHistoryPeriods(): Promise<PayrollHistoryPeriod[]> {
    try {
      const companyId = await this.getCurrentUserCompanyId();
      if (!companyId) {
        return [];
      }

      const { data: periods, error } = await supabase
        .from('payroll_periods_real')
        .select('*')
        .eq('company_id', companyId)
        .order('fecha_inicio', { ascending: false });

      if (error) {
        console.error('❌ Error loading history periods:', error);
        return [];
      }

      return (periods || []).map(period => ({
        id: period.id,
        period: period.periodo,
        startDate: period.fecha_inicio,
        endDate: period.fecha_fin,
        type: period.tipo_periodo as 'semanal' | 'quincenal' | 'mensual',
        employeesCount: period.empleados_count || 0,
        status: PayrollStateManager.normalizeState(period.estado) === 'closed' ? 'cerrado' : 
                PayrollStateManager.normalizeState(period.estado) === 'active' ? 'active' : 'borrador',
        totalGrossPay: Number(period.total_devengado) || 0,
        totalNetPay: Number(period.total_neto) || 0,
        totalDeductions: Number(period.total_deducciones) || 0,
        totalCost: Number(period.total_devengado) || 0,
        employerContributions: (Number(period.total_devengado) || 0) * 0.205,
        paymentStatus: PayrollStateManager.normalizeState(period.estado) === 'closed' ? 'pagado' : 'pendiente',
        version: 1,
        createdAt: period.created_at,
        updatedAt: period.updated_at,
        editable: PayrollStateManager.canEditPeriod(PayrollStateManager.normalizeState(period.estado))
      }));

    } catch (error) {
      console.error('❌ Error in getHistoryPeriods:', error);
      return [];
    }
  }

  private static async getCurrentUserCompanyId(): Promise<string | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      return profile?.company_id || null;
    } catch (error) {
      console.error('Error getting company ID:', error);
      return null;
    }
  }
}
