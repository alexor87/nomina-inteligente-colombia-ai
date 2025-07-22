
import { supabase } from '@/integrations/supabase/client';

export interface PayrollPeriodHistory {
  id: string;
  period: string;
  startDate: string;
  endDate: string;
  type: 'mensual' | 'quincenal' | 'semanal';
  employeesCount: number;
  totalNetPay: number;
  status: 'original' | 'con_ajuste';
  createdAt: string;
  updatedAt: string;
}

export interface EmployeePayrollDetail {
  id: string;
  name: string;
  netPay: number;
  grossPay: number;
  position: string;
  hasVoucher: boolean;
}

export interface PayrollAdjustment {
  id: string;
  employeeId: string;
  employeeName: string;
  concept: string;
  amount: number;
  observations: string;
  createdBy: string;
  createdAt: string;
}

export interface PeriodDetail {
  period: PayrollPeriodHistory;
  employees: EmployeePayrollDetail[];
  adjustments: PayrollAdjustment[];
  summary: {
    totalDevengado: number;
    totalDeducciones: number;
    totalNeto: number;
    costoTotal: number;
    aportesEmpleador: number;
  };
}

export class HistoryServiceAleluya {
  /**
   * Obtener períodos liquidados con filtros
   */
  static async getPayrollHistory(filters: {
    year?: number;
    type?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<{
    periods: PayrollPeriodHistory[];
    total: number;
    hasMore: boolean;
  }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (!profile?.company_id) throw new Error('Empresa no encontrada');

      let query = supabase
        .from('payroll_periods_real')
        .select('*', { count: 'exact' })
        .eq('company_id', profile.company_id)
        .eq('estado', 'cerrado')
        .order('fecha_inicio', { ascending: false });

      // Aplicar filtros
      if (filters.year) {
        const startYear = new Date(filters.year, 0, 1).toISOString().split('T')[0];
        const endYear = new Date(filters.year, 11, 31).toISOString().split('T')[0];
        query = query.gte('fecha_inicio', startYear).lte('fecha_fin', endYear);
      }

      if (filters.type) {
        query = query.eq('tipo_periodo', filters.type);
      }

      // Paginación
      const page = filters.page || 1;
      const limit = filters.limit || 10;
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      const { data: periods, error, count } = await query.range(from, to);

      if (error) throw error;

      // Verificar si hay ajustes para cada período
      const periodsWithAdjustments = await Promise.all(
        (periods || []).map(async (period) => {
          const { data: adjustments } = await supabase
            .from('payroll_adjustments')
            .select('id')
            .eq('period_id', period.id)
            .limit(1);

          return {
            id: period.id,
            period: period.periodo,
            startDate: period.fecha_inicio,
            endDate: period.fecha_fin,
            type: period.tipo_periodo as 'mensual' | 'quincenal' | 'semanal',
            employeesCount: period.empleados_count || 0,
            totalNetPay: period.total_neto || 0,
            status: (adjustments && adjustments.length > 0) ? 'con_ajuste' : 'original',
            createdAt: period.created_at,
            updatedAt: period.updated_at
          } as PayrollPeriodHistory;
        })
      );

      return {
        periods: periodsWithAdjustments,
        total: count || 0,
        hasMore: (count || 0) > page * limit
      };
    } catch (error) {
      console.error('Error fetching payroll history:', error);
      throw error;
    }
  }

  /**
   * Obtener detalle de un período específico
   */
  static async getPeriodDetail(periodId: string): Promise<PeriodDetail> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (!profile?.company_id) throw new Error('Empresa no encontrada');

      // Obtener período
      const { data: period, error: periodError } = await supabase
        .from('payroll_periods_real')
        .select('*')
        .eq('id', periodId)
        .eq('company_id', profile.company_id)
        .single();

      if (periodError) throw periodError;

      // Obtener empleados del período
      const { data: payrolls, error: payrollsError } = await supabase
        .from('payrolls')
        .select(`
          *,
          employees:employee_id (
            id,
            nombre,
            apellido,
            cargo
          )
        `)
        .eq('period_id', periodId);

      if (payrollsError) throw payrollsError;

      // Obtener ajustes
      const { data: adjustments, error: adjustmentsError } = await supabase
        .from('payroll_adjustments')
        .select(`
          *,
          employees:employee_id (
            nombre,
            apellido
          ),
          profiles:created_by (
            email
          )
        `)
        .eq('period_id', periodId)
        .order('created_at', { ascending: false });

      if (adjustmentsError) throw adjustmentsError;

      // Verificar comprobantes
      const { data: vouchers } = await supabase
        .from('payroll_vouchers')
        .select('employee_id')
        .eq('periodo', period.periodo)
        .eq('company_id', profile.company_id);

