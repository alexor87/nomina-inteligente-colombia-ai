
import { PayrollUnifiedService } from '../PayrollUnifiedService';
import { 
  Result, 
  PayrollClosureResult, 
  PostClosureResult,
  NextPeriodSuggestion 
} from '@/types/payroll-liquidation';
import { PayrollEmployee, PeriodStatus } from '@/types/payroll';

/**
 * ✅ FACADE PARA LIQUIDACIÓN DE NÓMINA - CORRECCIÓN FASE 1
 * Centraliza operaciones con tipos estrictos y manejo consistente de errores
 */
export class PayrollLiquidationFacade {
  
  /**
   * Detectar situación actual del período
   */
  static async detectCurrentPeriodSituation(): Promise<Result<PeriodStatus>> {
    try {
      const result = await PayrollUnifiedService.detectCurrentPeriodSituation();
      return {
        success: true,
        data: result
      };
    } catch (error) {
      console.error('❌ Error detectando período:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido detectando período'
      };
    }
  }

  /**
   * Crear nuevo período
   */
  static async createNextPeriod(): Promise<Result<{ period: any; message: string }>> {
    try {
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
        error: error instanceof Error ? error.message : 'Error desconocido creando período'
      };
    }
  }

  /**
   * Cargar empleados para período activo
   */
  static async loadEmployeesForActivePeriod(period: any): Promise<Result<PayrollEmployee[]>> {
    try {
      const employees = await PayrollUnifiedService.loadEmployeesForActivePeriod(period);
      return {
        success: true,
        data: employees
      };
    } catch (error) {
      console.error('❌ Error cargando empleados:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido cargando empleados'
      };
    }
  }

  /**
   * Cerrar período con tipos estrictos
   */
  static async closePeriod(
    period: any, 
    selectedEmployees: PayrollEmployee[]
  ): Promise<Result<PayrollClosureResult>> {
    try {
      const rawResult = await PayrollUnifiedService.closePeriod(period, selectedEmployees);
      
      // Validar y tipificar el resultado
      const result = this.validateClosureResult(rawResult);
      
      return {
        success: true,
        data: result
      };
    } catch (error) {
      console.error('❌ Error cerrando período:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido cerrando período'
      };
    }
  }

  /**
   * Remover empleado del período
   */
  static async removeEmployeeFromPeriod(employeeId: string, periodId: string): Promise<Result<void>> {
    try {
      await PayrollUnifiedService.removeEmployeeFromPeriod(employeeId, periodId);
      return {
        success: true,
        data: undefined
      };
    } catch (error) {
      console.error('❌ Error removiendo empleado:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido removiendo empleado'
      };
    }
  }

  /**
   * Recalcular empleado después de cambio en novedad
   */
  static async recalculateAfterNovedadChange(
    employeeId: string, 
    periodId: string
  ): Promise<Result<PayrollEmployee | null>> {
    try {
      const employee = await PayrollUnifiedService.recalculateAfterNovedadChange(employeeId, periodId);
      return {
        success: true,
        data: employee
      };
    } catch (error) {
      console.error('❌ Error recalculando empleado:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido recalculando empleado'
      };
    }
  }

  /**
   * Actualizar contador de empleados
   */
  static async updateEmployeeCount(periodId: string, count: number): Promise<Result<void>> {
    try {
      await PayrollUnifiedService.updateEmployeeCount(periodId, count);
      return {
        success: true,
        data: undefined
      };
    } catch (error) {
      console.error('❌ Error actualizando contador:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido actualizando contador'
      };
    }
  }

  /**
   * Validar y tipificar resultado de cierre
   */
  private static validateClosureResult(rawResult: unknown): PayrollClosureResult {
    // Si es string (caso actual), convertir a objeto tipado
    if (typeof rawResult === 'string') {
      return {
        success: true,
        message: rawResult,
        transactionId: undefined,
        rollbackExecuted: false,
        postClosureResult: undefined
      };
    }

    // Si es objeto, validar propiedades
    if (rawResult && typeof rawResult === 'object') {
      const obj = rawResult as any;
      
      return {
        success: obj.success ?? true,
        message: typeof obj.message === 'string' ? obj.message : 'Operación completada',
        transactionId: typeof obj.transactionId === 'string' ? obj.transactionId : undefined,
        rollbackExecuted: typeof obj.rollbackExecuted === 'boolean' ? obj.rollbackExecuted : false,
        postClosureResult: this.validatePostClosureResult(obj.postClosureResult)
      };
    }

    // Fallback para casos no esperados
    return {
      success: true,
      message: 'Operación completada exitosamente',
      transactionId: undefined,
      rollbackExecuted: false,
      postClosureResult: undefined
    };
  }

  /**
   * Validar resultado post-cierre
   */
  private static validatePostClosureResult(rawResult: unknown): PostClosureResult | undefined {
    if (!rawResult || typeof rawResult !== 'object') {
      return undefined;
    }

    const obj = rawResult as any;
    
    return {
      success: obj.success ?? true,
      message: typeof obj.message === 'string' ? obj.message : undefined,
      nextPeriodSuggestion: this.validateNextPeriodSuggestion(obj.nextPeriodSuggestion),
      error: typeof obj.error === 'string' ? obj.error : undefined
    };
  }

  /**
   * Validar sugerencia de siguiente período
   */
  private static validateNextPeriodSuggestion(rawSuggestion: unknown): NextPeriodSuggestion | undefined {
    if (!rawSuggestion || typeof rawSuggestion !== 'object') {
      return undefined;
    }

    const obj = rawSuggestion as any;
    
    if (
      typeof obj.startDate === 'string' &&
      typeof obj.endDate === 'string' &&
      typeof obj.periodName === 'string' &&
      ['semanal', 'quincenal', 'mensual'].includes(obj.type)
    ) {
      return {
        startDate: obj.startDate,
        endDate: obj.endDate,
        periodName: obj.periodName,
        type: obj.type as 'semanal' | 'quincenal' | 'mensual'
      };
    }

    return undefined;
  }
}
