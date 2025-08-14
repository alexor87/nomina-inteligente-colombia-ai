
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

export interface MonthlyPayrollTrend {
  month: string;
  year: number;
  totalDevengado: number;
  totalDeducciones: number;
  totalNeto: number;
  employeesCount: number;
}

export interface SalaryDistribution {
  position: string;
  averageSalary: number;
  employeeCount: number;
  minSalary: number;
  maxSalary: number;
}

export interface EfficiencyMetric {
  metric: string;
  value: number;
  change: number;
  unit: string;
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
          totalEmployees: 0,
          activeEmployees: 0,
          inactiveEmployees: 0,
          totalPayroll: 0,
          averageSalary: 0,
          pendingPayments: 0,
          pendingPayrolls: 0,
          monthlyPayrollTotal: 0,
          complianceScore: 0,
          alerts: 0,
          totalEmpleados: 0,
          nominasProcesadas: 0,
          alertasLegales: 0,
          gastosNomina: 0,
          tendenciaMensual: 0
        };
      }

      // Obtener total de empleados activos
      const { count: totalEmpleados } = await supabase
        .from('employees')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .eq('estado', 'activo');

      // Obtener total de nóminas procesadas
      const { count: nominasProcesadas } = await supabase
        .from('payrolls')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .in('estado', ['procesada', 'pagada']);

      // Obtener alertas de alta prioridad
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

      const totalEmpleadosCount = totalEmpleados || 0;
      const nominasProcesadasCount = nominasProcesadas || 0;
      const alertasLegalesCount = alertasLegales || 0;

      return {
        totalEmployees: totalEmpleadosCount,
        activeEmployees: totalEmpleadosCount,
        inactiveEmployees: 0,
        totalPayroll: gastosNomina,
        averageSalary: totalEmpleadosCount > 0 ? gastosNomina / totalEmpleadosCount : 0,
        pendingPayments: 0,
        pendingPayrolls: 0,
        monthlyPayrollTotal: gastosNomina,
        complianceScore: 85,
        alerts: alertasLegalesCount,
        totalEmpleados: totalEmpleadosCount,
        nominasProcesadas: nominasProcesadasCount,
        alertasLegales: alertasLegalesCount,
        gastosNomina: gastosNomina,
        tendenciaMensual: 5.2
      };
    } catch (error) {
      console.error('Error fetching dashboard metrics:', error);
      return {
        totalEmployees: 0,
        activeEmployees: 0,
        inactiveEmployees: 0,
        totalPayroll: 0,
        averageSalary: 0,
        pendingPayments: 0,
        pendingPayrolls: 0,
        monthlyPayrollTotal: 0,
        complianceScore: 0,
        alerts: 0,
        totalEmpleados: 0,
        nominasProcesadas: 0,
        alertasLegales: 0,
        gastosNomina: 0,
        tendenciaMensual: 0
      };
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

      return activities
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 8);

    } catch (error) {
      console.error('Error fetching dashboard activity:', error);
      return [];
    }
  }

  // NUEVAS FUNCIONES CON DATOS REALES

  static async getMonthlyPayrollTrends(): Promise<MonthlyPayrollTrend[]> {
    try {
      const companyId = await this.getCurrentCompanyId();
      if (!companyId) return [];

      const { data, error } = await supabase
        .from('payrolls')
        .select('periodo, total_devengado, total_deducciones, neto_pagado, created_at')
        .eq('company_id', companyId)
        .in('estado', ['procesada', 'pagada'])
        .order('created_at', { ascending: false })
        .limit(12);

      if (error) throw error;

      // Group by period and calculate totals
      const groupedData = data?.reduce((acc, payroll) => {
        const period = payroll.periodo;
        if (!acc[period]) {
          acc[period] = {
            month: period,
            year: new Date(payroll.created_at).getFullYear(),
            totalDevengado: 0,
            totalDeducciones: 0,
            totalNeto: 0,
            employeesCount: 0
          };
        }
        
        acc[period].totalDevengado += parseFloat(payroll.total_devengado?.toString() || '0');
        acc[period].totalDeducciones += parseFloat(payroll.total_deducciones?.toString() || '0');
        acc[period].totalNeto += parseFloat(payroll.neto_pagado?.toString() || '0');
        acc[period].employeesCount += 1;
        
        return acc;
      }, {} as Record<string, MonthlyPayrollTrend>);

      return Object.values(groupedData || {}).slice(0, 6);
    } catch (error) {
      console.error('Error fetching monthly payroll trends:', error);
      return [];
    }
  }

  static async getSalaryDistributionByPosition(): Promise<SalaryDistribution[]> {
    try {
      const companyId = await this.getCurrentCompanyId();
      if (!companyId) return [];

      const { data, error } = await supabase
        .from('employees')
        .select('cargo, salario_base')
        .eq('company_id', companyId)
        .eq('estado', 'activo')
        .not('cargo', 'is', null);

      if (error) throw error;

      // Group by position and calculate statistics
      const groupedData = data?.reduce((acc, employee) => {
        const position = employee.cargo || 'Sin cargo';
        const salary = parseFloat(employee.salario_base?.toString() || '0');
        
        if (!acc[position]) {
          acc[position] = {
            position,
            salaries: [],
            employeeCount: 0
          };
        }
        
        acc[position].salaries.push(salary);
        acc[position].employeeCount += 1;
        
        return acc;
      }, {} as Record<string, any>);

      return Object.values(groupedData || {}).map((group: any) => ({
        position: group.position,
        averageSalary: group.salaries.reduce((sum: number, sal: number) => sum + sal, 0) / group.salaries.length,
        employeeCount: group.employeeCount,
        minSalary: Math.min(...group.salaries),
        maxSalary: Math.max(...group.salaries)
      })).slice(0, 5);
    } catch (error) {
      console.error('Error fetching salary distribution:', error);
      return [];
    }
  }

  static async getEfficiencyMetrics(): Promise<EfficiencyMetric[]> {
    try {
      const companyId = await this.getCurrentCompanyId();
      if (!companyId) return [];

      // Get current month data
      const currentMonth = new Date();
      currentMonth.setDate(1);
      
      const { data: currentData } = await supabase
        .from('payrolls')
        .select('total_devengado, total_deducciones, neto_pagado')
        .eq('company_id', companyId)
        .gte('created_at', currentMonth.toISOString())
        .in('estado', ['procesada', 'pagada']);

      // Get previous month data
      const previousMonth = new Date(currentMonth);
      previousMonth.setMonth(previousMonth.getMonth() - 1);
      
      const { data: previousData } = await supabase
        .from('payrolls')
        .select('total_devengado, total_deducciones, neto_pagado')
        .eq('company_id', companyId)
        .gte('created_at', previousMonth.toISOString())
        .lt('created_at', currentMonth.toISOString())
        .in('estado', ['procesada', 'pagada']);

      const currentTotal = currentData?.reduce((sum, p) => sum + parseFloat(p.neto_pagado?.toString() || '0'), 0) || 0;
      const previousTotal = previousData?.reduce((sum, p) => sum + parseFloat(p.neto_pagado?.toString() || '0'), 0) || 0;
      const change = previousTotal > 0 ? ((currentTotal - previousTotal) / previousTotal) * 100 : 0;

      const avgSalaryChange = currentData && previousData ? 
        ((currentTotal / currentData.length) - (previousTotal / previousData.length)) / (previousTotal / previousData.length) * 100 : 0;

      return [
        {
          metric: 'Costo Total Nómina',
          value: currentTotal,
          change: change,
          unit: 'COP'
        },
        {
          metric: 'Salario Promedio',
          value: currentData?.length ? currentTotal / currentData.length : 0,
          change: avgSalaryChange,
          unit: 'COP'
        },
        {
          metric: 'Empleados Procesados',
          value: currentData?.length || 0,
          change: ((currentData?.length || 0) - (previousData?.length || 0)) / Math.max(previousData?.length || 1, 1) * 100,
          unit: 'empleados'
        }
      ];
    } catch (error) {
      console.error('Error fetching efficiency metrics:', error);
      return [];
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
