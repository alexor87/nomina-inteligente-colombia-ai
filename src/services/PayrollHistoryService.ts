
import { supabase } from '@/integrations/supabase/client';
import { PayrollHistoryDetails, PayrollHistoryEmployee } from '@/types/payroll-history';
import { PAYROLL_STATES, STATE_MAPPING } from '@/constants/payrollStates';
import { PeriodNameUnifiedService } from './payroll-intelligent/PeriodNameUnifiedService';

export interface PayrollHistoryRecord {
  id: string;
  periodo: string;
  fecha_inicio: string;
  fecha_fin: string;
  empleados: number;
  totalNomina: number;
  estado: string;
  fechaCreacion: string;
  editable: boolean;
  reportado_dian: boolean;
}

export class PayrollHistoryService {
  static async getCurrentUserCompanyId(): Promise<string | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();
      
      return profile?.company_id || null;
    } catch (error) {
      console.error('Error getting company ID:', error);
      return null;
    }
  }

  static async getPayrollPeriods(): Promise<PayrollHistoryRecord[]> {
    try {
      const companyId = await this.getCurrentUserCompanyId();
      if (!companyId) return [];

      console.log('🔍 Consultando períodos para empresa:', companyId);

      // Primero normalizar períodos existentes para consistencia
      await PeriodNameUnifiedService.normalizeExistingPeriods(companyId);

      const { data: periods, error: periodsError } = await supabase
        .from('payroll_periods_real')
        .select('*')
        .eq('company_id', companyId)
        .order('fecha_inicio', { ascending: false });

      if (periodsError) {
        console.error('❌ Error consultando períodos:', periodsError);
        return [];
      }

      console.log('📊 Períodos encontrados:', periods?.length || 0);

      const transformedPeriods = periods?.map(period => {
        console.log(`📄 Procesando período "${period.periodo}" con estado "${period.estado}"`);
        
        // Mapear estado directamente usando las constantes
        const mappedState = STATE_MAPPING[period.estado] || period.estado;
        
        console.log(`📊 Estado: DB="${period.estado}" → UI="${mappedState}"`);
        
        return {
          id: period.id,
          periodo: period.periodo, // Ya normalizado
          fecha_inicio: period.fecha_inicio,
          fecha_fin: period.fecha_fin,
          empleados: period.empleados_count || 0,
          totalNomina: Number(period.total_neto || 0),
          estado: mappedState,
          fechaCreacion: period.created_at,
          editable: ['borrador', 'editado', 'reabierto'].includes(period.estado),
          reportado_dian: false
        };
      }) || [];

      console.log('✅ Períodos transformados correctamente:', transformedPeriods.length);
      return transformedPeriods;
    } catch (error) {
      console.error('💥 Error crítico en getPayrollPeriods:', error);
      return [];
    }
  }

  static async getPeriodDetails(periodId: string): Promise<PayrollHistoryDetails> {
    try {
      const companyId = await this.getCurrentUserCompanyId();
      if (!companyId) throw new Error('No company ID found');

      console.log('🔍 Obteniendo detalles del período:', periodId);

      // Get period details
      const { data: period, error: periodError } = await supabase
        .from('payroll_periods_real')
        .select('*')
        .eq('id', periodId)
        .eq('company_id', companyId)
        .single();

      if (periodError) {
        console.error('❌ Error obteniendo período:', periodError);
        throw periodError;
      }

      console.log('📊 Período encontrado:', period);

      // Get employees for this period using period_id relationship
      let { data: payrolls, error: payrollsError } = await supabase
        .from('payrolls')
        .select(`
          *,
          employees (
            id,
            nombre,
            apellido,
            cargo
          )
        `)
        .eq('company_id', companyId)
        .eq('period_id', periodId);

      if (payrollsError) {
        console.error('❌ Error obteniendo payrolls:', payrollsError);
        // If period_id relationship fails, try fallback with periodo text
        const { data: fallbackPayrolls, error: fallbackError } = await supabase
          .from('payrolls')
          .select(`
            *,
            employees (
              id,
              nombre,
              apellido,
              cargo
            )
          `)
          .eq('company_id', companyId)
          .eq('periodo', period.periodo);

        if (fallbackError) throw fallbackError;
        payrolls = fallbackPayrolls;
      }

      console.log('👥 Empleados encontrados:', payrolls?.length || 0);

      const employees: PayrollHistoryEmployee[] = payrolls?.map(payroll => ({
        id: payroll.employee_id,
        periodId: periodId,
        payrollId: payroll.id,
        name: `${payroll.employees?.nombre || 'N/A'} ${payroll.employees?.apellido || ''}`.trim(),
        position: payroll.employees?.cargo || 'N/A',
        grossPay: Number(payroll.total_devengado || 0),
        deductions: Number(payroll.total_deducciones || 0),
        netPay: Number(payroll.neto_pagado || 0),
        baseSalary: Number(payroll.salario_base || 0),
        paymentStatus: 'pendiente' as const
      })) || [];

      const summary = {
        totalDevengado: employees.reduce((sum, emp) => sum + emp.grossPay, 0),
        totalDeducciones: employees.reduce((sum, emp) => sum + emp.deductions, 0),
        totalNeto: employees.reduce((sum, emp) => sum + emp.netPay, 0),
        costoTotal: employees.reduce((sum, emp) => sum + emp.grossPay, 0),
        aportesEmpleador: employees.length * 100000 // Mock calculation
      };

      // Mapear estado correctamente
      const displayState = STATE_MAPPING[period.estado] || period.estado;

      console.log('✅ Detalles del período construidos correctamente');

      return {
        period: {
          id: period.id,
          period: period.periodo,
          startDate: period.fecha_inicio,
          endDate: period.fecha_fin,
          type: this.mapPeriodType(period.tipo_periodo),
          employeesCount: employees.length,
          status: displayState as any,
          totalGrossPay: summary.totalDevengado,
          totalNetPay: summary.totalNeto,
          totalDeductions: summary.totalDeducciones,
          totalCost: summary.costoTotal,
          employerContributions: summary.aportesEmpleador,
          paymentStatus: 'pendiente' as const,
          version: 1,
          createdAt: period.created_at,
          updatedAt: period.updated_at,
          editable: ['borrador', 'editado', 'reabierto'].includes(period.estado)
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
      console.error('💥 Error obteniendo detalles del período:', error);
      throw error;
    }
  }

  static async updateEmployeeValues(periodId: string, employeeId: string, updates: Partial<PayrollHistoryEmployee>): Promise<void> {
    try {
      // Find the payroll record for this employee and period
      const { data: payrolls, error: findError } = await supabase
        .from('payrolls')
        .select('id, periodo')
        .eq('employee_id', employeeId)
        .limit(1);

      if (findError) throw findError;
      if (!payrolls || payrolls.length === 0) return;

      const payrollId = payrolls[0].id;

      // Update the payroll record
      const updateData: any = {};
      if (updates.grossPay !== undefined) updateData.total_devengado = updates.grossPay;
      if (updates.deductions !== undefined) updateData.total_deducciones = updates.deductions;
      if (updates.netPay !== undefined) updateData.neto_pagado = updates.netPay;
      if (updates.baseSalary !== undefined) updateData.salario_base = updates.baseSalary;

      const { error: updateError } = await supabase
        .from('payrolls')
        .update(updateData)
        .eq('id', payrollId);

      if (updateError) throw updateError;
    } catch (error) {
      console.error('Error updating employee values:', error);
      throw error;
    }
  }

  static async recalculatePeriodTotals(periodId: string): Promise<void> {
    try {
      const companyId = await this.getCurrentUserCompanyId();
      if (!companyId) throw new Error('No company ID found');

      // Get period info
      const { data: period, error: periodError } = await supabase
        .from('payroll_periods_real')
        .select('periodo')
        .eq('id', periodId)
        .single();

      if (periodError) throw periodError;

      // Get all payrolls for this period
      const { data: payrolls, error: payrollsError } = await supabase
        .from('payrolls')
        .select('total_devengado, total_deducciones, neto_pagado')
        .eq('company_id', companyId)
        .eq('periodo', period.periodo);

      if (payrollsError) throw payrollsError;

      // Calculate totals
      const totals = payrolls?.reduce((acc, payroll) => ({
        totalDevengado: acc.totalDevengado + Number(payroll.total_devengado || 0),
        totalDeducciones: acc.totalDeducciones + Number(payroll.total_deducciones || 0),
        totalNeto: acc.totalNeto + Number(payroll.neto_pagado || 0)
      }), {
        totalDevengado: 0,
        totalDeducciones: 0,
        totalNeto: 0
      }) || { totalDevengado: 0, totalDeducciones: 0, totalNeto: 0 };

      // Update period totals
      const { error: updateError } = await supabase
        .from('payroll_periods_real')
        .update({
          total_devengado: totals.totalDevengado,
          total_deducciones: totals.totalDeducciones,
          total_neto: totals.totalNeto,
          empleados_count: payrolls?.length || 0
        })
        .eq('id', periodId);

      if (updateError) throw updateError;
    } catch (error) {
      console.error('Error recalculating period totals:', error);
      throw error;
    }
  }

  static mapPeriodType(tipoPeriodo: string): 'semanal' | 'quincenal' | 'mensual' | 'personalizado' {
    const typeMap: Record<string, 'semanal' | 'quincenal' | 'mensual' | 'personalizado'> = {
      'semanal': 'semanal',
      'quincenal': 'quincenal',
      'mensual': 'mensual',
      'personalizado': 'personalizado'
    };
    
    return typeMap[tipoPeriodo] || 'mensual';
  }

  static async recalculateEmployeeTotalsWithNovedades(employeeId: string, periodId: string): Promise<void> {
    try {
      console.log('Recalculating totals for employee:', employeeId, 'period:', periodId);
    } catch (error) {
      console.error('Error recalculating employee totals:', error);
      throw error;
    }
  }
}
