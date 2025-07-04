
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
          employerContributions: 0, // Se puede calcular después si es necesario
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
      return { success: true, message: data?.message || 'Sincronización completada' };

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
}
