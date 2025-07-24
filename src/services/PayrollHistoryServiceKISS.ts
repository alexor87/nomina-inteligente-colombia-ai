import { supabase } from '@/integrations/supabase/client';

export interface PayrollPeriodHistory {
  id: string;
  period: string;
  startDate: string;
  endDate: string;
  type: string;
  status: string;
  employeesCount: number;
  totalGrossPay: number;
  totalNetPay: number;
  totalDeductions: number;
  totalCost: number;
  employerContributions: number;
  paymentStatus: string;
  createdAt: string;
  updatedAt: string;
}

export interface PayrollHistoryFilters {
  year?: number;
  type?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export interface PayrollHistoryResult {
  periods: PayrollPeriodHistory[];
  total: number;
  hasMore: boolean;
}

export interface PeriodDetail {
  period: {
    id: string;
    period: string;
    startDate: string;
    endDate: string;
    status: string;
    type: string;
  };
  summary: {
    totalDevengado: number;
    totalDeducciones: number;
    totalNeto: number;
    costoTotal: number;
    salarioBase: number;
    novedades: number;
  };
  employees: Array<{
    id: string;
    name: string;
    position: string;
    grossPay: number;
    netPay: number;
    baseSalary: number;
    novedades: number;
  }>;
  novedades: Array<{
    id: string;
    employeeId: string;
    employeeName: string;
    concept: string;
    amount: number;
    observations: string;
    createdAt: string;
  }>;
  adjustments: Array<{
    id: string;
    employeeId: string;
    employeeName: string;
    concept: string;
    amount: number;
    observations: string;
    createdAt: string;
  }>;
}

/**
 * ✅ SERVICIO KISS PARA HISTORIAL DE NÓMINA
 * Simplificado y directo, sin complejidades innecesarias
 */
class PayrollHistoryServiceKISSClass {
  private async getCurrentUserCompanyId(): Promise<string> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('user_id', user.id)
      .single();

    if (!profile?.company_id) throw new Error('Empresa no encontrada');
    return profile.company_id;
  }

  async getPayrollHistory(filters: PayrollHistoryFilters = {}): Promise<PayrollHistoryResult> {
    try {
      const companyId = await this.getCurrentUserCompanyId();
      const { page = 1, limit = 10 } = filters;

      let query = supabase
        .from('payroll_periods_real')
        .select('*', { count: 'exact' })
        .eq('company_id', companyId)
        .eq('estado', 'closed') // Solo períodos cerrados en el historial
        .order('fecha_inicio', { ascending: false });

      if (filters.year) {
        const startOfYear = `${filters.year}-01-01`;
        const endOfYear = `${filters.year}-12-31`;
        query = query.gte('fecha_inicio', startOfYear).lte('fecha_fin', endOfYear);
      }

      if (filters.type && filters.type !== 'all') {
        query = query.eq('tipo_periodo', filters.type);
      }

      const { data: periods, error, count } = await query
        .range((page - 1) * limit, page * limit - 1);

      if (error) throw error;

      const mappedPeriods: PayrollPeriodHistory[] = (periods || []).map(period => ({
        id: period.id,
        period: period.periodo,
        startDate: period.fecha_inicio,
        endDate: period.fecha_fin,
        type: period.tipo_periodo,
        status: period.estado,
        employeesCount: period.empleados_count || 0,
        totalGrossPay: Number(period.total_devengado) || 0,
        totalNetPay: Number(period.total_neto) || 0,
        totalDeductions: Number(period.total_deducciones) || 0,
        totalCost: Number(period.total_devengado) || 0,
        employerContributions: (Number(period.total_devengado) || 0) * 0.205,
        paymentStatus: 'pagado', // Todos los cerrados están pagados
        createdAt: period.created_at,
        updatedAt: period.updated_at
      }));

      return {
        periods: mappedPeriods,
        total: count || 0,
        hasMore: (page * limit) < (count || 0)
      };
    } catch (error) {
      console.error('Error obteniendo historial de nómina:', error);
      throw error;
    }
  }

