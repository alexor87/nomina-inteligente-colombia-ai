
import { supabase } from '@/integrations/supabase/client';
import { PayrollHistoryPeriod, PayrollHistoryEmployee } from '@/types/payroll-history';

/**
 * ✅ SERVICIO SIMPLE DE HISTORIAL - CORRECCIÓN FASE 1
 * Funciona con datos existentes sin dependencias complejas
 */
export class PayrollHistorySimpleService {
  
  /**
   * Obtener períodos de historial desde payroll_periods_real
   */
  static async getHistoryPeriods(): Promise<PayrollHistoryPeriod[]> {
    try {
      const { data, error } = await supabase
        .from('payroll_periods_real')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error obteniendo períodos:', error);
        throw error;
      }

      // Mapear datos existentes al formato esperado
      return (data || []).map(period => ({
        id: period.id,
        period: period.periodo,
        startDate: period.fecha_inicio,
        endDate: period.fecha_fin,
        type: period.tipo_periodo as 'semanal' | 'quincenal' | 'mensual' | 'personalizado',
        employeesCount: period.empleados_count || 0,
        status: period.estado as 'borrador' | 'cerrado' | 'con_errores' | 'editado' | 'reabierto',
        totalGrossPay: Number(period.total_devengado || 0),
        totalNetPay: Number(period.total_neto || 0),
        totalDeductions: Number(period.total_deducciones || 0),
        totalCost: Number(period.total_devengado || 0) + Number(period.total_deducciones || 0),
        employerContributions: 0, // Calcular si es necesario
        paymentStatus: 'pendiente' as const,
        version: 1,
        createdAt: period.created_at,
        updatedAt: period.updated_at,
        editable: period.estado === 'borrador'
      }));

    } catch (error) {
      console.error('Error en getHistoryPeriods:', error);
      return [];
    }
  }

  /**
   * Obtener empleados de un período específico
   */
  static async getPeriodEmployees(periodId: string): Promise<PayrollHistoryEmployee[]> {
    try {
      const { data, error } = await supabase
        .from('payrolls')
        .select(`
          id,
          employee_id,
          period_id,
          total_devengado,
          total_deducciones,
          neto_pagado,
          salario_base,
          employees!inner(nombre, apellido, cargo)
        `)
        .eq('period_id', periodId);

      if (error) {
        console.error('Error obteniendo empleados:', error);
        throw error;
      }

      return (data || []).map(payroll => ({
        id: payroll.employee_id,
        periodId: periodId,
        payrollId: payroll.id,
        name: `${payroll.employees.nombre} ${payroll.employees.apellido}`,
        position: payroll.employees.cargo || 'Sin cargo',
        grossPay: Number(payroll.total_devengado || 0),
        deductions: Number(payroll.total_deducciones || 0),
        netPay: Number(payroll.neto_pagado || 0),
        baseSalary: Number(payroll.salario_base || 0),
        paymentStatus: 'pendiente' as const
      }));

    } catch (error) {
      console.error('Error en getPeriodEmployees:', error);
      return [];
    }
  }

  /**
   * Obtener detalles completos de un período
   */
  static async getPeriodDetails(periodId: string) {
    try {
      // Obtener período
      const { data: periodData, error: periodError } = await supabase
        .from('payroll_periods_real')
        .select('*')
        .eq('id', periodId)
        .single();

      if (periodError) {
        throw periodError;
      }

      // Obtener empleados
      const employees = await this.getPeriodEmployees(periodId);

      const period: PayrollHistoryPeriod = {
        id: periodData.id,
        period: periodData.periodo,
        startDate: periodData.fecha_inicio,
        endDate: periodData.fecha_fin,
        type: periodData.tipo_periodo as 'semanal' | 'quincenal' | 'mensual' | 'personalizado',
        employeesCount: periodData.empleados_count || 0,
        status: periodData.estado as 'borrador' | 'cerrado' | 'con_errores' | 'editado' | 'reabierto',
        totalGrossPay: Number(periodData.total_devengado || 0),
        totalNetPay: Number(periodData.total_neto || 0),
        totalDeductions: Number(periodData.total_deducciones || 0),
        totalCost: Number(periodData.total_devengado || 0),
        employerContributions: 0,
        paymentStatus: 'pendiente' as const,
        version: 1,
        createdAt: periodData.created_at,
        updatedAt: periodData.updated_at,
        editable: periodData.estado === 'borrador'
      };

      return {
        period,
        summary: {
          totalDevengado: Number(periodData.total_devengado || 0),
          totalDeducciones: Number(periodData.total_deducciones || 0),
          totalNeto: Number(periodData.total_neto || 0),
          costoTotal: Number(periodData.total_devengado || 0),
          aportesEmpleador: 0
        },
        employees,
        files: {
          desprendibles: [],
          certificates: [],
          reports: []
        }
      };

    } catch (error) {
      console.error('Error en getPeriodDetails:', error);
      throw error;
    }
  }
}
