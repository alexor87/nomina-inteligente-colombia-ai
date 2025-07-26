import { supabase } from '@/integrations/supabase/client';

export interface AtomicTransactionContext {
  transactionId: string;
  operations: AtomicOperation[];
  rollbackOperations: AtomicOperation[];
  startTime: Date;
  checkpoints: string[];
}

export interface AtomicOperation {
  id: string;
  type: 'insert' | 'update' | 'delete' | 'rpc';
  table?: string;
  data?: any;
  conditions?: any;
  rpcFunction?: string;
  rpcParams?: any;
  checkpoint?: string;
}

export interface AtomicResult {
  success: boolean;
  transactionId: string;
  operationsCompleted: number;
  operationsTotal: number;
  error?: string;
  rollbackRequired: boolean;
  rollbackCompleted?: boolean;
  details: any;
}

/**
 * Servicio para operaciones atómicas en nómina
 * Garantiza consistencia de datos con rollback automático
 */
export class PayrollAtomicService {
  private static activeTransactions = new Map<string, AtomicTransactionContext>();
  
  /**
   * Ejecutar liquidación atómica con rollback garantizado
   */
  static async executeAtomicLiquidation(
    periodId: string, 
    companyId: string, 
    userId: string
  ): Promise<AtomicResult> {
    const transactionId = `liquidation_${periodId}_${Date.now()}`;
    console.log('⚛️ [ATOMIC] Iniciando liquidación atómica:', { transactionId, periodId });
    
    const context: AtomicTransactionContext = {
      transactionId,
      operations: [],
      rollbackOperations: [],
      startTime: new Date(),
      checkpoints: []
    };
    
    this.activeTransactions.set(transactionId, context);
    
    try {
      // FASE 1: Validación y preparación
      await this.addCheckpoint(context, 'validation_start');
      const validationResult = await this.validateLiquidationPreconditions(periodId, companyId);
      if (!validationResult.isValid) {
        throw new Error(`Validación falló: ${validationResult.errors.join(', ')}`);
      }
      await this.addCheckpoint(context, 'validation_completed');
      
      // FASE 2: Actualizar estado del período a "en_proceso"
      await this.addCheckpoint(context, 'period_state_update');
      await this.atomicUpdatePeriodState(context, periodId, 'en_proceso');
      
      // FASE 3: Procesar empleados con cálculos
      await this.addCheckpoint(context, 'employee_processing_start');
      const processResult = await this.atomicProcessEmployees(context, periodId, companyId);
      await this.addCheckpoint(context, 'employee_processing_completed');
      
      // FASE 4: Actualizar totales del período
      await this.addCheckpoint(context, 'period_totals_update');
      await this.atomicUpdatePeriodTotals(context, periodId, processResult.totals);
      
      // FASE 5: Generar vouchers
      await this.addCheckpoint(context, 'voucher_generation_start');
      await this.atomicGenerateVouchers(context, periodId, companyId, processResult.employeeData);
      await this.addCheckpoint(context, 'voucher_generation_completed');
      
      // FASE 6: Finalizar período como cerrado
      await this.addCheckpoint(context, 'period_finalization');
      await this.atomicUpdatePeriodState(context, periodId, 'cerrado');
      
      // FASE 7: Logging de auditoría
      await this.addCheckpoint(context, 'audit_logging');
      await this.atomicCreateAuditLog(context, {
        transactionId,
        periodId,
        companyId,
        userId,
        operationsCount: context.operations.length,
        checkpoints: context.checkpoints
      });
      
      await this.addCheckpoint(context, 'transaction_completed');
      
      console.log('✅ [ATOMIC] Liquidación atómica completada exitosamente:', { 
        transactionId, 
        operationsCompleted: context.operations.length 
      });
      
      // Limpiar transacción activa
      this.activeTransactions.delete(transactionId);
      
      return {
        success: true,
        transactionId,
        operationsCompleted: context.operations.length,
        operationsTotal: context.operations.length,
        rollbackRequired: false,
        details: {
          checkpoints: context.checkpoints,
          employeesProcessed: processResult.employeeData.length,
          vouchersGenerated: processResult.employeeData.length,
          totals: processResult.totals
        }
      };
      
    } catch (error) {
      console.error('❌ [ATOMIC] Error en liquidación atómica:', error);
      
      // Ejecutar rollback automático
      console.log('🔄 [ATOMIC] Iniciando rollback automático...');
      const rollbackResult = await this.executeRollback(context);
      
      this.activeTransactions.delete(transactionId);
      
      return {
        success: false,
        transactionId,
        operationsCompleted: context.operations.length,
        operationsTotal: context.operations.length,
        error: error.message,
        rollbackRequired: true,
        rollbackCompleted: rollbackResult.success,
        details: {
          checkpoints: context.checkpoints,
          rollbackDetails: rollbackResult.details,
          failurePoint: context.checkpoints[context.checkpoints.length - 1] || 'unknown'
        }
      };
    }
  }
  
