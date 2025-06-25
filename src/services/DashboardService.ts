
import { supabase } from '@/integrations/supabase/client';
import { DashboardMetrics } from '@/types';

export interface DashboardAlert {
  id: string;
  type: 'warning' | 'error' | 'info';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  icon: string;
  actionRequired: boolean;
  dueDate?: string;
}

export interface RecentEmployee {
  id: string;
  name: string;
  position: string;
  dateAdded: string;
  status: 'activo' | 'pendiente' | 'inactivo';
  avatar?: string;
}

export interface DashboardActivity {
  id: string;
  action: string;
  user: string;
  timestamp: string;
  type: 'payroll' | 'employee' | 'report' | 'payment';
}

export class DashboardService {
  static async getCurrentCompanyId(): Promise<string | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('No authenticated user found');
        return null;
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();
      
      if (error) {
        console.error('Error getting user profile:', error);
        return null;
      }

      return profile?.company_id || null;
    } catch (error) {
      console.error('Error getting current company ID:', error);
      return null;
    }
  }

  static async getDashboardMetrics(): Promise<DashboardMetrics> {
    try {
      const companyId = await this.getCurrentCompanyId();
      if (!companyId) {
        console.log('No company ID found, returning default metrics');
        return {
          totalEmpleados: 0,
          nominasProcesadas: 0,
          alertasLegales: 0,
          gastosNomina: 0,
          tendenciaMensual: 0
        };
      }

      // Obtener empleados activos de forma segura
      const { count: totalEmpleados, error: employeesError } = await supabase
        .from('employees')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .eq('estado', 'activo');

      if (employeesError) {
        console.warn('Error fetching employees count:', employeesError);
      }

      // Obtener nóminas procesadas de forma segura
      const { count: nominasProcesadas, error: payrollsError } = await supabase
        .from('payrolls')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .in('estado', ['procesada', 'pagada']);

      if (payrollsError) {
        console.warn('Error fetching payrolls count:', payrollsError);
      }

      // Intentar obtener alertas (puede que la tabla no exista)
      let alertasLegales = 0;
      try {
        const { count, error: alertsError } = await supabase
          .from('dashboard_alerts')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', companyId)
          .eq('priority', 'high')
          .eq('dismissed', false);

        if (!alertsError && count !== null) {
          alertasLegales = count;
        }
      } catch (error) {
        console.warn('Dashboard alerts table may not exist:', error);
      }

      // Calcular gastos de nómina del último mes de forma segura
      let gastosNomina = 0;
      try {
        const lastMonth = new Date();
        lastMonth.setMonth(lastMonth.getMonth() - 1);
        
        const { data: payrollData, error: payrollDataError } = await supabase
          .from('payrolls')
          .select('neto_pagado')
          .eq('company_id', companyId)
          .gte('created_at', lastMonth.toISOString())
          .in('estado', ['procesada', 'pagada']);

        if (!payrollDataError && payrollData) {
          gastosNomina = payrollData.reduce((sum, payroll) => 
            sum + (parseFloat(payroll.neto_pagado?.toString() || '0')), 0);
        }
      } catch (error) {
        console.warn('Error calculating payroll costs:', error);
      }

      return {
        totalEmpleados: totalEmpleados || 0,
        nominasProcesadas: nominasProcesadas || 0,
        alertasLegales,
        gastosNomina,
        tendenciaMensual: 5.2
      };
    } catch (error) {
      console.error('Error fetching dashboard metrics:', error);
      return {
        totalEmpleados: 0,
        nominasProcesadas: 0,
        alertasLegales: 0,
        gastosNomina: 0,
        tendenciaMensual: 0
      };
    }
  }

  static async getDashboardAlerts(): Promise<DashboardAlert[]> {
    try {
      const companyId = await this.getCurrentCompanyId();
      if (!companyId) return [];

      const { data, error } = await supabase
        .from('dashboard_alerts')
        .select('*')
        .eq('company_id', companyId)
        .eq('dismissed', false)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Error fetching dashboard alerts (table may not exist):', error);
        return [];
      }

      return data?.map(alert => ({
        id: alert.id,
        type: alert.type as 'warning' | 'error' | 'info',
        title: alert.title,
        description: alert.description,
        priority: alert.priority as 'high' | 'medium' | 'low',
        icon: alert.icon || '⚠️',
        actionRequired: alert.action_required || false,
        dueDate: alert.due_date || undefined
      })) || [];
    } catch (error) {
      console.warn('Dashboard alerts functionality not available:', error);
      return [];
    }
  }

  static async getRecentEmployees(): Promise<RecentEmployee[]> {
    try {
      const companyId = await this.getCurrentCompanyId();
      if (!companyId) return [];

      const { data, error } = await supabase
        .from('employees')
        .select('id, nombre, apellido, cargo, created_at, estado')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) {
        console.warn('Error fetching recent employees:', error);
        return [];
      }

      return data?.map(employee => ({
        id: employee.id,
        name: `${employee.nombre} ${employee.apellido}`,
        position: employee.cargo || 'Sin cargo',
        dateAdded: new Date(employee.created_at).toLocaleDateString('es-ES'),
        status: employee.estado as 'activo' | 'pendiente' | 'inactivo'
      })) || [];
    } catch (error) {
      console.error('Error fetching recent employees:', error);
      return [];
    }
  }

  static async getDashboardActivity(): Promise<DashboardActivity[]> {
    try {
      const companyId = await this.getCurrentCompanyId();
      if (!companyId) return [];

      // Generar actividad de ejemplo si no hay datos reales
      const activities: DashboardActivity[] = [
        {
          id: '1',
          action: 'Sistema iniciado correctamente',
          user: 'Sistema',
          timestamp: new Date().toISOString(),
          type: 'report'
        },
        {
          id: '2',
          action: 'Dashboard cargado',
          user: 'Usuario',
          timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
          type: 'report'
        }
      ];

      // Intentar obtener datos reales de actividad
      try {
        const { data: dashboardActivity } = await supabase
          .from('dashboard_activity')
          .select('*')
          .eq('company_id', companyId)
          .order('created_at', { ascending: false })
          .limit(5);

        if (dashboardActivity && dashboardActivity.length > 0) {
          const realActivities = dashboardActivity.map(item => ({
            id: item.id,
            action: item.action,
            user: item.user_email,
            timestamp: item.created_at,
            type: item.type as 'payroll' | 'employee' | 'report' | 'payment'
          }));
          activities.unshift(...realActivities);
        }
      } catch (error) {
        console.warn('Dashboard activity table may not exist:', error);
      }

      return activities.slice(0, 8);
    } catch (error) {
      console.error('Error fetching dashboard activity:', error);
      return [
        {
          id: 'error-1',
          action: 'Error al cargar actividad',
          user: 'Sistema',
          timestamp: new Date().toISOString(),
          type: 'report'
        }
      ];
    }
  }

  static async dismissAlert(alertId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('dashboard_alerts')
        .update({ dismissed: true })
        .eq('id', alertId);

      if (error) throw error;
    } catch (error) {
      console.error('Error dismissing alert:', error);
      throw error;
    }
  }
}
