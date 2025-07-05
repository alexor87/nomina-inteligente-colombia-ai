import { supabase } from '@/integrations/supabase/client';
import { PayrollHistoryPeriod, PayrollHistoryEmployee, PayrollHistoryDetails } from '@/types/payroll-history';
import { formatCurrency } from '@/lib/utils';

export class PayrollHistoryService {
  static async getHistoryPeriods(): Promise<PayrollHistoryPeriod[]> {
    try {
      console.log('📊 Cargando períodos históricos...');
      
      const companyId = await this.getCurrentUserCompanyId();
      if (!companyId) {
        throw new Error('No se pudo obtener la empresa del usuario');
      }

      const { data: periods, error } = await supabase
        .from('payroll_periods_real')
        .select('*')
        .eq('company_id', companyId)
        .eq('estado', 'cerrado')
        .order('fecha_inicio', { ascending: false });

      if (error) {
        console.error('❌ Error cargando períodos:', error);
        throw error;
      }

      console.log(`📊 Períodos encontrados: ${periods?.length || 0}`);
      console.log('📊 Estados de períodos:', periods?.map(p => ({ periodo: p.periodo, estado: p.estado })));

      return (periods || []).map(period => {
        const historyPeriod: PayrollHistoryPeriod = {
          id: period.id,
          period: period.periodo,
          startDate: period.fecha_inicio,
          endDate: period.fecha_fin,
          type: period.tipo_periodo as 'semanal' | 'quincenal' | 'mensual' | 'personalizado',
          employeesCount: period.empleados_count || 0,
          status: this.mapDBStatusToUIStatus(period.estado),
          totalGrossPay: Number(period.total_devengado) || 0,
          totalNetPay: Number(period.total_neto) || 0,
          totalDeductions: Number(period.total_deducciones) || 0,
          totalCost: Number(period.total_devengado) || 0,
          employerContributions: 0,
          paymentStatus: 'pendiente',
          version: 1,
          createdAt: period.created_at,
          updatedAt: period.updated_at,
          editable: false
        };

        console.log(`📄 Procesando período "${period.periodo}" con estado "${period.estado}"`);
        console.log(`📊 Estado: DB="${period.estado}" → UI="${historyPeriod.status}"`);

        return historyPeriod;
      });
    } catch (error) {
      console.error('💥 Error crítico cargando historial:', error);
      throw error;
    }
  }

  // ✅ NUEVO MÉTODO: Para compatibilidad con PayrollHistoryPage
  static async getPayrollPeriods(): Promise<PayrollHistoryPeriod[]> {
    return this.getHistoryPeriods();
  }

  // ✅ CORRECCIÓN CRÍTICA: Auto-sincronización mejorada
  static async getPeriodDetails(periodId: string): Promise<PayrollHistoryDetails | null> {
    try {
      console.log(`🔍 Obteniendo detalles del período: ${periodId}`);
      
      const companyId = await this.getCurrentUserCompanyId();
      if (!companyId) {
        throw new Error('No se pudo obtener la empresa del usuario');
      }

      // Obtener información del período
      const { data: period, error: periodError } = await supabase
        .from('payroll_periods_real')
        .select('*')
        .eq('id', periodId)
        .eq('company_id', companyId)
        .single();

      if (periodError || !period) {
        console.error('❌ Error obteniendo período:', periodError);
        return null;
      }

      console.log(`📅 Período encontrado: ${period.periodo} (${period.estado})`);

      // Obtener empleados del período
      const { data: payrolls, error: payrollsError } = await supabase
        .from('payrolls')
        .select(`
          *,
          employees!inner(
            id,
            nombre,
            apellido,
            cargo,
            salario_base
          )
        `)
        .eq('period_id', periodId)
        .eq('company_id', companyId);

      if (payrollsError) {
        console.error('❌ Error obteniendo nóminas:', payrollsError);
      }

      console.log(`👥 Empleados en nómina: ${payrolls?.length || 0}`);

      // ✅ AUTO-SINCRONIZACIÓN: Si no hay empleados, intentar sincronizar
      if (!payrolls || payrolls.length === 0) {
        console.log('🔄 No hay empleados - ejecutando auto-sincronización...');
        
        try {
          const syncResult = await this.autoSyncPeriodData(periodId, companyId);
          console.log('📊 Resultado de auto-sync:', syncResult);

          if (syncResult.success) {
            // Reintentar obtener empleados después de la sincronización
            const { data: syncedPayrolls, error: syncedError } = await supabase
              .from('payrolls')
              .select(`
                *,
                employees!inner(
                  id,
                  nombre,
                  apellido,
                  cargo,
                  salario_base
                )
              `)
              .eq('period_id', periodId)
              .eq('company_id', companyId);

            if (!syncedError && syncedPayrolls && syncedPayrolls.length > 0) {
              console.log(`✅ Auto-sync exitoso: ${syncedPayrolls.length} empleados sincronizados`);
              return this.buildPeriodDetails(period, syncedPayrolls);
            }
          }
        } catch (syncError) {
          console.error('❌ Error en auto-sincronización:', syncError);
        }
      }

      return this.buildPeriodDetails(period, payrolls || []);

    } catch (error) {
      console.error('💥 Error crítico obteniendo detalles:', error);
      return null;
    }
  }

