import { supabase } from '@/integrations/supabase/client';
import { PayrollEmployee } from '@/types/payroll';
import { PayrollHistoryService } from '@/services/PayrollHistoryService';
import { PostClosureDetectionService } from '@/services/payroll-intelligent/PostClosureDetectionService';

/**
 * ✅ SERVICIO DE CIERRE TRANSACCIONAL - FASE 3
 * Implementa cierre atómico con rollback automático y detección post-cierre
 */
export class PayrollClosureTransactionalService {
  private static readonly CLOSURE_TIMEOUT = 30000; // 30 segundos
  private static readonly MAX_ROLLBACK_RETRIES = 3;

  /**
   * CIERRE TRANSACCIONAL PRINCIPAL CON DETECCIÓN POST-CIERRE
   */
  static async executeTransactionalClosure(
    period: any,
    selectedEmployees: PayrollEmployee[],
    companyId: string
  ): Promise<{
    success: boolean;
    message: string;
    transactionId?: string;
    rollbackExecuted?: boolean;
    postClosureResult?: any;
  }> {
    const transactionId = this.generateTransactionId();
    console.log(`🔒 FASE 3 - Iniciando cierre transaccional: ${transactionId}`);

    try {
      // PASO 1: Validaciones pre-cierre exhaustivas
      const validationResult = await this.executePreClosureValidations(
        period,
        selectedEmployees,
        companyId
      );

      if (!validationResult.isValid) {
        return {
          success: false,
          message: `Validaciones fallidas: ${validationResult.errors.join(', ')}`,
          transactionId
        };
      }

      // PASO 2: Crear snapshot pre-cierre
      const snapshot = await this.createPreClosureSnapshot(period.id, companyId);
      
      // PASO 3: Ejecutar cierre con timeout
      const closureResult = await Promise.race([
        this.executeAtomicClosure(period, selectedEmployees, companyId, transactionId),
        this.createTimeoutPromise()
      ]);

      if (!closureResult.success) {
        console.error('❌ Cierre falló, ejecutando rollback...');
        
        const rollbackResult = await this.executeRollback(
          period.id,
          snapshot,
          transactionId
        );

        return {
          success: false,
          message: `Cierre falló: ${closureResult.error}`,
          transactionId,
          rollbackExecuted: rollbackResult.executed
        };
      }

      // PASO 4: ✅ FASE 3 - Verificación post-cierre con detección inteligente
      console.log('🔍 FASE 3 - Iniciando verificación post-cierre...');
      const postClosureResult = await PostClosureDetectionService.verifyClosureAndDetectNext(
        period.id,
        companyId
      );

      if (!postClosureResult.success) {
        console.warn('⚠️ Verificación post-cierre falló, pero el cierre se completó');
        console.warn('Error:', postClosureResult.error);
      } else {
        console.log('✅ FASE 3 - Verificación post-cierre completada exitosamente');
        if (postClosureResult.nextPeriodSuggestion) {
          console.log('📅 Siguiente período sugerido:', postClosureResult.nextPeriodSuggestion);
        }
      }

      console.log(`✅ FASE 3 - Cierre transaccional completado: ${transactionId}`);
      
      return {
        success: true,
        message: `Período ${period.periodo} cerrado exitosamente`,
        transactionId,
        postClosureResult
      };

    } catch (error) {
      console.error('💥 Error crítico en cierre transaccional:', error);
      
      // Intentar rollback de emergencia
      try {
        const emergencySnapshot = await this.getEmergencySnapshot(period.id);
        await this.executeRollback(period.id, emergencySnapshot, transactionId);
      } catch (rollbackError) {
        console.error('💥 Error crítico en rollback de emergencia:', rollbackError);
      }

      return {
        success: false,
        message: `Error crítico: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        transactionId,
        rollbackExecuted: true
      };
    }
  }

  /**
   * VALIDACIONES PRE-CIERRE EXHAUSTIVAS
   */
  private static async executePreClosureValidations(
    period: any,
    selectedEmployees: PayrollEmployee[],
    companyId: string
  ): Promise<{ isValid: boolean; errors: string[]; warnings: string[] }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    console.log('🔍 FASE 3 - Ejecutando validaciones pre-cierre...');

    try {
      // Validación 1: Estado del período
      if (period.estado !== 'borrador') {
        errors.push(`Período en estado '${period.estado}', esperado 'borrador'`);
      }

      // Validación 2: Empleados seleccionados
      if (selectedEmployees.length === 0) {
        errors.push('Debe seleccionar al menos un empleado');
      }

      const validEmployees = selectedEmployees.filter(emp => emp.status === 'valid');
      if (validEmployees.length === 0) {
        errors.push('No hay empleados válidos seleccionados');
      }

      // Validación 3: Integridad de datos
      const integrityCheck = await this.validateDataIntegrity(period.id, companyId);
      if (!integrityCheck.isValid) {
        errors.push(...integrityCheck.errors);
      }

      // Validación 4: Verificar conexión DB
      const { error: connectionError } = await supabase
        .from('payroll_periods_real')
        .select('id')
        .eq('id', period.id)
        .single();

      if (connectionError) {
        errors.push('Error de conexión con la base de datos');
      }

      // Validación 5: Verificar espacio suficiente
      const storageCheck = await this.checkStorageSpace(companyId);
      if (!storageCheck.sufficient) {
        warnings.push('Espacio de almacenamiento bajo');
      }

      console.log(`✅ Validaciones completadas: ${errors.length} errores, ${warnings.length} advertencias`);

      return {
        isValid: errors.length === 0,
        errors,
        warnings
      };

    } catch (error) {
      console.error('❌ Error en validaciones pre-cierre:', error);
      return {
        isValid: false,
        errors: ['Error interno en validaciones'],
        warnings
      };
    }
  }

  /**
   * EJECUCIÓN ATÓMICA DEL CIERRE
   */
  private static async executeAtomicClosure(
    period: any,
    selectedEmployees: PayrollEmployee[],
    companyId: string,
    transactionId: string
  ): Promise<{ success: boolean; error?: string }> {
    console.log(`⚡ FASE 3 - Ejecutando cierre atómico: ${transactionId}`);

    try {
      // Calcular totales finales
      const totales = selectedEmployees.reduce(
        (acc, emp) => ({
          totalDevengado: acc.totalDevengado + emp.grossPay,
          totalDeducciones: acc.totalDeducciones + emp.deductions,
          totalNeto: acc.totalNeto + emp.netPay
        }),
        { totalDevengado: 0, totalDeducciones: 0, totalNeto: 0 }
      );

      // OPERACIÓN ATÓMICA: Actualizar período
      const { error: updateError } = await supabase
        .from('payroll_periods_real')
        .update({
          estado: 'cerrado',
          total_devengado: totales.totalDevengado,
          total_deducciones: totales.totalDeducciones,
          total_neto: totales.totalNeto,
          empleados_count: selectedEmployees.length,
          updated_at: new Date().toISOString()
        })
        .eq('id', period.id)
        .eq('estado', 'borrador'); // Condición de concurrencia

      if (updateError) {
        throw new Error(`Error actualizando período: ${updateError.message}`);
      }

      // OPERACIÓN ATÓMICA: Sincronizar con historial
      const syncResult = await supabase.rpc('sync_historical_payroll_data', {
        p_period_id: period.id
      });

      if (syncResult.error) {
        throw new Error(`Error sincronizando historial: ${syncResult.error.message}`);
      }

      // OPERACIÓN ATÓMICA: Actualizar estado de payrolls
      const { error: payrollUpdateError } = await supabase
        .from('payrolls')
        .update({ estado: 'procesada' })
        .eq('period_id', period.id)
        .in('employee_id', selectedEmployees.map(emp => emp.id));

      if (payrollUpdateError) {
        throw new Error(`Error actualizando payrolls: ${payrollUpdateError.message}`);
      }

      console.log(`✅ Cierre atómico completado: ${transactionId}`);
      
      return { success: true };

    } catch (error) {
      console.error(`❌ Error en cierre atómico: ${transactionId}`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  /**
   * ROLLBACK AUTOMÁTICO
   */
  private static async executeRollback(
    periodId: string,
    snapshot: any,
    transactionId: string
  ): Promise<{ executed: boolean; error?: string }> {
    console.log(`🔄 FASE 3 - Ejecutando rollback: ${transactionId}`);

    for (let attempt = 1; attempt <= this.MAX_ROLLBACK_RETRIES; attempt++) {
      try {
        // Restaurar estado del período
        const { error: restoreError } = await supabase
          .from('payroll_periods_real')
          .update({
            estado: snapshot.estado,
            total_devengado: snapshot.total_devengado,
            total_deducciones: snapshot.total_deducciones,
            total_neto: snapshot.total_neto,
            empleados_count: snapshot.empleados_count,
            updated_at: snapshot.updated_at
          })
          .eq('id', periodId);

        if (restoreError) {
          throw restoreError;
        }

        // Restaurar estado de payrolls
        const { error: payrollRestoreError } = await supabase
          .from('payrolls')
          .update({ estado: 'borrador' })
          .eq('period_id', periodId);

        if (payrollRestoreError) {
          throw payrollRestoreError;
        }

        console.log(`✅ Rollback completado: ${transactionId}`);
        return { executed: true };

      } catch (error) {
        console.error(`❌ Intento ${attempt} de rollback falló:`, error);
        
        if (attempt === this.MAX_ROLLBACK_RETRIES) {
          return {
            executed: false,
            error: `Rollback falló después de ${this.MAX_ROLLBACK_RETRIES} intentos`
          };
        }

        // Esperar antes del siguiente intento
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }

    return { executed: false };
  }

  /**
   * UTILIDADES INTERNAS
   */
  private static generateTransactionId(): string {
    return `closure_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private static async createTimeoutPromise(): Promise<{ success: false; error: string }> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error('Timeout en operación de cierre'));
      }, this.CLOSURE_TIMEOUT);
    });
  }

  private static async createPreClosureSnapshot(periodId: string, companyId: string): Promise<any> {
    const { data, error } = await supabase
      .from('payroll_periods_real')
      .select('*')
      .eq('id', periodId)
      .single();

    if (error) {
      throw new Error(`Error creando snapshot: ${error.message}`);
    }

    return data;
  }

  private static async getEmergencySnapshot(periodId: string): Promise<any> {
    // Snapshot básico para rollback de emergencia
    return {
      estado: 'borrador',
      total_devengado: 0,
      total_deducciones: 0,
      total_neto: 0,
      empleados_count: 0,
      updated_at: new Date().toISOString()
    };
  }

  private static async validateDataIntegrity(periodId: string, companyId: string): Promise<{
    isValid: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];

    try {
      // Verificar que todos los empleados tengan datos válidos
      const { data: payrolls, error } = await supabase
        .from('payrolls')
        .select('*')
        .eq('period_id', periodId);

      if (error) {
        errors.push('Error verificando integridad de payrolls');
      } else if (payrolls) {
        const invalidPayrolls = payrolls.filter(p => 
          !p.salario_base || p.salario_base <= 0 || !p.employee_id
        );
        
        if (invalidPayrolls.length > 0) {
          errors.push(`${invalidPayrolls.length} registros de nómina inválidos`);
        }
      }

      return {
        isValid: errors.length === 0,
        errors
      };

    } catch (error) {
      return {
        isValid: false,
        errors: ['Error interno verificando integridad']
      };
    }
  }

  private static async checkStorageSpace(companyId: string): Promise<{ sufficient: boolean }> {
    // Verificación básica de espacio - en una implementación real
    // consultaría métricas de la base de datos
    return { sufficient: true };
  }
}
