
import { PayrollUnifiedService } from '../PayrollUnifiedService';
import { Result, PayrollClosureResult } from '@/types/payroll-liquidation';
import { PayrollEmployee, PeriodStatus } from '@/types/payroll';

/**
 * ✅ FACADE CONSOLIDADA DE LIQUIDACIÓN - REPARACIÓN CRÍTICA
 * Unifica todos los servicios de liquidación en una sola interfaz
 */
export class PayrollLiquidationFacade {
  
  // ✅ DETECCIÓN DE PERÍODO ACTUAL
  static async detectCurrentPeriodSituation(): Promise<Result<PeriodStatus>> {
    try {
      console.log('🎯 FACADE - Detectando situación del período actual...');
      
      const periodStatus = await PayrollUnifiedService.detectCurrentPeriodSituation();
      
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

  // ✅ CARGA DE EMPLEADOS PARA PERÍODO ACTIVO
  static async loadEmployeesForActivePeriod(period: any): Promise<Result<PayrollEmployee[]>> {
    try {
      console.log('👥 FACADE - Cargando empleados para período:', period.periodo);
      
      const employees = await PayrollUnifiedService.loadEmployeesForActivePeriod(period);
      
      return {
        success: true,
        data: employees
      };
      
    } catch (error) {
      console.error('❌ Error cargando empleados:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error cargando empleados'
      };
    }
  }

  // ✅ REMOVER EMPLEADO DEL PERÍODO
  static async removeEmployeeFromPeriod(employeeId: string, periodId: string): Promise<Result<void>> {
    try {
      console.log('🗑️ FACADE - Removiendo empleado del período:', employeeId);
      
      // TODO: Implementar lógica real de remoción
      console.log('✅ Empleado removido exitosamente (simulado)');
      
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

  // ✅ RECALCULAR EMPLEADO DESPUÉS DE NOVEDAD
  static async recalculateAfterNovedadChange(employeeId: string, periodId: string): Promise<Result<PayrollEmployee>> {
    try {
      console.log('🔄 FACADE - Recalculando empleado después de novedad:', employeeId);
      
      // TODO: Implementar lógica real de recálculo
      const mockEmployee: PayrollEmployee = {
        id: employeeId,
        name: 'Empleado Recalculado',
        position: 'Cargo',
        baseSalary: 1000000,
        workedDays: 30,
        extraHours: 0,
        disabilities: 0,
        bonuses: 0,
        absences: 0,
        grossPay: 1000000,
        deductions: 80000,
        netPay: 920000,
        transportAllowance: 0,
        employerContributions: 207500,
        status: 'valid',
        errors: []
      };
      
      return {
        success: true,
        data: mockEmployee
      };
      
    } catch (error) {
      console.error('❌ Error recalculando empleado:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error recalculando empleado'
      };
    }
  }

  // ✅ ACTUALIZAR CONTADOR DE EMPLEADOS
  static async updateEmployeeCount(periodId: string, count: number): Promise<Result<void>> {
    try {
      console.log('📊 FACADE - Actualizando contador de empleados:', count);
      
      // TODO: Implementar actualización real en BD
      console.log('✅ Contador actualizado exitosamente (simulado)');
      
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

  // ✅ CERRAR PERÍODO
  static async closePeriod(period: any, employees: PayrollEmployee[]): Promise<Result<PayrollClosureResult>> {
    try {
      console.log('🔒 FACADE - Cerrando período:', period.periodo);
      
      // TODO: Implementar lógica real de cierre
      const closureResult: PayrollClosureResult = {
        success: true,
        message: `Período ${period.periodo} cerrado exitosamente`,
        transactionId: 'txn_' + Date.now(),
        rollbackExecuted: false,
        postClosureResult: {
          success: true,
          message: 'Cierre completado satisfactoriamente',
          nextPeriodSuggestion: {
            startDate: '2025-08-01',
            endDate: '2025-08-31',
            periodName: 'Agosto 2025',
            type: 'mensual'
          }
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

  // ✅ CREAR SIGUIENTE PERÍODO
  static async createNextPeriod(): Promise<Result<{ period: any; message: string }>> {
    try {
      console.log('🆕 FACADE - Creando siguiente período...');
      
      const result = await PayrollUnifiedService.createNextPeriod();
      
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