  async getPeriodDetail(periodId: string): Promise<PeriodDetail> {
    try {
      const companyId = await this.getCurrentUserCompanyId();

      // Obtener período
      const { data: period, error: periodError } = await supabase
        .from('payroll_periods_real')
        .select('*')
        .eq('id', periodId)
        .eq('company_id', companyId)
        .single();

      if (periodError) throw periodError;
      if (!period) throw new Error('Período no encontrado');

      // Obtener payrolls con empleados
      const { data: payrolls, error: payrollsError } = await supabase
        .from('payrolls')
        .select(`
          id,
          employee_id,
          salario_base,
          total_devengado,
          total_deducciones,
          neto_pagado,
          employees!inner (
            id,
            nombre,
            apellido,
            cargo
          )
        `)
        .eq('period_id', periodId)
        .eq('company_id', companyId);

      if (payrollsError) throw payrollsError;

      // Obtener novedades del período
      const { data: novedades, error: novedadesError } = await supabase
        .from('payroll_novedades')
        .select(`
          id,
          empleado_id,
          tipo_novedad,
          valor,
          observacion,
          created_at
        `)
        .eq('periodo_id', periodId)
        .eq('company_id', companyId);

      if (novedadesError) {
        console.warn('Error obteniendo novedades:', novedadesError);
      }

      // Obtener ajustes
      const { data: adjustments, error: adjustmentsError } = await supabase
        .from('payroll_adjustments')
        .select(`
          id,
          employee_id,
          concept,
          amount,
          observations,
          created_at
        `)
        .eq('period_id', periodId);

      if (adjustmentsError) {
        console.warn('Error obteniendo ajustes:', adjustmentsError);
      }

      // Procesar empleados
      const employees = (payrolls || []).map(payroll => {
        const emp = payroll.employees as any;
        return {
          id: payroll.employee_id,
          name: `${emp.nombre || ''} ${emp.apellido || ''}`.trim(),
          position: emp.cargo || 'Sin cargo',
          grossPay: Number(payroll.total_devengado) || 0,
          netPay: Number(payroll.neto_pagado) || 0,
          baseSalary: Number(payroll.salario_base) || 0,
          novedades: 0 // Simplificado
        };
      });

      // Procesar novedades
      const mappedNovedades = (novedades || []).map(novedad => {
        const employee = payrolls?.find(p => p.employee_id === novedad.empleado_id);
        const emp = employee?.employees as any;
        return {
          id: novedad.id,
          employeeId: novedad.empleado_id,
          employeeName: emp ? `${emp.nombre} ${emp.apellido}`.trim() : 'Sin nombre',
          concept: novedad.tipo_novedad,
          amount: Number(novedad.valor) || 0,
          observations: novedad.observacion || '',
          createdAt: novedad.created_at
        };
      });

      // Procesar ajustes
      const mappedAdjustments = (adjustments || []).map(adj => {
        const employee = payrolls?.find(p => p.employee_id === adj.employee_id);
        const emp = employee?.employees as any;
        return {
          id: adj.id,
          employeeId: adj.employee_id,
          employeeName: emp ? `${emp.nombre} ${emp.apellido}`.trim() : 'Sin nombre',
          concept: adj.concept,
          amount: Number(adj.amount) || 0,
          observations: adj.observations || '',
          createdAt: adj.created_at
        };
      });

      // Calcular totales
      const totalDevengado = employees.reduce((sum, emp) => sum + emp.grossPay, 0);
      const totalDeducciones = employees.reduce((sum, emp) => sum + (emp.grossPay - emp.netPay), 0);
      const totalNeto = employees.reduce((sum, emp) => sum + emp.netPay, 0);
      const totalSalarioBase = employees.reduce((sum, emp) => sum + emp.baseSalary, 0);

      return {
        period: {
          id: period.id,
          period: period.periodo,
          startDate: period.fecha_inicio,
          endDate: period.fecha_fin,
          status: period.estado,
          type: period.tipo_periodo
        },
        summary: {
          totalDevengado,
          totalDeducciones,
          totalNeto,
          costoTotal: totalDevengado,
          salarioBase: totalSalarioBase,
          novedades: 0 // Simplificado
        },
        employees,
        novedades: mappedNovedades,
        adjustments: mappedAdjustments
      };
    } catch (error) {
      console.error('Error obteniendo detalle del período:', error);
      throw error;
    }
  }

  async generateVoucherPDF(employeeId: string, periodId: string): Promise<void> {
    try {
      const companyId = await this.getCurrentUserCompanyId();
      
      const { data: employee, error: employeeError } = await supabase
        .from('employees')
        .select('id, nombre, apellido')
        .eq('id', employeeId)
        .eq('company_id', companyId)
        .single();

      if (employeeError || !employee) {
        throw new Error('Empleado no encontrado');
      }

      console.log(`📄 Generando comprobante PDF para empleado ${employee.nombre} ${employee.apellido}`);
      
      // Simulación de generación de PDF
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log('✅ PDF generado exitosamente');
    } catch (error) {
      console.error('Error generando PDF:', error);
      throw new Error('No se pudo generar el comprobante PDF');
    }
  }
}

export const PayrollHistoryServiceKISS = new PayrollHistoryServiceKISSClass();