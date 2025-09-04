
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
  // In-memory caches to speed up dashboard loads
  private static companyIdCache: { value: string | null; expiresAt: number } | null = null;
  private static companyIdInFlight: Promise<string | null> | null = null;

  private static metricsCache: Record<string, { data: DashboardMetrics; expiresAt: number }> = {};
  private static recentEmployeesCache: Record<string, { data: RecentEmployee[]; expiresAt: number }> = {};
  private static activityCache: Record<string, { data: DashboardActivity[]; expiresAt: number }> = {};
  private static trendsCache: Record<string, { data: MonthlyPayrollTrend[]; expiresAt: number }> = {};
  private static efficiencyCache: Record<string, { data: EfficiencyMetric[]; expiresAt: number }> = {};

  // Cache TTLs (in ms)
  private static TTL = {
    companyId: 10 * 60 * 1000, // 10 minutes
    metrics: 5 * 60 * 1000,    // 5 minutes
    recent: 2 * 60 * 1000,     // 2 minutes
    activity: 2 * 60 * 1000,   // 2 minutes
    trends: 5 * 60 * 1000,     // 5 minutes
    efficiency: 60 * 1000      // 1 minute
  } as const;

  private static now() {
    return Date.now();
  }

  static async getCurrentCompanyId(force = false): Promise<string | null> {
    try {
      // Use cached company_id if available and not expired
      if (!force && this.companyIdCache && this.companyIdCache.expiresAt > this.now()) {
        return this.companyIdCache.value;
      }

      // Deduplicate concurrent requests
      if (this.companyIdInFlight) {
        return this.companyIdInFlight;
      }

      this.companyIdInFlight = (async () => {
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

        const value = profile?.company_id || null;
        this.companyIdCache = { value, expiresAt: this.now() + this.TTL.companyId };
        return value;
      })();

      const result = await this.companyIdInFlight;
      this.companyIdInFlight = null;
      return result;
    } catch (error) {
      console.error('Error getting current company ID:', error);
      this.companyIdInFlight = null;
      return null;
    }
  }

  static async getDashboardMetrics(options?: { force?: boolean }): Promise<DashboardMetrics> {
    try {
      const companyId = await this.getCurrentCompanyId(options?.force);
      if (!companyId) {
        return {
          totalEmployees: 0,
          activeEmployees: 0,
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

      // Serve from cache when valid
      const cacheKey = companyId;
      const cached = this.metricsCache[cacheKey];
      if (!options?.force && cached && cached.expiresAt > this.now()) {
        return cached.data;
      }

      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);

      const [
        employeesCountRes,
        payrollsProcessedCountRes,
        alertsCountRes,
        payrollDataRes
      ] = await Promise.all([
        supabase
          .from('employees')
          .select('*', { count: 'estimated', head: true })
          .eq('company_id', companyId)
          .eq('estado', 'activo'),
        supabase
          .from('payrolls')
          .select('*', { count: 'estimated', head: true })
          .eq('company_id', companyId)
          .in('estado', ['procesada', 'pagada']),
        supabase
          .from('dashboard_alerts')
          .select('*', { count: 'estimated', head: true })
          .eq('company_id', companyId)
          .eq('priority', 'high')
          .eq('dismissed', false),
        supabase
          .from('payrolls')
          .select('neto_pagado')
          .eq('company_id', companyId)
          .gte('created_at', lastMonth.toISOString())
          .in('estado', ['procesada', 'pagada'])
      ]);

      const totalEmpleados = employeesCountRes?.count || 0;
      const nominasProcesadas = payrollsProcessedCountRes?.count || 0;
      const alertasLegales = alertsCountRes?.count || 0;
      const gastosNomina = payrollDataRes?.data?.reduce(
        (sum: number, payroll: any) => sum + (parseFloat(payroll.neto_pagado?.toString() || '0')),
        0
      ) || 0;

      const result: DashboardMetrics = {
        totalEmployees: totalEmpleados,
        activeEmployees: totalEmpleados,
        pendingPayrolls: 0,
        monthlyPayrollTotal: gastosNomina,
        complianceScore: 85,
        alerts: alertasLegales,
        totalEmpleados,
        nominasProcesadas,
        alertasLegales,
        gastosNomina,
        tendenciaMensual: 5.2
      };

      this.metricsCache[cacheKey] = { data: result, expiresAt: this.now() + this.TTL.metrics };
      return result;
    } catch (error) {
      console.error('Error fetching dashboard metrics:', error);
      return {
        totalEmployees: 0,
        activeEmployees: 0,
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

  static async getRecentEmployees(options?: { force?: boolean }): Promise<RecentEmployee[]> {
    try {
      const companyId = await this.getCurrentCompanyId(options?.force);
      if (!companyId) return [];

      const cacheKey = companyId;
      const cached = this.recentEmployeesCache[cacheKey];
      if (!options?.force && cached && cached.expiresAt > this.now()) {
        return cached.data;
      }

      const { data, error } = await supabase
        .from('employees')
        .select('id, nombre, apellido, cargo, created_at, estado')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;

      const mapped = data?.map(employee => ({
        id: employee.id,
        name: `${employee.nombre} ${employee.apellido}`,
        position: employee.cargo || 'Sin cargo',
        dateAdded: new Date(employee.created_at).toLocaleDateString('es-ES'),
        status: employee.estado as 'activo' | 'pendiente' | 'inactivo'
      })) || [];

      this.recentEmployeesCache[cacheKey] = { data: mapped, expiresAt: this.now() + this.TTL.recent };
      return mapped;
    } catch (error) {
      console.error('Error fetching recent employees:', error);
      return [];
    }
  }

  static async getDashboardActivity(options?: { force?: boolean }): Promise<DashboardActivity[]> {
    try {
      const companyId = await this.getCurrentCompanyId(options?.force);
      if (!companyId) return [];

      const cacheKey = companyId;
      const cached = this.activityCache[cacheKey];
      if (!options?.force && cached && cached.expiresAt > this.now()) {
        return cached.data;
      }

      const [payrollRes, employeeRes] = await Promise.all([
        supabase
          .from('payrolls')
          .select('created_at, estado')
          .eq('company_id', companyId)
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('employees')
          .select('created_at, nombre, apellido, estado')
          .eq('company_id', companyId)
          .order('created_at', { ascending: false })
          .limit(3)
      ]);

      const activities: DashboardActivity[] = [];

      payrollRes.data?.forEach((payroll: any) => {
        activities.push({
          id: `payroll-${payroll.created_at}`,
          action: `Nómina ${payroll.estado}`,
          user: 'Sistema',
          timestamp: payroll.created_at,
          type: 'payroll'
        });
      });

      employeeRes.data?.forEach((employee: any) => {
        activities.push({
          id: `employee-${employee.created_at}`,
          action: `Nuevo empleado: ${employee.nombre} ${employee.apellido}`,
          user: 'Sistema',
          timestamp: employee.created_at,
          type: 'employee'
        });
      });

      const result = activities
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 8);

      this.activityCache[cacheKey] = { data: result, expiresAt: this.now() + this.TTL.activity };
      return result;
    } catch (error) {
      console.error('Error fetching dashboard activity:', error);
      return [];
    }
  }

  // NUEVAS FUNCIONES CON DATOS REALES

  static async getMonthlyPayrollTrends(options?: { force?: boolean }): Promise<MonthlyPayrollTrend[]> {
    try {
      const companyId = await this.getCurrentCompanyId(options?.force);
      if (!companyId) return [];

      const cacheKey = companyId;
      const cached = this.trendsCache[cacheKey];
      if (!options?.force && cached && cached.expiresAt > this.now()) {
        return cached.data;
      }

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

      const result = Object.values(groupedData || {}).slice(0, 6);
      this.trendsCache[cacheKey] = { data: result, expiresAt: this.now() + this.TTL.trends };
      return result;
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

  static async getEfficiencyMetrics(options?: { force?: boolean }): Promise<EfficiencyMetric[]> {
    try {
      const companyId = await this.getCurrentCompanyId(options?.force);
      if (!companyId) return [];

      const cacheKey = companyId;
      const cached = this.efficiencyCache[cacheKey];
      if (!options?.force && cached && cached.expiresAt > this.now()) {
        return cached.data;
      }

      // Compute date ranges
      const currentMonth = new Date();
      currentMonth.setDate(1);
      const previousMonth = new Date(currentMonth);
      previousMonth.setMonth(previousMonth.getMonth() - 1);

      const [currentRes, previousRes] = await Promise.all([
        supabase
          .from('payrolls')
          .select('total_devengado, total_deducciones, neto_pagado')
          .eq('company_id', companyId)
          .gte('created_at', currentMonth.toISOString())
          .in('estado', ['procesada', 'pagada']),
        supabase
          .from('payrolls')
          .select('total_devengado, total_deducciones, neto_pagado')
          .eq('company_id', companyId)
          .gte('created_at', previousMonth.toISOString())
          .lt('created_at', currentMonth.toISOString())
          .in('estado', ['procesada', 'pagada'])
      ]);

      const currentData = currentRes.data || [];
      const previousData = previousRes.data || [];

      const currentTotal = currentData.reduce((sum, p: any) => sum + parseFloat(p.neto_pagado?.toString() || '0'), 0) || 0;
      const previousTotal = previousData.reduce((sum, p: any) => sum + parseFloat(p.neto_pagado?.toString() || '0'), 0) || 0;
      const change = previousTotal > 0 ? ((currentTotal - previousTotal) / previousTotal) * 100 : 0;

      const avgSalaryCurrent = currentData.length ? currentTotal / currentData.length : 0;
      const avgSalaryPrev = previousData.length ? previousTotal / previousData.length : 0;
      const avgSalaryChange = avgSalaryPrev > 0 ? ((avgSalaryCurrent - avgSalaryPrev) / avgSalaryPrev) * 100 : 0;

      const result: EfficiencyMetric[] = [
        {
          metric: 'Costo Total Nómina',
          value: currentTotal,
          change: change,
          unit: 'COP'
        },
        {
          metric: 'Salario Promedio',
          value: avgSalaryCurrent,
          change: avgSalaryChange,
          unit: 'COP'
        },
        {
          metric: 'Empleados Procesados',
          value: currentData.length || 0,
          change: ((currentData.length || 0) - (previousData.length || 0)) / Math.max(previousData.length || 1, 1) * 100,
          unit: 'empleados'
        }
      ];

      this.efficiencyCache[cacheKey] = { data: result, expiresAt: this.now() + this.TTL.efficiency };
      return result;
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
