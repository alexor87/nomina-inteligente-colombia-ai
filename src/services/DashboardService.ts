
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
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.log('No authenticated user found:', userError);
        return null;
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error) {
        console.error('Error getting user profile:', error);
        return null;
      }

      if (!profile?.company_id) {
        console.warn('User profile found but no company_id assigned');
        return null;
      }

      return profile.company_id;
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

      // Obtener total de empleados activos para la empresa actual
      const { count: totalEmpleados } = await supabase
        .from('employees')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .eq('estado', 'activo');

      // Obtener total de nóminas procesadas para la empresa actual
      const { count: nominasProcesadas } = await supabase
        .from('payrolls')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .in('estado', ['procesada', 'pagada']);

      // Obtener alertas de alta prioridad para la empresa actual
      const { count: alertasLegales } = await supabase
        .from('dashboard_alerts')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .eq('priority', 'high')
        .eq('dismissed', false);

      // Calcular gastos de nómina del último mes
      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      
      const { data: payrollData } = await supabase
        .from('payrolls')
        .select('neto_pagado')
        .eq('company_id', companyId)
        .gte('created_at', lastMonth.toISOString())
        .in('estado', ['procesada', 'pagada']);

      const gastosNomina = payrollData?.reduce((sum, payroll) => 
        sum + (parseFloat(payroll.neto_pagado?.toString() || '0')), 0) || 0;

      return {
        totalEmpleados: totalEmpleados || 0,
        nominasProcesadas: nominasProcesadas || 0,
        alertasLegales: alertasLegales || 0,
        gastosNomina: gastosNomina,
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

      if (error) throw error;

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
      console.error('Error fetching dashboard alerts:', error);
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

      if (error) throw error;

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

      // Get recent payroll activity
      const { data: payrollActivity } = await supabase
        .from('payrolls')
        .select('created_at, estado, employees(nombre, apellido)')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(5);

      // Get recent employee activity
      const { data: employeeActivity } = await supabase
        .from('employees')
        .select('created_at, nombre, apellido, estado')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(3);

      const activities: DashboardActivity[] = [];

      // Add payroll activities
      payrollActivity?.forEach(payroll => {
        if (payroll.employees) {
          activities.push({
            id: `payroll-${payroll.created_at}`,
            action: `Procesó nómina para ${payroll.employees.nombre} ${payroll.employees.apellido}`,
            user: 'Sistema',
            timestamp: payroll.created_at,
            type: 'payroll'
          });
        }
      });

      // Add employee activities
      employeeActivity?.forEach(employee => {
        activities.push({
          id: `employee-${employee.created_at}`,
          action: `Nuevo empleado: ${employee.nombre} ${employee.apellido}`,
          user: 'Sistema',
          timestamp: employee.created_at,
          type: 'employee'
        });
      });

      // Sort by timestamp
      return activities
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 8);

    } catch (error) {
      console.error('Error fetching dashboard activity:', error);
      return [];
    }
  }

  static async getPayrollSummary(): Promise<{
    totalPaid: number;
    employeesPaid: number;
    pendingPayments: number;
    totalDeductions: number;
  }> {
    try {
      const { data, error } = await supabase
        .from('payrolls')
        .select('neto_pagado, total_deducciones, estado');

      if (error) throw error;

      const totalPaid = data?.reduce((sum, payroll) => 
        sum + (parseFloat(payroll.neto_pagado?.toString() || '0')), 0) || 0;
      
      const totalDeductions = data?.reduce((sum, payroll) => 
        sum + (parseFloat(payroll.total_deducciones?.toString() || '0')), 0) || 0;

      const employeesPaid = data?.filter(p => p.estado === 'pagada').length || 0;
      const pendingPayments = data?.filter(p => p.estado === 'procesada').length || 0;

      return {
        totalPaid,
        employeesPaid,
        pendingPayments,
        totalDeductions
      };
    } catch (error) {
      console.error('Error fetching payroll summary:', error);
      return {
        totalPaid: 0,
        employeesPaid: 0,
        pendingPayments: 0,
        totalDeductions: 0
      };
    }
  }

  static async getComplianceStatus(): Promise<{
    socialSecurityUpToDate: boolean;
    taxDeclarationsUpToDate: boolean;
    laborCertificatesUpToDate: boolean;
    nextDeadline: string;
    nextDeadlineType: string;
  }> {
    // Por ahora devolvemos datos estáticos, pero se puede implementar lógica real
    return {
      socialSecurityUpToDate: true,
      taxDeclarationsUpToDate: false,
      laborCertificatesUpToDate: true,
      nextDeadline: '2025-02-15',
      nextDeadlineType: 'Declaración de retenciones'
    };
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

  static async logActivity(action: string, type: 'payroll' | 'employee' | 'report' | 'payment'): Promise<void> {
    try {
      const companyId = await this.getCurrentCompanyId();
      const user = (await supabase.auth.getUser()).data.user;
      
      if (!companyId || !user) return;

      const { error } = await supabase
        .from('dashboard_activity')
        .insert({
          company_id: companyId,
          user_email: user.email || 'Unknown',
          action,
          type
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error logging activity:', error);
    }
  }
}
