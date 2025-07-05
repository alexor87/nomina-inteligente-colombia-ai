
import { supabase } from '@/integrations/supabase/client';

export class PayrollHistoryService {
  static async getCurrentUserCompanyId(): Promise<string | null> {
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

  static async getHistoryPeriods() {
    try {
      const companyId = await this.getCurrentUserCompanyId();
      if (!companyId) {
        throw new Error('No se pudo obtener la empresa del usuario');
      }

      const { data: periods, error } = await supabase
        .from('payroll_periods_real')
        .select('*')
        .eq('company_id', companyId)
        .order('fecha_inicio', { ascending: false });

      if (error) {
        console.error('Error fetching history periods:', error);
        throw error;
      }

      return periods?.map(period => ({
        id: period.id,
        period: period.periodo,
        startDate: period.fecha_inicio,
        endDate: period.fecha_fin,
        type: period.tipo_periodo,
        status: period.estado,
        employeesCount: period.empleados_count || 0,
        totalGrossPay: period.total_devengado || 0,
        totalDeductions: period.total_deducciones || 0,
        totalNetPay: period.total_neto || 0,
        createdAt: period.created_at,
        updatedAt: period.updated_at
      })) || [];
    } catch (error) {
      console.error('Error getting history periods:', error);
      return [];
    }
  }

  static async recalculateEmployeeTotalsWithNovedades(employeeId: string, periodId: string) {
    console.log('🔄 Recalculating employee totals with novedades:', { employeeId, periodId });
    // This method is used by other services but the core logic will be in the new liquidation service
  }
}
