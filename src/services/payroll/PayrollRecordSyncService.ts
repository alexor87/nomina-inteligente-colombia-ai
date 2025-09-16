import { supabase } from '@/integrations/supabase/client';

/**
 * Servicio para mantener sincronizados los registros de nómina
 * entre cálculos en tiempo real y valores almacenados en BD
 */
export class PayrollRecordSyncService {
  
  /**
   * Fuerza la actualización de un empleado específico marcándolo como is_stale=false
   */
  static async forceUpdateEmployee(employeeId: string, periodId: string): Promise<boolean> {
    try {
      console.log(`🔄 Forzando actualización de empleado ${employeeId} en período ${periodId}`);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Usuario no autenticado');
      }

      // Obtener compañía del usuario
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (!profile?.company_id) {
        throw new Error('No se pudo obtener la compañía del usuario');
      }

      // Llamar al edge function para recalcular
      const { data: result, error } = await supabase.functions.invoke('reliquidate-period-adjustments', {
        body: {
          periodId,
          affectedEmployeeIds: [employeeId],
          justification: 'Corrección manual de valores de comprobante',
          options: {
            reliquidateScope: 'affected',
            regenerateVouchers: false,
            source: 'manual_correction'
          }
        }
      });

      if (error) {
        console.error('❌ Error en recálculo manual:', error);
        return false;
      }

      console.log('✅ Empleado actualizado correctamente:', result);
      return true;

    } catch (error) {
      console.error('❌ Error en forceUpdateEmployee:', error);
      return false;
    }
  }

  /**
   * Verifica si un registro de nómina está obsoleto (is_stale=true)
   */
  static async checkIfStale(payrollId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('payrolls')
        .select('is_stale')
        .eq('id', payrollId)
        .single();

      if (error) {
        console.error('Error verificando is_stale:', error);
        return false;
      }

      return data?.is_stale === true;
    } catch (error) {
      console.error('Error en checkIfStale:', error);
      return false;
    }
  }

  /**
   * Marca todos los registros de un período como obsoletos
   */
  static async markPeriodAsStale(periodId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('payrolls')
        .update({ is_stale: true })
        .eq('period_id', periodId);

      if (error) {
        console.error('Error marcando período como stale:', error);
        throw error;
      }

      console.log(`✅ Período ${periodId} marcado como stale`);
    } catch (error) {
      console.error('Error en markPeriodAsStale:', error);
      throw error;
    }
  }

  /**
   * Proceso batch para corregir todos los registros is_stale=true de una compañía
   */
  static async fixAllStaleRecords(companyId: string, limitRecords: number = 50): Promise<{
    processed: number;
    corrected: number;
    failed: number;
  }> {
    try {
      console.log(`🔄 Iniciando corrección batch de registros stale para compañía ${companyId}`);

      // Obtener registros obsoletos
      const { data: staleRecords, error } = await supabase
        .from('payrolls')
        .select('id, employee_id, period_id')
        .eq('company_id', companyId)
        .eq('is_stale', true)
        .limit(limitRecords);

      if (error) {
        throw error;
      }

      if (!staleRecords || staleRecords.length === 0) {
        console.log('✅ No hay registros stale para corregir');
        return { processed: 0, corrected: 0, failed: 0 };
      }

      console.log(`📊 Procesando ${staleRecords.length} registros obsoletos...`);

      let corrected = 0;
      let failed = 0;

      // Procesar por períodos únicos para eficiencia
      const uniquePeriods = [...new Set(staleRecords.map(r => r.period_id))];

      for (const periodId of uniquePeriods) {
        const periodRecords = staleRecords.filter(r => r.period_id === periodId);
        const employeeIds = periodRecords.map(r => r.employee_id);

        try {
          const { data: result, error: periodError } = await supabase.functions.invoke('reliquidate-period-adjustments', {
            body: {
              periodId,
              affectedEmployeeIds: employeeIds,
              justification: 'Corrección batch de registros obsoletos',
              options: {
                reliquidateScope: 'affected',
                regenerateVouchers: false,
                source: 'batch_correction'
              }
            }
          });

          if (periodError) {
            console.error(`❌ Error procesando período ${periodId}:`, periodError);
            failed += periodRecords.length;
          } else {
            console.log(`✅ Período ${periodId} corregido: ${periodRecords.length} empleados`);
            corrected += periodRecords.length;
          }
        } catch (periodError) {
          console.error(`❌ Error en período ${periodId}:`, periodError);
          failed += periodRecords.length;
        }
      }

      const result = {
        processed: staleRecords.length,
        corrected,
        failed
      };

      console.log('✅ Corrección batch completada:', result);
      return result;

    } catch (error) {
      console.error('❌ Error en fixAllStaleRecords:', error);
      throw error;
    }
  }
}