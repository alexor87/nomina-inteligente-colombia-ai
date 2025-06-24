
import { supabase } from '@/integrations/supabase/client';
import { ReportMetrics, ExportHistory } from '@/types/reports';

export class ReportsMetricsService {
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

  static async getReportMetrics(): Promise<ReportMetrics> {
    try {
      const companyId = await this.getCurrentUserCompanyId();
      if (!companyId) {
        return {
          averageCostPerEmployee: 0,
          averageBenefitLoad: 0,
          totalMonthlyCost: 0,
          employeeCount: 0
        };
      }

      // Obtener total de empleados activos
      const { count: employeeCount } = await supabase
        .from('employees')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .eq('estado', 'activo');

      // Obtener datos de nómina del último mes
      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      
      const { data: payrollData } = await supabase
        .from('payrolls')
        .select('neto_pagado, salario_base')
        .eq('company_id', companyId)
        .gte('created_at', lastMonth.toISOString());

      const totalMonthlyCost = payrollData?.reduce((sum, payroll) => 
        sum + (parseFloat(payroll.neto_pagado?.toString() || '0')), 0) || 0;

      const averageCostPerEmployee = employeeCount ? totalMonthlyCost / employeeCount : 0;
      const averageBenefitLoad = 0.42; // Este se puede calcular basado en aportes vs salario base

      return {
        averageCostPerEmployee,
        averageBenefitLoad,
        totalMonthlyCost,
        employeeCount: employeeCount || 0
      };
    } catch (error) {
      console.error('Error calculating report metrics:', error);
      return {
        averageCostPerEmployee: 0,
        averageBenefitLoad: 0,
        totalMonthlyCost: 0,
        employeeCount: 0
      };
    }
  }

  static async loadExportHistory(): Promise<ExportHistory[]> {
    try {
      const companyId = await this.getCurrentUserCompanyId();
      if (!companyId) return [];

      // Aquí se cargarían los exportes reales desde la base de datos
      // Por ahora retornamos un array vacío ya que no hay tabla de historial
      return [];
    } catch (error) {
      console.error('Error loading export history:', error);
      return [];
    }
  }

  static async getReportUsageStats(): Promise<{
    mostUsedReports: Array<{ reportType: string; count: number }>;
    exportsByFormat: Array<{ format: string; count: number }>;
    recentActivity: Array<{ action: string; timestamp: string; user: string }>;
  }> {
    try {
      const companyId = await this.getCurrentUserCompanyId();
      if (!companyId) {
        return {
          mostUsedReports: [],
          exportsByFormat: [],
          recentActivity: []
        };
      }

      // Obtener actividad reciente real
      const { data: activity } = await supabase
        .from('dashboard_activity')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(10);

      const recentActivity = activity?.map(item => ({
        action: item.action,
        timestamp: item.created_at,
        user: item.user_email
      })) || [];

      return {
        mostUsedReports: [], // Se puede implementar con una tabla de tracking
        exportsByFormat: [], // Se puede implementar con una tabla de tracking
        recentActivity
      };
    } catch (error) {
      console.error('Error getting report usage stats:', error);
      return {
        mostUsedReports: [],
        exportsByFormat: [],
        recentActivity: []
      };
    }
  }
}
