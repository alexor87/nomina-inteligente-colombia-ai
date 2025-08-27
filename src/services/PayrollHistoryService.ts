import { supabase } from '@/integrations/supabase/client';

export interface PayrollPeriodData {
  id: string;
  company_id: string;
  periodo: string;
  fecha_inicio: string;
  fecha_fin: string;
  tipo_periodo: string;
  estado: string;
  empleados_count: number;
  total_devengado: number;
  total_deducciones: number;
  total_neto: number;
  created_at: string;
  updated_at: string;
}

export interface PayrollEmployeeData {
  id: string;
  period_id: string;
  employee_id: string;
  salario_base: number;
  dias_trabajados: number;
  total_devengado: number;
  total_deducciones: number;
  neto_pagado: number;
  auxilio_transporte: number;
  salud_empleado: number;
  pension_empleado: number;
  horas_extra: number;
  bonificaciones: number;
  comisiones: number;
  cesantias: number;
  prima: number;
  vacaciones: number;
  incapacidades: number;
  otros_devengos: number;
  descuentos_varios: number;
  retencion_fuente: number;
  // Employee data joined
  nombre: string;
  apellido: string;
  cedula: string;
  cargo: string;
  eps: string;
  afp: string;
}

export class PayrollHistoryService {
  /**
   * Get period data from payroll_periods_real
   */
  static async getPeriodData(periodId: string): Promise<PayrollPeriodData | null> {
    try {
      const { data, error } = await supabase
        .from('payroll_periods_real')
        .select('*')
        .eq('id', periodId)
        .single();

      if (error) {
        console.error('Error fetching period data:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error in getPeriodData:', error);
      throw error;
    }
  }

  /**
   * Get processed payroll data for employees in a period from payrolls table
   */
  static async getPeriodEmployees(periodId: string): Promise<PayrollEmployeeData[]> {
    try {
      const { data, error } = await supabase
        .from('payrolls')
        .select(`
          *,
          employees:employee_id (
            nombre,
            apellido,
            cedula,
            cargo,
            eps,
            afp
          )
        `)
        .eq('period_id', periodId);

      if (error) {
        console.error('Error fetching period employees:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        console.log('No payroll records found for period:', periodId);
        return [];
      }

      // Transform the data to flat structure
      return data.map((payroll: any) => ({
        id: payroll.id,
        period_id: payroll.period_id,
        employee_id: payroll.employee_id,
        salario_base: payroll.salario_base || 0,
        dias_trabajados: payroll.dias_trabajados || 30,
        total_devengado: payroll.total_devengado || 0,
        total_deducciones: payroll.total_deducciones || 0,
        neto_pagado: payroll.neto_pagado || 0,
        auxilio_transporte: payroll.auxilio_transporte || 0,
        salud_empleado: payroll.salud_empleado || 0,
        pension_empleado: payroll.pension_empleado || 0,
        horas_extra: payroll.horas_extra || 0,
        bonificaciones: payroll.bonificaciones || 0,
        comisiones: payroll.comisiones || 0,
        cesantias: payroll.cesantias || 0,
        prima: payroll.prima || 0,
        vacaciones: payroll.vacaciones || 0,
        incapacidades: payroll.incapacidades || 0,
        otros_devengos: payroll.otros_devengos || 0,
        descuentos_varios: payroll.descuentos_varios || 0,
        retencion_fuente: payroll.retencion_fuente || 0,
        // Employee data
        nombre: payroll.employees?.nombre || '',
        apellido: payroll.employees?.apellido || '',
        cedula: payroll.employees?.cedula || '',
        cargo: payroll.employees?.cargo || '',
        eps: payroll.employees?.eps || '',
        afp: payroll.employees?.afp || ''
      }));
    } catch (error) {
      console.error('Error in getPeriodEmployees:', error);
      throw error;
    }
  }

  /**
   * Calculate IBC (Ingreso Base de Cotización) based on base salary and worked days
   */
  static calculateIBC(salarioBase: number, diasTrabajados: number = 30): number {
    if (!salarioBase || salarioBase <= 0) return 0;
    
    // For partial periods, calculate proportional IBC
    const ibcDiario = salarioBase / 30;
    return ibcDiario * diasTrabajados;
  }

  /**
   * Get all periods for current company
   */
  static async getCompanyPeriods(): Promise<PayrollPeriodData[]> {
    try {
      const { data, error } = await supabase
        .from('payroll_periods_real')
        .select('*')
        .order('fecha_inicio', { ascending: false });

      if (error) {
        console.error('Error fetching company periods:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error in getCompanyPeriods:', error);
      throw error;
    }
  }
}