  // ✅ NUEVA FUNCIÓN: Auto-sincronización de datos históricos
  private static async autoSyncPeriodData(periodId: string, companyId: string): Promise<{success: boolean, message: string}> {
    try {
      console.log(`🔄 Iniciando auto-sincronización para período: ${periodId}`);

      // Llamar a la función de base de datos para sincronizar
      const { data, error } = await supabase.rpc('sync_historical_payroll_data', {
        p_period_id: periodId,
        p_company_id: companyId
      });

      if (error) {
        console.error('❌ Error en sync_historical_payroll_data:', error);
        return { success: false, message: error.message };
      }

      console.log('✅ Auto-sync completado:', data);
      
      // ✅ CORRECCIÓN: Manejo seguro de la respuesta
      const result = data as any;
      return { 
        success: true, 
        message: result?.message || 'Sincronización completada' 
      };

    } catch (error) {
      console.error('❌ Error en auto-sincronización:', error);
      return { success: false, message: `Error: ${error}` };
    }
  }

  private static buildPeriodDetails(period: any, payrolls: any[]): PayrollHistoryDetails {
    const employees: PayrollHistoryEmployee[] = payrolls.map(payroll => ({
      id: payroll.employees.id,
      periodId: period.id,
      payrollId: payroll.id,
      name: `${payroll.employees.nombre} ${payroll.employees.apellido}`,
      position: payroll.employees.cargo || 'Sin cargo',
      grossPay: Number(payroll.total_devengado) || 0,
      deductions: Number(payroll.total_deducciones) || 0,
      netPay: Number(payroll.neto_pagado) || 0,
      baseSalary: Number(payroll.employees.salario_base) || 0,
      paymentStatus: 'pendiente'
    }));

    const summary = {
      totalDevengado: employees.reduce((sum, emp) => sum + emp.grossPay, 0),
      totalDeducciones: employees.reduce((sum, emp) => sum + emp.deductions, 0),
      totalNeto: employees.reduce((sum, emp) => sum + emp.netPay, 0),
      costoTotal: employees.reduce((sum, emp) => sum + emp.grossPay, 0),
      aportesEmpleador: 0
    };

    const historyPeriod: PayrollHistoryPeriod = {
      id: period.id,
      period: period.periodo,
      startDate: period.fecha_inicio,
      endDate: period.fecha_fin,
      type: period.tipo_periodo as 'semanal' | 'quincenal' | 'mensual' | 'personalizado',
      employeesCount: employees.length,
      status: this.mapDBStatusToUIStatus(period.estado),
      totalGrossPay: summary.totalDevengado,
      totalNetPay: summary.totalNeto,
      totalDeductions: summary.totalDeducciones,
      totalCost: summary.costoTotal,
      employerContributions: summary.aportesEmpleador,
      paymentStatus: 'pendiente',
      version: 1,
      createdAt: period.created_at,
      updatedAt: period.updated_at,
      editable: false
    };

    return {
      period: historyPeriod,
      summary,
      employees,
      files: {
        desprendibles: [],
        certificates: [],
        reports: []
      }
    };
  }

  private static mapDBStatusToUIStatus(dbStatus: string): 'borrador' | 'cerrado' | 'con_errores' | 'editado' | 'reabierto' {
    switch (dbStatus) {
      case 'borrador':
        return 'borrador';
      case 'cerrado':
      case 'procesada':
        return 'cerrado';
      case 'en_proceso':
        return 'con_errores';
      case 'aprobado':
        return 'cerrado';
      default:
        return 'cerrado';
    }
  }