      const voucherEmployeeIds = new Set(vouchers?.map(v => v.employee_id) || []);

      // Formatear datos
      const employees: EmployeePayrollDetail[] = (payrolls || []).map(payroll => ({
        id: payroll.employee_id,
        name: `${payroll.employees?.nombre || ''} ${payroll.employees?.apellido || ''}`.trim(),
        netPay: payroll.neto_pagado || 0,
        grossPay: payroll.total_devengado || 0,
        position: payroll.employees?.cargo || 'N/A',
        hasVoucher: voucherEmployeeIds.has(payroll.employee_id)
      }));

      const adjustmentsFormatted: PayrollAdjustment[] = (adjustments || []).map(adj => ({
        id: adj.id,
        employeeId: adj.employee_id,
        employeeName: `${adj.employees?.nombre || ''} ${adj.employees?.apellido || ''}`.trim(),
        concept: adj.concept,
        amount: adj.amount,
        observations: adj.observations || '',
        createdBy: adj.profiles?.email || 'Usuario desconocido',
        createdAt: adj.created_at
      }));

      const periodHistory: PayrollPeriodHistory = {
        id: period.id,
        period: period.periodo,
        startDate: period.fecha_inicio,
        endDate: period.fecha_fin,
        type: period.tipo_periodo as 'mensual' | 'quincenal' | 'semanal',
        employeesCount: period.empleados_count || 0,
        totalNetPay: period.total_neto || 0,
        status: adjustmentsFormatted.length > 0 ? 'con_ajuste' : 'original',
        createdAt: period.created_at,
        updatedAt: period.updated_at
      };

      return {
        period: periodHistory,
        employees,
        adjustments: adjustmentsFormatted,
        summary: {
          totalDevengado: period.total_devengado || 0,
          totalDeducciones: period.total_deducciones || 0,
          totalNeto: period.total_neto || 0,
          costoTotal: (period.total_devengado || 0) * 1.205, // Incluir aportes patronales
          aportesEmpleador: (period.total_devengado || 0) * 0.205
        }
      };
    } catch (error) {
      console.error('Error fetching period detail:', error);
      throw error;
    }
  }

  /**
   * Crear un ajuste para un período
   */
  static async createAdjustment(data: {
    periodId: string;
    employeeId: string;
    concept: string;
    amount: number;
    observations?: string;
  }): Promise<PayrollAdjustment> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      // Verificar si ya existe un ajuste para este empleado/concepto/período
      const { data: existingAdjustment } = await supabase
        .from('payroll_adjustments')
        .select('id')
        .eq('period_id', data.periodId)
        .eq('employee_id', data.employeeId)
        .eq('concept', data.concept)
        .single();

      if (existingAdjustment) {
        throw new Error('Ya existe un ajuste para este empleado y concepto en este período');
      }

      // Crear ajuste
      const { data: adjustment, error } = await supabase
        .from('payroll_adjustments')
        .insert({
          period_id: data.periodId,
          employee_id: data.employeeId,
          concept: data.concept,
          amount: data.amount,
          observations: data.observations || '',
          created_by: user.id
        })
        .select(`
          *,
          employees:employee_id (
            nombre,
            apellido
          ),
          profiles:created_by (
            email
          )
        `)
        .single();

      if (error) throw error;

      return {
        id: adjustment.id,
        employeeId: adjustment.employee_id,
        employeeName: `${adjustment.employees?.nombre || ''} ${adjustment.employees?.apellido || ''}`.trim(),
        concept: adjustment.concept,
        amount: adjustment.amount,
        observations: adjustment.observations || '',
        createdBy: adjustment.profiles?.email || 'Usuario desconocido',
        createdAt: adjustment.created_at
      };
    } catch (error) {
      console.error('Error creating adjustment:', error);
      throw error;
    }
  }

  /**
   * Generar comprobante PDF para un empleado
   */
  static async generateVoucherPDF(employeeId: string, periodId: string): Promise<string> {
    try {
      // Obtener datos del empleado y período
      const { data: payroll } = await supabase
        .from('payrolls')
        .select(`
          *,
          employees:employee_id (
            nombre,
            apellido,
            cedula
          )
        `)
        .eq('employee_id', employeeId)
        .eq('period_id', periodId)
        .single();

      if (!payroll) throw new Error('Liquidación no encontrada');

      const { data: period } = await supabase
        .from('payroll_periods_real')
        .select('*')
        .eq('id', periodId)
        .single();

      if (!period) throw new Error('Período no encontrado');

      // Por ahora retornar URL mock - en producción integrar con servicio de PDF
      return `/api/vouchers/${periodId}/${employeeId}.pdf`;
    } catch (error) {
      console.error('Error generating voucher PDF:', error);
      throw error;
    }
  }
}
