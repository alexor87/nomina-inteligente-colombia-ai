import { PayrollDomainService } from '../PayrollDomainService';
import { PayrollCalculationEnhancedService } from '../PayrollCalculationEnhancedService';
import { Result, PayrollClosureResult } from '@/types/payroll-liquidation';
import { PayrollEmployee, PeriodStatus } from '@/types/payroll';
import { supabase } from '@/integrations/supabase/client';

/**
 * ✅ FACADE REPARADA - CONECTADA A ARQUITECTURA UNIFICADA
 * Usa PayrollDomainService en lugar de servicios obsoletos
 */
export class PayrollLiquidationFacade {
  
  // ✅ DETECCIÓN DE PERÍODO ACTUAL - CONECTADA A DOMINIO
  static async detectCurrentPeriodSituation(): Promise<Result<PeriodStatus>> {
    try {
      console.log('🎯 FACADE UNIFICADA - Detectando situación del período actual...');
      
      const periodDetection = await PayrollDomainService.detectCurrentPeriodSituation();
      
      // Convertir PeriodDetectionResult a PeriodStatus
      const periodStatus: PeriodStatus = {
        currentPeriod: periodDetection.currentPeriod,
        needsCreation: periodDetection.needsCreation,
        canContinue: periodDetection.canContinue,
        message: periodDetection.message,
        suggestion: periodDetection.suggestion,
        action: periodDetection.action,
        nextPeriod: periodDetection.nextPeriod
      };
      
      return {
        success: true,
        data: periodStatus
      };
      
    } catch (error) {
      console.error('❌ Error en detección de período:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  // ✅ CARGA DE EMPLEADOS - CONECTADA A DOMINIO CON CONVERSIÓN DE TIPOS
  static async loadEmployeesForActivePeriod(period: any): Promise<Result<PayrollEmployee[]>> {
    try {
      console.log('👥 FACADE UNIFICADA - Cargando empleados para período:', period.periodo);
      
      const domainEmployees = await PayrollDomainService.loadEmployeesForLiquidation(period.id);
      
      // Convertir de PayrollDomainService.PayrollEmployee a types/payroll.PayrollEmployee
      const convertedEmployees: PayrollEmployee[] = domainEmployees.map(emp => ({
        id: emp.id,
        name: emp.name,
        position: emp.position,
        baseSalary: emp.baseSalary,
        workedDays: 30, // Valor por defecto
        extraHours: 0,
        disabilities: 0,
        bonuses: 0,
        absences: 0,
        grossPay: emp.grossPay,
        deductions: emp.deductions,
        netPay: emp.netPay,
        transportAllowance: 0, // Valor por defecto
        employerContributions: emp.grossPay * 0.205, // 20.5% aproximado
        status: emp.status as 'valid' | 'error' | 'incomplete',
        errors: emp.errors,
        eps: undefined,
        afp: undefined
      }));
      
      return {
        success: true,
        data: convertedEmployees
      };
      
    } catch (error) {
      console.error('❌ Error cargando empleados:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error cargando empleados'
      };
    }
  }

  // ✅ REMOVER EMPLEADO DEL PERÍODO - IMPLEMENTACIÓN REAL
  static async removeEmployeeFromPeriod(employeeId: string, periodId: string): Promise<Result<void>> {
    try {
      console.log('🗑️ FACADE REAL - Removiendo empleado del período:', employeeId);
      
      // Eliminar registro de payrolls
      const { error: deleteError } = await supabase
        .from('payrolls')
        .delete()
        .eq('employee_id', employeeId)
        .eq('period_id', periodId);

      if (deleteError) {
        throw deleteError;
      }

      // Actualizar contador del período
      const { error: updateError } = await supabase
        .rpc('sync_historical_payroll_data', { 
          p_period_id: periodId 
        });

      if (updateError) {
        console.warn('⚠️ Warning actualizando contador:', updateError.message);
      }
      
      console.log('✅ Empleado removido exitosamente');
      
      return {
        success: true,
        data: undefined
      };
      
    } catch (error) {
      console.error('❌ Error removiendo empleado:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error removiendo empleado'
      };
    }
  }

  // ✅ RECALCULAR EMPLEADO - IMPLEMENTACIÓN REAL
  static async recalculateAfterNovedadChange(employeeId: string, periodId: string): Promise<Result<PayrollEmployee>> {
    try {
      console.log('🔄 FACADE REAL - Recalculando empleado después de novedad:', employeeId);
      
      // Obtener datos del empleado y período
      const { data: employee, error: empError } = await supabase
        .from('employees')
        .select('*')
        .eq('id', employeeId)
        .single();

      if (empError || !employee) {
        throw new Error('Empleado no encontrado');
      }

      const { data: period, error: periodError } = await supabase
        .from('payroll_periods_real')
        .select('*')
        .eq('id', periodId)
        .single();

      if (periodError || !period) {
        throw new Error('Período no encontrado');
      }

      // Calcular nómina con servicio real
      const calculationInput = {
        baseSalary: Number(employee.salario_base),
        workedDays: employee.dias_trabajo || 30,
        extraHours: 0,
        disabilities: 0,
        bonuses: 0,
        absences: 0,
        periodType: period.tipo_periodo as 'quincenal' | 'mensual' | 'semanal',
        empleadoId: employeeId,
        periodoId: periodId
      };

      const calculation = await PayrollCalculationEnhancedService.calculatePayroll(calculationInput);

      // Actualizar registro en payrolls
      const { error: updateError } = await supabase
        .from('payrolls')
        .update({
          total_devengado: calculation.grossPay,
          total_deducciones: calculation.totalDeductions,
          neto_pagado: calculation.netPay,
          updated_at: new Date().toISOString()
        })
        .eq('employee_id', employeeId)
        .eq('period_id', periodId);

      if (updateError) {
        throw updateError;
      }

      // Retornar empleado recalculado
      const recalculatedEmployee: PayrollEmployee = {
        id: employee.id,
        name: `${employee.nombre} ${employee.apellido}`,
        position: employee.cargo || 'Sin cargo',
        baseSalary: Number(employee.salario_base),
        workedDays: employee.dias_trabajo || 30,
        extraHours: 0,
        disabilities: 0,
        bonuses: 0,
        absences: 0,
        grossPay: calculation.grossPay,
        deductions: calculation.totalDeductions,
        netPay: calculation.netPay,
        transportAllowance: calculation.transportAllowance,
        employerContributions: calculation.employerContributions,
        status: 'valid',
        errors: []
      };
      
      return {
        success: true,
        data: recalculatedEmployee
      };
      
    } catch (error) {
      console.error('❌ Error recalculando empleado:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error recalculando empleado'
      };
    }
  }

  // ✅ ACTUALIZAR CONTADOR DE EMPLEADOS - IMPLEMENTACIÓN REAL
  static async updateEmployeeCount(periodId: string, count: number): Promise<Result<void>> {
    try {
      console.log('📊 FACADE REAL - Actualizando contador de empleados:', count);
      
      const { error } = await supabase
        .from('payroll_periods_real')
        .update({ 
          empleados_count: count,
          updated_at: new Date().toISOString()
        })
        .eq('id', periodId);

      if (error) {
        throw error;
      }
      
      console.log('✅ Contador actualizado exitosamente');
      
      return {
        success: true,
        data: undefined
      };
      
    } catch (error) {
      console.error('❌ Error actualizando contador:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error actualizando contador'
      };
    }
  }

  // ✅ CERRAR PERÍODO - CONECTADO A DOMINIO
  static async closePeriod(period: any, employees: PayrollEmployee[]): Promise<Result<PayrollClosureResult>> {
    try {
      console.log('🔒 FACADE UNIFICADA - Cerrando período:', period.periodo);
      
      const transactionId = 'txn_' + Date.now();
      
      // Usar PayrollDomainService para cerrar período
      const result = await PayrollDomainService.closePeriod(period.id);
      
      if (!result.success) {
        throw new Error(result.message);
      }

      // Detectar siguiente período sugerido
      const nextPeriodResult = await PayrollDomainService.detectCurrentPeriodSituation();
      
      const closureResult: PayrollClosureResult = {
        success: true,
        message: `Período ${period.periodo} cerrado exitosamente`,
        transactionId,
        rollbackExecuted: false,
        postClosureResult: {
          success: true,
          message: 'Cierre completado satisfactoriamente',
          nextPeriodSuggestion: nextPeriodResult.nextPeriod ? {
            startDate: nextPeriodResult.nextPeriod.startDate,
            endDate: nextPeriodResult.nextPeriod.endDate,
            periodName: nextPeriodResult.nextPeriod.periodName,
            type: nextPeriodResult.nextPeriod.type
          } : undefined
        }
      };
      
      return {
        success: true,
        data: closureResult
      };
      
    } catch (error) {
      console.error('❌ Error cerrando período:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error cerrando período'
      };
    }
  }

  // ✅ CREAR SIGUIENTE PERÍODO - CONECTADO A DOMINIO
  static async createNextPeriod(): Promise<Result<{ period: any; message: string }>> {
    try {
      console.log('🆕 FACADE UNIFICADA - Creando siguiente período...');
      
      const result = await PayrollDomainService.createNextPeriod();
      
      if (!result.success) {
        return {
          success: false,
          error: result.message
        };
      }
      
      return {
        success: true,
        data: {
          period: result.period,
          message: result.message
        }
      };
      
    } catch (error) {
      console.error('❌ Error creando período:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error creando período'
      };
    }
  }
}
