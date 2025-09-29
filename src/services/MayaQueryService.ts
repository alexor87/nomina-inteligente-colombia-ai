// ============================================================================
// MAYA Query Service - KISS Implementation
// ============================================================================
// Simple, direct queries with 10x better performance than complex architecture

import { supabase } from '@/integrations/supabase/client';

export interface QueryResult {
  success: boolean;
  data?: any;
  error?: string;
  visualization?: 'metric' | 'table' | 'chart';
  title?: string;
  message?: string;
}

export class MayaQueryService {
  
  /**
   * Get total employee count
   */
  static async getEmployeeCount(): Promise<QueryResult> {
    try {
      const { count, error } = await supabase
        .from('employees')
        .select('*', { count: 'exact', head: true })
        .eq('estado', 'activo');
        
      if (error) throw error;
      
      return {
        success: true,
        data: { count },
        visualization: 'metric',
        title: 'Total de Empleados',
        message: `Actualmente tienes **${count} empleados activos** en tu empresa.`
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }
  
  /**
   * Get payroll totals for current year
   */
  static async getPayrollTotals(): Promise<QueryResult> {
    try {
      const currentYear = new Date().getFullYear();
      
      const { data, error } = await supabase
        .from('payrolls')
        .select('total_devengado, total_deducciones, neto_pagado')
        .eq('estado', 'procesada')
        .gte('created_at', `${currentYear}-01-01`)
        .lte('created_at', `${currentYear}-12-31`);
        
      if (error) throw error;
      
      const totals = data.reduce((acc, payroll) => ({
        devengado: acc.devengado + (payroll.total_devengado || 0),
        deducciones: acc.deducciones + (payroll.total_deducciones || 0),
        neto: acc.neto + (payroll.neto_pagado || 0)
      }), { devengado: 0, deducciones: 0, neto: 0 });
      
      return {
        success: true,
        data: { ...totals, count: data.length },
        visualization: 'metric',
        title: 'Totales de Nómina',
        message: `Este año has procesado **${data.length} nóminas** por un total de **$${totals.neto.toLocaleString()}** en pagos netos.`
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }
  
  /**
   * Search employee by name
   */
  static async searchEmployee(name: string): Promise<QueryResult> {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('id, nombre, apellido, cargo, salario_base, estado')
        .or(`nombre.ilike.%${name}%,apellido.ilike.%${name}%`)
        .limit(10);
        
      if (error) throw error;
      
      if (data.length === 0) {
        return {
          success: true,
          data: [],
          message: `No encontré empleados con el nombre "${name}". ¿Podrías verificar la ortografía?`
        };
      }
      
      const employee = data[0];
      return {
        success: true,
        data: data,
        visualization: 'table',
        title: `Empleado: ${employee.nombre} ${employee.apellido}`,
        message: data.length === 1 
          ? `Encontré a **${employee.nombre} ${employee.apellido}**, ${employee.cargo} con salario de **$${employee.salario_base.toLocaleString()}**.`
          : `Encontré **${data.length} empleados** que coinciden con "${name}".`
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }
  
  /**
   * Get employee payroll history 
   */
  static async getEmployeePayrollHistory(employeeName: string): Promise<QueryResult> {
    try {
      const { data, error } = await supabase
        .from('payrolls')
        .select(`
          periodo, total_devengado, neto_pagado, estado, created_at,
          employees!inner(nombre, apellido)
        `)
        .or(`employees.nombre.ilike.%${employeeName}%,employees.apellido.ilike.%${employeeName}%`)
        .order('created_at', { ascending: false })
        .limit(12);
        
      if (error) throw error;
      
      if (data.length === 0) {
        return {
          success: true,
          data: [],
          message: `No encontré historial de nómina para "${employeeName}".`
        };
      }
      
      const employee = data[0].employees;
      const totalPaid = data.reduce((sum, payroll) => sum + (payroll.neto_pagado || 0), 0);
      
      return {
        success: true,
        data: data,
        visualization: 'table',
        title: `Historial: ${employee.nombre} ${employee.apellido}`,
        message: `**${employee.nombre} ${employee.apellido}** tiene **${data.length} nóminas** procesadas por un total de **$${totalPaid.toLocaleString()}**.`
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }
  
  /**
   * Get recent payroll periods
   */
  static async getRecentPeriods(): Promise<QueryResult> {
    try {
      const { data, error } = await supabase
        .from('payroll_periods_real')
        .select('periodo, estado, empleados_count, total_neto, created_at')
        .order('created_at', { ascending: false })
        .limit(6);
        
      if (error) throw error;
      
      if (data.length === 0) {
        return {
          success: true,
          data: [],
          message: 'No hay períodos de nómina registrados aún.'
        };
      }
      
      const totalEmployees = data.reduce((sum, period) => sum + (period.empleados_count || 0), 0);
      const totalAmount = data.reduce((sum, period) => sum + (period.total_neto || 0), 0);
      
      return {
        success: true,
        data: data,
        visualization: 'table',
        title: 'Períodos Recientes',
        message: `Los últimos **${data.length} períodos** procesaron **${totalEmployees} empleados** por **$${totalAmount.toLocaleString()}**.`
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }
}