  /**
   * Validar precondiciones para liquidación
   */
  private static async validateLiquidationPreconditions(periodId: string, companyId: string) {
    const errors: string[] = [];
    
    // Verificar período existe y está en estado correcto
    const { data: period, error: periodError } = await supabase
      .from('payroll_periods_real')
      .select('*')
      .eq('id', periodId)
      .eq('company_id', companyId)
      .single();
    
    if (periodError || !period) {
      errors.push('Período no encontrado');
    } else if (period.estado === 'cerrado') {
      errors.push('Período ya está cerrado');
    }
    
    // 🔒 SECURITY FIX: Verificar que hay empleados para procesar CON FILTRO DE EMPRESA
    const { data: payrolls } = await supabase
      .from('payrolls')
      .select('id')
      .eq('period_id', periodId)
      .eq('company_id', companyId); // CRITICAL: Add company filter
    
    if (!payrolls || payrolls.length === 0) {
      errors.push('No hay empleados para procesar');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
  
  /**
   * Procesar empleados con cálculos atómicos
   */
  private static async atomicProcessEmployees(
    context: AtomicTransactionContext, 
    periodId: string, 
    companyId: string
  ) {
    // 🔒 SECURITY FIX: Obtener empleados del período CON FILTRO DE EMPRESA
    const { data: payrolls, error } = await supabase
      .from('payrolls')
      .select(`
        id, employee_id, salario_base,
        employees(nombre, apellido, cedula)
      `)
      .eq('period_id', periodId)
      .eq('company_id', companyId); // CRITICAL: Add company filter
    
    if (error || !payrolls) {
      throw new Error('Error obteniendo empleados para procesar');
    }
    
    const employeeData = [];
    let totalDevengado = 0;
    let totalDeducciones = 0;
    let totalNeto = 0;
    
    // Procesar cada empleado con cálculos
    for (const payroll of payrolls) {
      try {
        // Llamar al edge function de cálculos
        const { data: calculationResult, error: calcError } = await supabase.functions.invoke(
          'payroll-calculations',
          {
            body: {
              action: 'calculate',
              employeeId: payroll.employee_id,
              baseSalary: payroll.salario_base,
              periodType: 'quincenal',
              novedades: []
            }
          }
        );
        
        if (calcError || !calculationResult?.success) {
          throw new Error(`Error en cálculos para empleado ${payroll.employee_id}: ${calcError?.message}`);
        }
        
        const calcs = calculationResult.result;
        
        // Actualizar payroll con cálculos atómicamente
        const updateOp: AtomicOperation = {
          id: `update_payroll_${payroll.id}`,
          type: 'update',
          table: 'payrolls',
          data: {
            total_devengado: calcs.grossPay,
            total_deducciones: calcs.healthDeduction + calcs.pensionDeduction,
            neto_pagado: calcs.netPay,
            estado: 'procesada',
            detalle_calculo: calcs
          },
          conditions: { id: payroll.id }
        };
        
        await this.executeOperation(context, updateOp);
        
        employeeData.push({
          payrollId: payroll.id,
          employeeId: payroll.employee_id,
          calculations: calcs,
          employee: payroll.employees
        });
        
        totalDevengado += calcs.grossPay;
        totalDeducciones += calcs.healthDeduction + calcs.pensionDeduction;
        totalNeto += calcs.netPay;
        
      } catch (error) {
        throw new Error(`Error procesando empleado ${payroll.employee_id}: ${error.message}`);
      }
    }
    
    return {
      employeeData,
      totals: {
        totalDevengado,
        totalDeducciones,
        totalNeto,
        empleadosCount: employeeData.length
      }
    };
  }
  
  /**
   * Generar vouchers atómicamente
   */
  private static async atomicGenerateVouchers(
    context: AtomicTransactionContext,
    periodId: string,
    companyId: string,
    employeeData: any[]
  ) {
    // 🔒 SECURITY FIX: Obtener datos del período CON FILTRO DE EMPRESA
    const { data: period } = await supabase
      .from('payroll_periods_real')
      .select('*')
      .eq('id', periodId)
      .eq('company_id', companyId) // CRITICAL: Add company filter
      .single();
    
    if (!period) {
      throw new Error('Período no encontrado para generar vouchers');
    }
    
    for (const employee of employeeData) {
      const voucherOp: AtomicOperation = {
        id: `voucher_${employee.payrollId}`,
        type: 'insert',
        table: 'payroll_vouchers',
        data: {
          company_id: companyId,
          employee_id: employee.employeeId,
          payroll_id: employee.payrollId,
          periodo: period.periodo,
          start_date: period.fecha_inicio,
          end_date: period.fecha_fin,
          net_pay: employee.calculations.netPay,
          voucher_status: 'pendiente',
          generated_by: null // Se establecerá en el edge function
        }
      };
      
      await this.executeOperation(context, voucherOp);
    }
  }
  
  /**
   * Actualizar estado del período atómicamente
   */
  private static async atomicUpdatePeriodState(
    context: AtomicTransactionContext,
    periodId: string,
    newState: string
  ) {
    const operation: AtomicOperation = {
      id: `period_state_${periodId}_${newState}`,
      type: 'update',
      table: 'payroll_periods_real',
      data: {
        estado: newState,
        last_activity_at: new Date().toISOString()
      },
      conditions: { id: periodId }
    };
    
    await this.executeOperation(context, operation);
  }
  
  /**
   * Actualizar totales del período atómicamente
   */
  private static async atomicUpdatePeriodTotals(
    context: AtomicTransactionContext,
    periodId: string,
    totals: any
  ) {
    const operation: AtomicOperation = {
      id: `period_totals_${periodId}`,
      type: 'update',
      table: 'payroll_periods_real',
      data: {
        empleados_count: totals.empleadosCount,
        total_devengado: totals.totalDevengado,
        total_deducciones: totals.totalDeducciones,
        total_neto: totals.totalNeto,
        updated_at: new Date().toISOString()
      },
      conditions: { id: periodId }
    };
    
    await this.executeOperation(context, operation);
  }
  
  /**
   * Crear log de auditoría atómicamente
   */
  private static async atomicCreateAuditLog(
    context: AtomicTransactionContext,
    auditData: any
  ) {
    const operation: AtomicOperation = {
      id: `audit_log_${auditData.transactionId}`,
      type: 'insert',
      table: 'payroll_sync_log',
      data: {
        company_id: auditData.companyId,
        period_id: auditData.periodId,
        sync_type: 'atomic_liquidation',
        status: 'completed',
        records_created: auditData.operationsCount,
        completed_at: new Date().toISOString(),
        error_message: null
      }
    };
    
    await this.executeOperation(context, operation);
  }
  
  /**
   * Ejecutar operación individual y registrar rollback
   */
  private static async executeOperation(
    context: AtomicTransactionContext,
    operation: AtomicOperation
  ) {
    try {
      let result;
      
      switch (operation.type) {
        case 'insert':
          if (operation.table === 'payrolls') {
            result = await supabase.from('payrolls').insert(operation.data);
          } else if (operation.table === 'payroll_vouchers') {
            result = await supabase.from('payroll_vouchers').insert(operation.data);
          } else if (operation.table === 'payroll_periods_real') {
            result = await supabase.from('payroll_periods_real').insert(operation.data);
          } else if (operation.table === 'payroll_sync_log') {
            result = await supabase.from('payroll_sync_log').insert(operation.data);
          }
          
          // Registrar operación de rollback
          context.rollbackOperations.push({
            id: `rollback_${operation.id}`,
            type: 'delete',
            table: operation.table,
            conditions: operation.data
          });
          break;
          
        case 'update':
          // Primero obtener datos originales para rollback
          let originalData;
          if (operation.table === 'payrolls') {
            const { data } = await supabase.from('payrolls').select('*').match(operation.conditions).single();
            originalData = data;
            result = await supabase.from('payrolls').update(operation.data).match(operation.conditions);
          } else if (operation.table === 'payroll_periods_real') {
            const { data } = await supabase.from('payroll_periods_real').select('*').match(operation.conditions).single();
            originalData = data;
            result = await supabase.from('payroll_periods_real').update(operation.data).match(operation.conditions);
          }
          
          // Registrar operación de rollback
          if (originalData) {
            context.rollbackOperations.push({
              id: `rollback_${operation.id}`,
              type: 'update',
              table: operation.table,
              data: originalData,
              conditions: operation.conditions
            });
          }
          break;
          
        case 'delete':
          // Obtener datos antes de eliminar para rollback
          let dataToDelete;
          if (operation.table === 'payrolls') {
            const { data } = await supabase.from('payrolls').select('*').match(operation.conditions);
            dataToDelete = data;
            result = await supabase.from('payrolls').delete().match(operation.conditions);
          } else if (operation.table === 'payroll_vouchers') {
            const { data } = await supabase.from('payroll_vouchers').select('*').match(operation.conditions);
            dataToDelete = data;
            result = await supabase.from('payroll_vouchers').delete().match(operation.conditions);
          }
          
          // Registrar operación de rollback
          if (dataToDelete) {
            for (const item of dataToDelete) {
              context.rollbackOperations.push({
                id: `rollback_${operation.id}_${item.id}`,
                type: 'insert',
                table: operation.table,
                data: item
              });
            }
          }
          break;
      }
      
      if (result?.error) {
        throw new Error(`Error en operación ${operation.type}: ${result.error.message}`);
      }
      
      context.operations.push(operation);
      console.log(`✓ [ATOMIC] Operación completada: ${operation.id}`);
      
    } catch (error) {
      console.error(`❌ [ATOMIC] Error en operación ${operation.id}:`, error);
      throw error;
    }
  }
  
  /**
   * Ejecutar rollback de todas las operaciones
   */
  private static async executeRollback(context: AtomicTransactionContext) {
    console.log('🔄 [ROLLBACK] Iniciando rollback de transacción:', context.transactionId);
    
    const rollbackDetails = [];
    const rollbackErrors = [];
    
    // Ejecutar rollbacks en orden inverso
    const rollbackOps = [...context.rollbackOperations].reverse();
    
    for (const rollbackOp of rollbackOps) {
      try {
        let result;
        
        switch (rollbackOp.type) {
          case 'insert':
            if (rollbackOp.table === 'payrolls') {
              result = await supabase.from('payrolls').insert(rollbackOp.data);
            } else if (rollbackOp.table === 'payroll_vouchers') {
              result = await supabase.from('payroll_vouchers').insert(rollbackOp.data);
            } else if (rollbackOp.table === 'payroll_periods_real') {
              result = await supabase.from('payroll_periods_real').insert(rollbackOp.data);
            }
            break;
            
          case 'update':
            if (rollbackOp.table === 'payrolls') {
              result = await supabase.from('payrolls').update(rollbackOp.data).match(rollbackOp.conditions);
            } else if (rollbackOp.table === 'payroll_periods_real') {
              result = await supabase.from('payroll_periods_real').update(rollbackOp.data).match(rollbackOp.conditions);
            }
            break;
            
          case 'delete':
            if (rollbackOp.table === 'payrolls') {
              result = await supabase.from('payrolls').delete().match(rollbackOp.conditions);
            } else if (rollbackOp.table === 'payroll_vouchers') {
              result = await supabase.from('payroll_vouchers').delete().match(rollbackOp.conditions);
            }
            break;
        }
        
        if (result?.error) {
          throw new Error(result.error.message);
        }
        
        rollbackDetails.push(`✓ Rollback: ${rollbackOp.id}`);
        
      } catch (error) {
        const errorMsg = `❌ Error en rollback ${rollbackOp.id}: ${error.message}`;
        console.error(errorMsg);
        rollbackErrors.push(errorMsg);
      }
    }
    
    console.log('🏁 [ROLLBACK] Rollback completado:', {
      operationsRolledBack: rollbackDetails.length,
      errors: rollbackErrors.length
    });
    
    return {
      success: rollbackErrors.length === 0,
      details: rollbackDetails,
      errors: rollbackErrors
    };
  }
  
  /**
   * Agregar checkpoint al contexto
   */
  private static async addCheckpoint(context: AtomicTransactionContext, checkpoint: string) {
    context.checkpoints.push(`${new Date().toISOString()}: ${checkpoint}`);
    console.log(`📍 [ATOMIC] Checkpoint: ${checkpoint}`);
  }
  
  /**
   * Obtener transacciones activas (para monitoreo)
   */
  static getActiveTransactions(): AtomicTransactionContext[] {
    return Array.from(this.activeTransactions.values());
  }
  
  /**
   * Limpiar transacciones abandonadas
   */
  static cleanupAbandonedTransactions(maxAgeHours: number = 2) {
    const cutoffTime = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);
    
    for (const [transactionId, context] of this.activeTransactions.entries()) {
      if (context.startTime < cutoffTime) {
        console.log(`🧹 [CLEANUP] Limpiando transacción abandonada: ${transactionId}`);
        this.activeTransactions.delete(transactionId);
      }
    }
  }
}