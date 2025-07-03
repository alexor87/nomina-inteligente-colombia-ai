
import { supabase } from '@/integrations/supabase/client';
import { PayrollHistoryPeriod, PayrollHistoryDetails, PayrollHistoryEmployee } from '@/types/payroll-history';

export class PayrollHistoryService {
  static async getPayrollPeriods(): Promise<PayrollHistoryPeriod[]> {
    try {
      console.log('🔍 Cargando historial de nómina...');
      
      const companyId = await this.getCurrentUserCompanyId();
      if (!companyId) {
        console.log('⚠️ No se encontró company_id para el usuario actual');
        return [];
      }

      console.log('🏢 Company ID del usuario:', companyId);

      // Consultar períodos reales únicamente con filtro estricto por empresa
      const { data: periods, error } = await supabase
        .from('payroll_periods_real')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error cargando períodos:', error);
        throw error;
      }

      if (!periods || periods.length === 0) {
        console.log('✅ Empresa nueva - No existen períodos de nómina');
        return [];
      }

      console.log(`📊 Períodos encontrados para empresa ${companyId}:`, periods.length);

      // Validar que todos los períodos pertenecen a la empresa correcta
      const invalidPeriods = periods.filter(p => p.company_id !== companyId);
      if (invalidPeriods.length > 0) {
        console.error('🚨 DATOS CORRUPTOS: Períodos con company_id incorrecto:', invalidPeriods);
        // Filtrar solo los períodos válidos
        const validPeriods = periods.filter(p => p.company_id === companyId);
        console.log('✅ Filtrando a períodos válidos:', validPeriods.length);
      }

      // Mapear a formato esperado solo los períodos válidos
      const mappedPeriods: PayrollHistoryPeriod[] = periods
        .filter(period => period.company_id === companyId) // Filtro adicional de seguridad
        .map(period => ({
          id: period.id,
          period: period.periodo,
          startDate: period.fecha_inicio,
          endDate: period.fecha_fin,
          type: period.tipo_periodo as any,
          employeesCount: period.empleados_count || 0,
          status: period.estado as any,
          totalGrossPay: Number(period.total_devengado) || 0,
          totalNetPay: Number(period.total_neto) || 0,
          totalDeductions: Number(period.total_deducciones) || 0,
          totalCost: Number(period.total_neto) || 0,
          employerContributions: 0,
          paymentStatus: 'pendiente' as any,
          version: 1,
          createdAt: period.created_at,
          updatedAt: period.updated_at || period.created_at,
          editable: period.estado === 'borrador'
        }));

      console.log(`✅ Períodos válidos mapeados: ${mappedPeriods.length}`);
      return mappedPeriods;

    } catch (error) {
      console.error('💥 Error en getPayrollPeriods:', error);
      return [];
    }
  }

  static async getPeriodDetails(periodId: string): Promise<PayrollHistoryDetails> {
    try {
      const companyId = await this.getCurrentUserCompanyId();
      if (!companyId) {
        throw new Error('No se encontró la empresa del usuario');
      }

      console.log('🔍 Buscando detalles del período:', periodId, 'para empresa:', companyId);

      // Obtener período con validación estricta de empresa
      const { data: period, error: periodError } = await supabase
        .from('payroll_periods_real')
        .select('*')
        .eq('id', periodId)
        .eq('company_id', companyId) // Filtro estricto por empresa
        .single();

      if (periodError) {
        console.error('❌ Error obteniendo período:', periodError);
        throw periodError;
      }

      if (!period) {
        throw new Error('Período no encontrado o no pertenece a su empresa');
      }

      // Validar que el período pertenece a la empresa correcta
      if (period.company_id !== companyId) {
        console.error('🚨 INTENTO DE ACCESO NO AUTORIZADO: Período no pertenece a empresa del usuario');
        throw new Error('No tiene permisos para acceder a este período');
      }

      // Obtener empleados del período con filtro estricto
      const { data: payrolls, error: payrollsError } = await supabase
        .from('payrolls')
        .select(`
          *,
          employees!inner(nombre, apellido, cargo)
        `)
        .eq('period_id', periodId)
        .eq('company_id', companyId); // Filtro adicional por empresa

      if (payrollsError) {
        console.error('❌ Error obteniendo empleados:', payrollsError);
        throw payrollsError;
      }

      const employees: PayrollHistoryEmployee[] = (payrolls || [])
        .filter(payroll => payroll.company_id === companyId) // Filtro adicional de seguridad
        .map(payroll => ({
          id: payroll.id,
          periodId: periodId,
          payrollId: payroll.id,
          name: `${payroll.employees.nombre} ${payroll.employees.apellido}`,
          position: payroll.employees.cargo || 'Sin cargo',
          grossPay: Number(payroll.total_devengado) || 0,
          deductions: Number(payroll.total_deducciones) || 0,
          netPay: Number(payroll.neto_pagado) || 0,
          baseSalary: Number(payroll.salario_base) || 0,
          paymentStatus: 'pendiente' as any
        }));

      console.log(`✅ Empleados válidos encontrados: ${employees.length}`);

      const summary = {
        totalDevengado: employees.reduce((sum, emp) => sum + emp.grossPay, 0),
        totalDeducciones: employees.reduce((sum, emp) => sum + emp.deductions, 0),
        totalNeto: employees.reduce((sum, emp) => sum + emp.netPay, 0),
        costoTotal: employees.reduce((sum, emp) => sum + emp.grossPay, 0),
        aportesEmpleador: 0
      };

      return {
        period: {
          id: period.id,
          period: period.periodo,
          startDate: period.fecha_inicio,
          endDate: period.fecha_fin,
          type: period.tipo_periodo as any,
          employeesCount: period.empleados_count || 0,
          status: period.estado as any,
          totalGrossPay: Number(period.total_devengado) || 0,
          totalNetPay: Number(period.total_neto) || 0,
          totalDeductions: Number(period.total_deducciones) || 0,
          totalCost: Number(period.total_neto) || 0,
          employerContributions: 0,
          paymentStatus: 'pendiente' as any,
          version: 1,
          createdAt: period.created_at,
          updatedAt: period.updated_at || period.created_at
        },
        summary,
        employees,
        files: {
          desprendibles: [],
          certificates: [],
          reports: []
        }
      };
    } catch (error) {
      console.error('Error getting period details:', error);
      throw error;
    }
  }

  static async syncHistoricalData(periodId: string): Promise<void> {
    try {
      const companyId = await this.getCurrentUserCompanyId();
      if (!companyId) {
        throw new Error('No se encontró la empresa del usuario');
      }

      // Llamar a la función de sincronización de Supabase
      const { error } = await supabase.rpc('sync_historical_payroll_data', {
        p_period_id: periodId,
        p_company_id: companyId
      });

      if (error) throw error;
    } catch (error) {
      console.error('Error syncing historical data:', error);
      throw error;
    }
  }

  static async updateEmployeeValues(periodId: string, employeeId: string, updates: Partial<PayrollHistoryEmployee>): Promise<void> {
    try {
      const companyId = await this.getCurrentUserCompanyId();
      if (!companyId) {
        throw new Error('No se encontró la empresa del usuario');
      }

      // Actualizar el payroll del empleado
      const { error } = await supabase
        .from('payrolls')
        .update({
          total_devengado: updates.grossPay,
          total_deducciones: updates.deductions,
          neto_pagado: updates.netPay,
          updated_at: new Date().toISOString()
        })
        .eq('id', employeeId)
        .eq('company_id', companyId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating employee values:', error);
      throw error;
    }
  }

  static async recalculatePeriodTotals(periodId: string): Promise<void> {
    try {
      const companyId = await this.getCurrentUserCompanyId();
      if (!companyId) {
        throw new Error('No se encontró la empresa del usuario');
      }

      // Recalcular totales del período basado en los payrolls
      const { data: payrolls, error: payrollsError } = await supabase
        .from('payrolls')
        .select('total_devengado, total_deducciones, neto_pagado')
        .eq('period_id', periodId)
        .eq('company_id', companyId);

      if (payrollsError) throw payrollsError;

      if (payrolls && payrolls.length > 0) {
        const totals = payrolls.reduce((acc, payroll) => ({
          totalDevengado: acc.totalDevengado + (Number(payroll.total_devengado) || 0),
          totalDeducciones: acc.totalDeducciones + (Number(payroll.total_deducciones) || 0),
          totalNeto: acc.totalNeto + (Number(payroll.neto_pagado) || 0)
        }), { totalDevengado: 0, totalDeducciones: 0, totalNeto: 0 });

        // Actualizar el período
        const { error: updateError } = await supabase
          .from('payroll_periods_real')
          .update({
            empleados_count: payrolls.length,
            total_devengado: totals.totalDevengado,
            total_deducciones: totals.totalDeducciones,
            total_neto: totals.totalNeto,
            updated_at: new Date().toISOString()
          })
          .eq('id', periodId)
          .eq('company_id', companyId);

        if (updateError) throw updateError;
      }
    } catch (error) {
      console.error('Error recalculating period totals:', error);
      throw error;
    }
  }

  static async recalculateEmployeeTotalsWithNovedades(employeeId: string, periodId: string): Promise<void> {
    try {
      const companyId = await this.getCurrentUserCompanyId();
      if (!companyId) {
        throw new Error('No se encontró la empresa del usuario');
      }

      // Obtener el payroll base del empleado
      const { data: payroll, error: payrollError } = await supabase
        .from('payrolls')
        .select('*')
        .eq('id', employeeId)
        .eq('company_id', companyId)
        .single();

      if (payrollError) throw payrollError;

      // Obtener novedades del empleado para este período
      const { data: novedades, error: novedadesError } = await supabase
        .from('payroll_novedades')
        .select('*')
        .eq('empleado_id', payroll.employee_id)
        .eq('periodo_id', periodId)
        .eq('company_id', companyId);

      if (novedadesError) throw novedadesError;

      // Calcular totales con novedades
      let totalDevengado = Number(payroll.salario_base) || 0;
      let totalDeducciones = 0;

      (novedades || []).forEach(novedad => {
        const valor = Number(novedad.valor) || 0;
        
        // Clasificar novedades como devengos o deducciones
        const esDevengo = ['horas_extra', 'recargo_nocturno', 'vacaciones', 'licencia_remunerada', 
                          'incapacidad', 'bonificacion', 'comision', 'prima', 'otros_ingresos'].includes(novedad.tipo_novedad);
        
        if (esDevengo) {
          totalDevengado += valor;
        } else {
          totalDeducciones += valor;
        }
      });

      const totalNeto = totalDevengado - totalDeducciones;

      // Actualizar el payroll
      const { error: updateError } = await supabase
        .from('payrolls')
        .update({
          total_devengado: totalDevengado,
          total_deducciones: totalDeducciones,
          neto_pagado: totalNeto,
          updated_at: new Date().toISOString()
        })
        .eq('id', employeeId)
        .eq('company_id', companyId);

      if (updateError) throw updateError;
    } catch (error) {
      console.error('Error recalculating employee totals with novedades:', error);
      throw error;
    }
  }

  static async getCurrentUserCompanyId(): Promise<string | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('❌ No hay usuario autenticado');
        return null;
      }

      console.log('👤 Usuario autenticado:', user.email);

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('❌ Error obteniendo perfil de usuario:', error);
        return null;
      }

      if (!profile?.company_id) {
        console.log('⚠️ Usuario sin empresa asignada');
        return null;
      }

      console.log('🏢 Company ID obtenido:', profile.company_id);
      return profile.company_id;
    } catch (error) {
      console.error('Error getting company ID:', error);
      return null;
    }
  }

  // Función para limpiar datos corruptos (solo para administradores)
  static async cleanOrphanedPeriods(): Promise<void> {
    try {
      const companyId = await this.getCurrentUserCompanyId();
      if (!companyId) {
        throw new Error('No se encontró la empresa del usuario');
      }

      console.log('🧹 Limpiando períodos huérfanos para empresa:', companyId);

      // Eliminar períodos que no tengan payrolls asociados
      const { error } = await supabase
        .from('payroll_periods_real')
        .delete()
        .eq('company_id', companyId)
        .eq('empleados_count', 0);

      if (error) {
        console.error('❌ Error limpiando períodos huérfanos:', error);
        throw error;
      }

      console.log('✅ Períodos huérfanos eliminados');
    } catch (error) {
      console.error('Error cleaning orphaned periods:', error);
      throw error;
    }
  }
}
