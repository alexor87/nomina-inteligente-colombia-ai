import { supabase } from '@/integrations/supabase/client';
import { EmployeeUnifiedService } from './EmployeeUnifiedService';
import { DashboardMetrics } from '@/types';

export interface RecentEmployee {
  id: string;
  name: string;
  position: string;
  status: string;
  joinDate: string;
}

export interface DashboardActivity {
  id: string;
  type: string;
  action: string;
  user: string;
  timestamp: string;
}

export interface MonthlyPayrollTrend {
  month: string;
  amount: number;
  employees: number;
  change: number;
}

export interface EfficiencyMetric {
  metric: string;
  value: number;
  unit: string;
  change: number;
}

export interface SalaryDistribution {
  range: string;
  count: number;
  percentage: number;
  position?: string;
  employeeCount?: number;
  averageSalary?: number;
  minSalary?: number;
  maxSalary?: number;
}

export class DashboardService {
  static async getDashboardMetrics(companyId: string): Promise<DashboardMetrics> {
    try {
      // Get employees data
      const employeesResponse = await EmployeeUnifiedService.getByCompanyId(companyId);
      const employees = employeesResponse.data || [];
      
      // Calculate basic metrics
      const totalEmployees = employees.length;
      const activeEmployees = employees.filter(emp => emp.estado === 'activo').length;
      
      // Calculate payroll metrics
      const monthlyPayrollTotal = employees
        .filter(emp => emp.estado === 'activo')
        .reduce((sum, emp) => sum + (emp.salarioBase || 0), 0);
      
      // Mock additional metrics - in real implementation these would come from actual data
      const pendingPayrolls = Math.floor(Math.random() * 5);
      const complianceScore = Math.floor(Math.random() * 20) + 80; // 80-100%
      const alerts = Math.floor(Math.random() * 10);
      
      return {
        totalEmployees,
        activeEmployees,
        pendingPayrolls,
        totalPayrollCost: monthlyPayrollTotal,
        employeeGrowth: Math.floor(Math.random() * 20) - 10,
        payrollTrend: Math.floor(Math.random() * 20) - 10,
        monthlyPayrollTotal,
        complianceScore,
        alerts,
        totalEmpleados: totalEmployees,
        nominasProcesadas: Math.floor(Math.random() * 50),
        alertasLegales: alerts,
        gastosNomina: monthlyPayrollTotal,
        tendenciaMensual: Math.floor(Math.random() * 20) - 10
      };
    } catch (error) {
      console.error('Error fetching dashboard metrics:', error);
      
      // Return default metrics on error
      return {
        totalEmployees: 0,
        activeEmployees: 0,
        pendingPayrolls: 0,
        totalPayrollCost: 0,
        employeeGrowth: 0,
        payrollTrend: 0,
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

  static async getRecentEmployees(companyId: string = 'default'): Promise<RecentEmployee[]> {
    try {
      const employeesResponse = await EmployeeUnifiedService.getByCompanyId(companyId);
      const employees = employeesResponse.data || [];
      
      return employees.slice(0, 5).map(emp => ({
        id: emp.id,
        name: `${emp.nombre} ${emp.apellido}`,
        position: emp.cargo || 'Sin cargo',
        status: emp.estado,
        joinDate: emp.fechaIngreso
      }));
    } catch (error) {
      console.error('Error fetching recent employees:', error);
      return [];
    }
  }

  static async getDashboardActivity(companyId: string = 'default'): Promise<DashboardActivity[]> {
    try {
      // Mock activity data - replace with actual data fetching
      return [
        {
          id: '1',
          type: 'payroll',
          action: 'Nómina procesada para período 2024-01',
          user: 'Admin',
          timestamp: new Date().toISOString()
        },
        {
          id: '2',
          type: 'employee',
          action: 'Nuevo empleado agregado',
          user: 'RH Manager',
          timestamp: new Date(Date.now() - 86400000).toISOString()
        }
      ];
    } catch (error) {
      console.error('Error fetching dashboard activity:', error);
      return [];
    }
  }

  static async getMonthlyPayrollTrends(companyId: string = 'default'): Promise<MonthlyPayrollTrend[]> {
    try {
      // Mock trend data - replace with actual data fetching
      const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'];
      return months.map((month, index) => ({
        month,
        amount: 50000000 + Math.random() * 10000000,
        employees: 25 + Math.floor(Math.random() * 10),
        change: Math.floor(Math.random() * 20) - 10
      }));
    } catch (error) {
      console.error('Error fetching payroll trends:', error);
      return [];
    }
  }

  static async getEfficiencyMetrics(companyId: string = 'default'): Promise<EfficiencyMetric[]> {
    try {
      return [
        {
          metric: 'Costo Total Nómina',
          value: 75000000,
          unit: 'COP',
          change: 5.2
        },
        {
          metric: 'Salario Promedio',
          value: 3000000,
          unit: 'COP',
          change: -2.1
        },
        {
          metric: 'Empleados Procesados',
          value: 25,
          unit: 'empleados',
          change: 8.3
        }
      ];
    } catch (error) {
      console.error('Error fetching efficiency metrics:', error);
      return [];
    }
  }

  static async getEmployeesCount(companyId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('employees')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId);

      if (error) {
        console.error('Error fetching employees count:', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('Error getting employees count:', error);
      return 0;
    }
  }

  static async getActiveEmployeesCount(companyId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('employees')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .eq('estado', 'activo');

      if (error) {
        console.error('Error fetching active employees count:', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('Error getting active employees count:', error);
      return 0;
    }
  }

  static async getPendingPayrollsCount(companyId: string): Promise<number> {
    try {
      // Mock implementation - replace with actual data fetching
      return Math.floor(Math.random() * 5);
    } catch (error) {
      console.error('Error getting pending payrolls count:', error);
      return 0;
    }
  }

  static async getMonthlyPayrollTotal(companyId: string): Promise<number> {
    try {
      // Mock implementation - replace with actual data fetching
      const employeesResponse = await EmployeeUnifiedService.getByCompanyId(companyId);
      const employees = employeesResponse.data || [];
      
      return employees
        .filter(emp => emp.estado === 'activo')
        .reduce((sum, emp) => sum + (emp.salarioBase || 0), 0);
    } catch (error) {
      console.error('Error getting monthly payroll total:', error);
      return 0;
    }
  }

  static async getComplianceScore(companyId: string): Promise<number> {
    try {
      // Mock implementation - replace with actual data fetching
      return Math.floor(Math.random() * 20) + 80; // 80-100%
    } catch (error) {
      console.error('Error getting compliance score:', error);
      return 0;
    }
  }

  static async getAlertsCount(companyId: string): Promise<number> {
    try {
      // Mock implementation - replace with actual data fetching
      return Math.floor(Math.random() * 10);
    } catch (error) {
      console.error('Error getting alerts count:', error);
      return 0;
    }
  }

  static async getPayrollTrends(companyId: string) {
    // Mock implementation - replace with actual data fetching
    return {
      totalPayrollCost: 0,
      employeeGrowth: 0,
      payrollTrend: 0,
      monthlyPayrollTotal: 0,
      complianceScore: 85,
      alerts: 2,
      totalEmpleados: 0,
      nominasProcesadas: 0,
      alertasLegales: 2,
      gastosNomina: 0,
      tendenciaMensual: 0
    };
  }

  static async getComplianceMetrics(companyId: string) {
    // Mock implementation - replace with actual data fetching  
    return {
      totalEmployees: 0,
      activeEmployees: 0,
      pendingPayrolls: 0,
      totalPayrollCost: 0,
      employeeGrowth: 0,
      payrollTrend: 0,
      monthlyPayrollTotal: 0,
      complianceScore: 85,
      alerts: 2,
      totalEmpleados: 0,
      nominasProcesadas: 0,
      alertasLegales: 2,
      gastosNomina: 0,
      tendenciaMensual: 0
    };
  }
}
