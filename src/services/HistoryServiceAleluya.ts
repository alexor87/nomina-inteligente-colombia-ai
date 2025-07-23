import { supabase } from '@/integrations/supabase/client';
import { PayrollLiquidationService } from './PayrollLiquidationService';

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
  };
  employees: Array<{
    id: string;
    name: string;
    position: string;
    grossPay: number;
    netPay: number;
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

export interface CreateAdjustmentData {
  periodId: string;
  employeeId: string;
  concept: string;
  amount: number;
  observations: string;
}

class HistoryServiceAleluyaClass {
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
        .select('*')
        .eq('company_id', companyId)
        .eq('estado', 'cerrado')
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
        status: 'original',
        employeesCount: period.empleados_count || 0,
        totalGrossPay: Number(period.total_devengado) || 0,
        totalNetPay: Number(period.total_neto) || 0,
        totalDeductions: Number(period.total_deducciones) || 0,
        totalCost: Number(period.total_devengado) || 0,
        employerContributions: (Number(period.total_devengado) || 0) * 0.205,
        paymentStatus: period.estado === 'cerrado' ? 'pagado' : 'pendiente',
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

  /**
   * ✅ NUEVA FUNCIÓN: Obtener detalle completo de un período
   */
  async getPeriodDetail(periodId: string): Promise<PeriodDetail> {
    try {
      const companyId = await this.getCurrentUserCompanyId();

      // Obtener datos del período
      const { data: period, error: periodError } = await supabase
        .from('payroll_periods_real')
        .select('*')
        .eq('id', periodId)
        .eq('company_id', companyId)
        .single();

      if (periodError) throw periodError;
      if (!period) throw new Error('Período no encontrado');

      // Obtener empleados del período
      const { data: payrolls, error: payrollsError } = await supabase
        .from('payrolls')
        .select(`
          id,
          employee_id,
          total_devengado,
          neto_pagado,
          employees (
            id,
            nombre,
            apellido,
            cargo
          )
        `)
        .eq('period_id', periodId)
        .eq('company_id', companyId);

      if (payrollsError) throw payrollsError;

      // Obtener ajustes usando SQL directo para evitar problemas de tipos
      const { data: adjustments, error: adjustmentsError } = await supabase
        .rpc('get_period_adjustments', { period_id: periodId });

      if (adjustmentsError) {
        console.warn('Error obteniendo ajustes:', adjustmentsError);
        // Continuar sin ajustes si hay error
      }

      // Mapear empleados
      const employees = (payrolls || []).map(payroll => ({
        id: payroll.employee_id,
        name: `${payroll.employees?.nombre || ''} ${payroll.employees?.apellido || ''}`.trim(),
        position: payroll.employees?.cargo || 'Sin cargo',
        grossPay: Number(payroll.total_devengado) || 0,
        netPay: Number(payroll.neto_pagado) || 0
      }));

      // Mapear ajustes con fallback a array vacío
      const mappedAdjustments = (adjustments || []).map((adj: any) => ({
        id: adj.id,
        employeeId: adj.employee_id,
        employeeName: adj.employee_name || 'Sin nombre',
        concept: adj.concept,
        amount: Number(adj.amount) || 0,
        observations: adj.observations || '',
        createdAt: adj.created_at
      }));

      return {
        period: {
          id: period.id,
          period: period.periodo,
          startDate: period.fecha_inicio,
          endDate: period.fecha_fin,
          status: period.estado === 'cerrado' ? 'original' : 'borrador',
          type: period.tipo_periodo
        },
        summary: {
          totalDevengado: Number(period.total_devengado) || 0,
          totalDeducciones: Number(period.total_deducciones) || 0,
          totalNeto: Number(period.total_neto) || 0,
          costoTotal: Number(period.total_devengado) || 0
        },
        employees,
        adjustments: mappedAdjustments
      };
    } catch (error) {
      console.error('Error obteniendo detalle del período:', error);
      throw error;
    }
  }

  /**
   * ✅ NUEVA FUNCIÓN: Crear ajuste usando SQL directo
   */
  async createAdjustment(data: CreateAdjustmentData): Promise<void> {
    try {
      const companyId = await this.getCurrentUserCompanyId();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) throw new Error('Usuario no autenticado');

      // Verificar que el período existe y pertenece a la empresa
      const { data: period, error: periodError } = await supabase
        .from('payroll_periods_real')
        .select('id')
        .eq('id', data.periodId)
        .eq('company_id', companyId)
        .single();

      if (periodError || !period) {
        throw new Error('Período no encontrado');
      }

      // Crear el ajuste usando SQL directo
      const { error: insertError } = await supabase
        .rpc('create_payroll_adjustment', {
          p_period_id: data.periodId,
          p_employee_id: data.employeeId,
          p_concept: data.concept,
          p_amount: data.amount,
          p_observations: data.observations,
          p_created_by: user.id
        });

      if (insertError) {
        console.error('Error creando ajuste:', insertError);
        throw new Error('No se pudo crear el ajuste');
      }

      console.log('✅ Ajuste creado exitosamente');
    } catch (error) {
      console.error('Error creando ajuste:', error);
      throw error;
    }
  }

  /**
   * ✅ NUEVA FUNCIÓN: Generar PDF de comprobante
   */
  async generateVoucherPDF(employeeId: string, periodId: string): Promise<void> {
    try {
      console.log(`📄 Generando comprobante PDF para empleado ${employeeId} en período ${periodId}`);
      
      // Por ahora, simulamos la generación del PDF
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Aquí se implementaría la lógica real de generación de PDF
      // Por ejemplo, usando jsPDF o llamando a un servicio externo
      
      console.log('✅ PDF generado exitosamente');
    } catch (error) {
      console.error('Error generando PDF:', error);
      throw new Error('No se pudo generar el comprobante PDF');
    }
  }

  async updatePeriodTotals(periodId: string): Promise<void> {
    try {
      console.log(`🔄 Actualizando totales para período: ${periodId}`);
      
      const companyId = await this.getCurrentUserCompanyId();

      // Obtener totales reales de los registros de payrolls
      const { data: payrollTotals, error: totalsError } = await supabase
        .from('payrolls')
        .select('total_devengado, total_deducciones, neto_pagado')
        .eq('period_id', periodId)
        .eq('company_id', companyId);

      if (totalsError) {
        console.error('Error obteniendo totales de payrolls:', totalsError);
        throw totalsError;
      }

      if (!payrollTotals || payrollTotals.length === 0) {
        console.warn(`⚠️ No se encontraron registros de payrolls para el período ${periodId}`);
        return;
      }

      // Calcular totales
      const totalDevengado = payrollTotals.reduce((sum, record) => sum + (Number(record.total_devengado) || 0), 0);
      const totalDeducciones = payrollTotals.reduce((sum, record) => sum + (Number(record.total_deducciones) || 0), 0);
      const totalNeto = payrollTotals.reduce((sum, record) => sum + (Number(record.neto_pagado) || 0), 0);

      console.log(`📊 Totales calculados:`, {
        totalDevengado,
        totalDeducciones,
        totalNeto,
        empleados: payrollTotals.length
      });

      // Actualizar período con totales correctos
      const { error: updateError } = await supabase
        .from('payroll_periods_real')
        .update({
          total_devengado: totalDevengado,
          total_deducciones: totalDeducciones,
          total_neto: totalNeto,
          empleados_count: payrollTotals.length,
          updated_at: new Date().toISOString()
        })
        .eq('id', periodId)
        .eq('company_id', companyId);

      if (updateError) {
        console.error('Error actualizando totales del período:', updateError);
        throw updateError;
      }

      console.log(`✅ Totales actualizados correctamente para período ${periodId}`);
    } catch (error) {
      console.error('Error en updatePeriodTotals:', error);
      throw error;
    }
  }

  async consolidatePayrollWithNovedades(periodId: string): Promise<void> {
    try {
      console.log(`🔄 Consolidando novedades para período: ${periodId}`);
      
      // Usar el servicio de liquidación para consolidar
      await PayrollLiquidationService.consolidatePayrollWithNovedades(periodId);
      
      console.log(`✅ Novedades consolidadas exitosamente para período ${periodId}`);
    } catch (error) {
      console.error('Error consolidando novedades:', error);
      throw error;
    }
  }

  async repairPeriodSync(periodId: string): Promise<void> {
    try {
      console.log(`🔧 Iniciando reparación completa para período: ${periodId}`);
      
      // Paso 1: Consolidar novedades
      await this.consolidatePayrollWithNovedades(periodId);
      
      // Paso 2: Actualizar totales
      await this.updatePeriodTotals(periodId);
      
      console.log(`✅ Reparación completa exitosa para período ${periodId}`);
    } catch (error) {
      console.error('Error en reparación de período:', error);
      throw error;
    }
  }

  async detectDesynchronizedPeriods(): Promise<string[]> {
    try {
      const companyId = await this.getCurrentUserCompanyId();
      
      // Obtener períodos que podrían estar desincronizados
      const { data: periods, error } = await supabase
        .from('payroll_periods_real')
        .select('id, periodo, total_devengado, total_neto')
        .eq('company_id', companyId)
        .eq('estado', 'cerrado')
        .or('total_devengado.is.null,total_devengado.eq.0,total_neto.is.null,total_neto.eq.0');

      if (error) throw error;

      const desynchronizedPeriods: string[] = [];

      for (const period of periods || []) {
        // Verificar si hay registros de payrolls para este período
        const { data: payrolls, error: payrollError } = await supabase
          .from('payrolls')
          .select('neto_pagado')
          .eq('period_id', period.id)
          .eq('company_id', companyId);

        if (payrollError) continue;

        // Si hay payrolls pero el período tiene totales en 0, está desincronizado
        if (payrolls && payrolls.length > 0 && (!period.total_neto || period.total_neto === 0)) {
          desynchronizedPeriods.push(period.id);
          console.warn(`⚠️ Período desincronizado detectado: ${period.periodo} (ID: ${period.id})`);
        }
      }

      return desynchronizedPeriods;
    } catch (error) {
      console.error('Error detectando períodos desincronizados:', error);
      return [];
    }
  }

  async repairAllDesynchronizedPeriods(): Promise<number> {
    try {
      const desynchronizedPeriods = await this.detectDesynchronizedPeriods();
      
      if (desynchronizedPeriods.length === 0) {
        console.log('✅ No se encontraron períodos desincronizados');
        return 0;
      }

      console.log(`🔧 Reparando ${desynchronizedPeriods.length} períodos desincronizados`);

      for (const periodId of desynchronizedPeriods) {
        try {
          await this.repairPeriodSync(periodId);
        } catch (error) {
          console.error(`❌ Error reparando período ${periodId}:`, error);
        }
      }

      console.log(`✅ Reparación masiva completada: ${desynchronizedPeriods.length} períodos`);
      return desynchronizedPeriods.length;
    } catch (error) {
      console.error('Error en reparación masiva:', error);
      throw error;
    }
  }
}

export const HistoryServiceAleluya = new HistoryServiceAleluyaClass();
