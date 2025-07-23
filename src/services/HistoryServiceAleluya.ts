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

      // Formatear períodos (sin verificar ajustes por ahora)
      const formattedPeriods = (periods || []).map(period => ({
        id: period.id,
        period: period.periodo,
        startDate: period.fecha_inicio,
        endDate: period.fecha_fin,
        type: period.tipo_periodo as 'mensual' | 'quincenal' | 'semanal',
        employeesCount: period.empleados_count || 0,
        totalNetPay: period.total_neto || 0,
        status: 'original' as const, // Simplificado por ahora
        createdAt: period.created_at,
        updatedAt: period.updated_at
      }));

      return {
        periods: formattedPeriods,
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

      const periodHistory: PayrollPeriodHistory = {
        id: period.id,
        period: period.periodo,
        startDate: period.fecha_inicio,
        endDate: period.fecha_fin,
        type: period.tipo_periodo as 'mensual' | 'quincenal' | 'semanal',
        employeesCount: period.empleados_count || 0,
        totalNetPay: period.total_neto || 0,
        status: 'original' as const, // Simplificado por ahora
        createdAt: period.created_at,
        updatedAt: period.updated_at
      };

      return {
        period: periodHistory,
        employees,
        adjustments: [], // Simplificado por ahora
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
   * Obtener datos completos del empleado para generar comprobante
   */
  static async getEmployeePayrollData(employeeId: string, periodId: string) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (!profile?.company_id) throw new Error('Empresa no encontrada');

      // Obtener datos del empleado y su liquidación
      const { data: payroll, error: payrollError } = await supabase
        .from('payrolls')
        .select(`
          *,
          employees:employee_id (
            id,
            nombre,
            apellido,
            cedula,
            cargo,
            salario_base
          )
        `)
        .eq('employee_id', employeeId)
        .eq('period_id', periodId)
        .single();

      if (payrollError) throw payrollError;
      if (!payroll) throw new Error('Liquidación no encontrada');

      // Obtener datos del período
      const { data: period, error: periodError } = await supabase
        .from('payroll_periods_real')
        .select('*')
        .eq('id', periodId)
        .eq('company_id', profile.company_id)
        .single();

      if (periodError) throw periodError;
      if (!period) throw new Error('Período no encontrado');

      // Obtener datos de la empresa
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .select('*')
        .eq('id', profile.company_id)
        .single();

      if (companyError) throw companyError;

      // Obtener novedades del empleado en el período
      const { data: novedades } = await supabase
        .from('payroll_novedades')
        .select('*')
        .eq('empleado_id', employeeId)
        .eq('periodo_id', periodId);

      return {
        payroll,
        employee: payroll.employees,
        period,
        company,
        novedades: novedades || []
      };
    } catch (error) {
      console.error('Error fetching employee payroll data:', error);
      throw error;
    }
  }

  /**
   * Generar comprobante PDF para un empleado usando la Edge Function
   */
  static async generateVoucherPDF(employeeId: string, periodId: string): Promise<void> {
    try {
      console.log('🔄 Generando comprobante PDF para empleado:', employeeId);
      
      // Obtener datos completos del empleado y período
      const payrollData = await this.getEmployeePayrollData(employeeId, periodId);
      
      // Preparar datos para la Edge Function
      const employeeData = {
        id: payrollData.employee.id,
        name: `${payrollData.employee.nombre} ${payrollData.employee.apellido}`.trim(),
        cedula: payrollData.employee.cedula,
        position: payrollData.employee.cargo,
        baseSalary: payrollData.employee.salario_base,
        workedDays: payrollData.payroll.dias_trabajados || 30,
        grossPay: payrollData.payroll.total_devengado || 0,
        deductions: payrollData.payroll.total_deducciones || 0,
        netPay: payrollData.payroll.neto_pagado || 0,
        extraHours: 0, // Calcular desde novedades si existe
        bonuses: 0, // Calcular desde novedades si existe
        transportAllowance: 0 // Calcular desde novedades si existe
      };

      // Procesar novedades si existen
      if (payrollData.novedades && payrollData.novedades.length > 0) {
        payrollData.novedades.forEach(novedad => {
          if (novedad.tipo_novedad === 'horas_extra') {
            employeeData.extraHours += novedad.horas || 0;
          } else if (novedad.tipo_novedad === 'bonificacion') {
            employeeData.bonuses += novedad.valor || 0;
          } else if (novedad.tipo_novedad === 'auxilio_transporte') {
            employeeData.transportAllowance += novedad.valor || 0;
          }
        });
      }

      const periodData = {
        startDate: payrollData.period.fecha_inicio,
        endDate: payrollData.period.fecha_fin,
        type: payrollData.period.tipo_periodo
      };

      const companyData = {
        razon_social: payrollData.company.razon_social,
        nit: payrollData.company.nit,
        direccion: payrollData.company.direccion,
        ciudad: payrollData.company.ciudad,
        telefono: payrollData.company.telefono,
        email: payrollData.company.email
      };

      console.log('📤 Enviando datos a Edge Function...');
      
      // Llamar a la Edge Function
      const { data, error } = await supabase.functions.invoke('generate-voucher-pdf', {
        body: {
          employee: employeeData,
          period: periodData,
          company: companyData
        }
      });

      if (error) {
        console.error('❌ Error en Edge Function:', error);
        throw new Error(`Error generando PDF: ${error.message}`);
      }

      console.log('✅ PDF generado exitosamente');

      // Crear blob desde los datos binarios
      const pdfBlob = new Blob([data], { type: 'application/pdf' });
      
      // Crear URL para descarga
      const pdfUrl = URL.createObjectURL(pdfBlob);
      
      // Crear elemento de descarga
      const link = document.createElement('a');
      link.href = pdfUrl;
      link.download = `comprobante-${employeeData.name.replace(/\s+/g, '-')}-${payrollData.period.periodo}.pdf`;
      
      // Triggerar descarga
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Limpiar URL
      URL.revokeObjectURL(pdfUrl);
      
      console.log('📥 Descarga iniciada');

      // Opcional: Registrar auditoría
      await this.logVoucherDownload(employeeId, periodId, payrollData.company.id);
      
    } catch (error) {
      console.error('❌ Error generando comprobante:', error);
      throw error;
    }
  }

  /**
   * Registrar descarga de comprobante en auditoría
   */
  static async logVoucherDownload(employeeId: string, periodId: string, companyId: string) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('voucher_audit_log')
        .insert({
          company_id: companyId,
          voucher_id: `${periodId}-${employeeId}`, // ID temporal
          user_id: user.id,
          action: 'download',
          success: true,
          method: 'pdf_generation'
        });
    } catch (error) {
      console.error('Error logging voucher download:', error);
      // No lanzar error ya que es solo logging
    }
  }

  /**
   * Crear un ajuste para un período (simplificado por ahora)
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

      // Por ahora retornar un mock - implementar cuando se arregle la tabla
      return {
        id: 'mock-adjustment-id',
        employeeId: data.employeeId,
        employeeName: 'Empleado Mock',
        concept: data.concept,
        amount: data.amount,
        observations: data.observations || '',
        createdBy: 'Usuario Mock',
        createdAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error creating adjustment:', error);
      throw error;
    }
  }
}
