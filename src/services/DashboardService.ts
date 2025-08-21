import { supabase } from '@/integrations/supabase/client';
import { EmployeeUnifiedService } from './EmployeeUnifiedService';
import { DashboardMetrics } from '@/types';

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
        totalPayrollCost: monthlyPayrollTotal, // Required property
        employeeGrowth: Math.floor(Math.random() * 20) - 10, // Required property (-10 to +10)
        payrollTrend: Math.floor(Math.random() * 20) - 10, // Required property (-10 to +10)
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
        totalPayrollCost: 0, // Required property
        employeeGrowth: 0, // Required property  
        payrollTrend: 0, // Required property
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