  static async getCurrentUserCompanyId(): Promise<string | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (error || !profile?.company_id) return null;
      return profile.company_id;
    } catch (error) {
      console.error('Error getting company ID:', error);
      return null;
    }
  }

  // ✅ NUEVA FUNCIÓN: Forzar regeneración de datos históricos
  static async forceRegenerateHistoricalData(periodId: string): Promise<{success: boolean, message: string}> {
    try {
      const companyId = await this.getCurrentUserCompanyId();
      if (!companyId) {
        return { success: false, message: 'No se pudo obtener la empresa' };
      }

      console.log(`🔄 Forzando regeneración de datos para período: ${periodId}`);

      const result = await this.autoSyncPeriodData(periodId, companyId);
      return result;

    } catch (error) {
      console.error('❌ Error forzando regeneración:', error);
      return { success: false, message: `Error: ${error}` };
    }
  }

  // ✅ NUEVO MÉTODO: Recalcular totales de empleado con novedades
  static async recalculateEmployeeTotalsWithNovedades(employeeId: string, periodId: string): Promise<void> {
    try {
      console.log(`🔄 Recalculando totales para empleado: ${employeeId} en período: ${periodId}`);
      
      // Obtener datos del empleado y período
      const { data: payroll, error: payrollError } = await supabase
        .from('payrolls')
        .select('*')
        .eq('employee_id', employeeId)
        .eq('period_id', periodId)
        .single();

      if (payrollError || !payroll) {
        console.error('❌ Error obteniendo nómina:', payrollError);
        return;
      }

      // Obtener novedades del empleado
      const { data: novedades, error: novedadesError } = await supabase
        .from('payroll_novedades')
        .select('*')
        .eq('empleado_id', employeeId)
        .eq('periodo_id', periodId);

      if (novedadesError) {
        console.error('❌ Error obteniendo novedades:', novedadesError);
      }

      // Calcular totales con novedades
      let totalDevengosNovedades = 0;
      let totalDeduccionesNovedades = 0;

      (novedades || []).forEach(novedad => {
        const valor = Number(novedad.valor) || 0;
        
        // Clasificar como devengo o deducción
        const tiposDevengos = ['horas_extra', 'recargo_nocturno', 'bonificacion', 'comision', 'prima', 'otros_ingresos'];
        if (tiposDevengos.includes(novedad.tipo_novedad)) {
          totalDevengosNovedades += valor;
        } else {
          totalDeduccionesNovedades += valor;
        }
      });

      // Calcular nuevos totales
      const salarioBase = Number(payroll.salario_base) || 0;
      const auxilioTransporte = Number(payroll.auxilio_transporte) || 0;
      const deduccionesBase = Number(payroll.salud_empleado) + Number(payroll.pension_empleado);

      const nuevoTotalDevengado = salarioBase + auxilioTransporte + totalDevengosNovedades;
      const nuevoTotalDeducciones = deduccionesBase + totalDeduccionesNovedades;
      const nuevoNetoAPagar = nuevoTotalDevengado - nuevoTotalDeducciones;

      // Actualizar registro de nómina
      const { error: updateError } = await supabase
        .from('payrolls')
        .update({
          total_devengado: nuevoTotalDevengado,
          total_deducciones: nuevoTotalDeducciones,
          neto_pagado: nuevoNetoAPagar,
          updated_at: new Date().toISOString()
        })
        .eq('id', payroll.id);

      if (updateError) {
        console.error('❌ Error actualizando totales:', updateError);
        throw updateError;
      }

      console.log(`✅ Totales recalculados para empleado ${employeeId}`);

    } catch (error) {
      console.error('❌ Error recalculando totales:', error);
      throw error;
    }
  }

  // ✅ NUEVO MÉTODO: Actualizar valores de empleado
  static async updateEmployeeValues(employeeId: string, periodId: string, values: any): Promise<void> {
    try {
      console.log(`📝 Actualizando valores para empleado: ${employeeId}`);
      
      const { error } = await supabase
        .from('payrolls')
        .update({
          ...values,
          updated_at: new Date().toISOString()
        })
        .eq('employee_id', employeeId)
        .eq('period_id', periodId);

      if (error) {
        console.error('❌ Error actualizando valores:', error);
        throw error;
      }

      console.log(`✅ Valores actualizados para empleado ${employeeId}`);
    } catch (error) {
      console.error('❌ Error en updateEmployeeValues:', error);
      throw error;
    }
  }

  // ✅ NUEVO MÉTODO: Recalcular totales del período
  static async recalculatePeriodTotals(periodId: string): Promise<void> {
    try {
      console.log(`🔄 Recalculando totales del período: ${periodId}`);
      
      const { data: payrolls, error } = await supabase
        .from('payrolls')
        .select('total_devengado, total_deducciones, neto_pagado')
        .eq('period_id', periodId);

      if (error) {
        console.error('❌ Error obteniendo nóminas:', error);
        throw error;
      }

      const totales = (payrolls || []).reduce(
        (acc, payroll) => ({
          totalDevengado: acc.totalDevengado + Number(payroll.total_devengado || 0),
          totalDeducciones: acc.totalDeducciones + Number(payroll.total_deducciones || 0),
          totalNeto: acc.totalNeto + Number(payroll.neto_pagado || 0)
        }),
        { totalDevengado: 0, totalDeducciones: 0, totalNeto: 0 }
      );

      const { error: updateError } = await supabase
        .from('payroll_periods_real')
        .update({
          total_devengado: totales.totalDevengado,
          total_deducciones: totales.totalDeducciones,
          total_neto: totales.totalNeto,
          empleados_count: payrolls?.length || 0,
          updated_at: new Date().toISOString()
        })
        .eq('id', periodId);

      if (updateError) {
        console.error('❌ Error actualizando totales del período:', updateError);
        throw updateError;
      }

      console.log(`✅ Totales del período recalculados: ${periodId}`);
    } catch (error) {
      console.error('❌ Error en recalculatePeriodTotals:', error);
      throw error;
    }
  }
}
