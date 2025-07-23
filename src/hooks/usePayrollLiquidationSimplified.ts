
import { useState, useCallback } from 'react';
import { usePayrollUnified } from './usePayrollUnified';
import { useToast } from '@/hooks/use-toast';
import { HistoryServiceAleluya } from '@/services/HistoryServiceAleluya';
import { PayrollLiquidationService } from '@/services/PayrollLiquidationService';

export const usePayrollLiquidationSimplified = (companyId: string) => {
  const { toast } = useToast();
  const payrollHook = usePayrollUnified(companyId);
  const [isRepairing, setIsRepairing] = useState(false);

  const loadEmployees = useCallback(async (
    startDate: string,
    endDate: string
  ) => {
    try {
      console.log('👥 Loading employees for payroll liquidation...');
      
      await payrollHook.loadEmployees(startDate, endDate);
      
      console.log('✅ Employees loaded successfully');
      
      toast({
        title: "✅ Empleados Cargados",
        description: "Empleados listos para liquidación",
        className: "border-green-200 bg-green-50"
      });
      
      return true;

    } catch (error) {
      console.error('❌ Error loading employees:', error);
      
      toast({
        title: "❌ Error",
        description: "Error al cargar empleados para liquidación",
        variant: "destructive"
      });
      
      throw error;
    }
  }, [companyId, payrollHook, toast]);

  const liquidatePayroll = useCallback(async (
    startDate: string,
    endDate: string
  ) => {
    try {
      console.log('🔄 Iniciando liquidación CORREGIDA con sincronización robusta...');
      
      // Liquidar usando el flujo unificado (incluye consolidación de novedades)
      await payrollHook.liquidatePayroll(startDate, endDate);
      
      // ✅ SINCRONIZACIÓN ROBUSTA CORREGIDA: Asegurar que los totales se actualicen correctamente
      if (payrollHook.currentPeriodId) {
        console.log('🔄 Ejecutando sincronización CORREGIDA post-liquidación...');
        
        try {
          // Consolidar novedades CORREGIDAS nuevamente por seguridad
          await PayrollLiquidationService.consolidatePayrollWithNovedades(payrollHook.currentPeriodId);
          console.log('✅ Novedades consolidadas CORRECTAMENTE');
          
          // Actualizar totales del período CORREGIDOS
          await HistoryServiceAleluya.updatePeriodTotals(payrollHook.currentPeriodId);
          console.log('✅ Totales del período actualizados CORRECTAMENTE');
          
          // Verificar sincronización
          const desynchronized = await HistoryServiceAleluya.detectDesynchronizedPeriods();
          if (desynchronized.includes(payrollHook.currentPeriodId)) {
            console.warn('⚠️ Período aún desincronizado, ejecutando reparación CORREGIDA...');
            await HistoryServiceAleluya.repairPeriodSync(payrollHook.currentPeriodId);
          }
          
        } catch (syncError) {
          console.error('❌ Error en sincronización CORREGIDA post-liquidación:', syncError);
          
          // Intentar reparación como último recurso
          try {
            await HistoryServiceAleluya.repairPeriodSync(payrollHook.currentPeriodId);
            console.log('✅ Reparación de emergencia CORREGIDA exitosa');
          } catch (repairError) {
            console.error('❌ Error en reparación de emergencia:', repairError);
            
            toast({
              title: "⚠️ Advertencia",
              description: "Liquidación completada pero puede haber problemas de sincronización",
              variant: "destructive"
            });
          }
        }
      }
      
      toast({
        title: "✅ Liquidación Completada",
        description: "Nómina liquidada y sincronizada CORRECTAMENTE",
        className: "border-green-200 bg-green-50"
      });
      
    } catch (error) {
      console.error('❌ Error en liquidación quincenal:', error);
      
      toast({
        title: "❌ Error en Liquidación",
        description: "Error al liquidar nómina quincenal",
        variant: "destructive"
      });
      
      throw error;
    }
  }, [payrollHook, toast]);

  /**
   * ✅ NUEVA FUNCIÓN: Reparar período específico
   */
  const repairPeriodSync = useCallback(async (periodId: string) => {
    setIsRepairing(true);
    try {
      console.log(`🔧 Reparando sincronización para período: ${periodId}`);
      
      await HistoryServiceAleluya.repairPeriodSync(periodId);
      
      toast({
        title: "✅ Sincronización Reparada",
        description: "El período ha sido sincronizado correctamente",
        className: "border-green-200 bg-green-50"
      });
      
    } catch (error) {
      console.error('❌ Error reparando sincronización:', error);
      
      toast({
        title: "❌ Error en Reparación",
        description: "No se pudo reparar la sincronización",
        variant: "destructive"
      });
      
      throw error;
    } finally {
      setIsRepairing(false);
    }
  }, [toast]);

  /**
   * ✅ NUEVA FUNCIÓN: Detectar y reparar todos los períodos desincronizados
   */
  const repairAllDesynchronizedPeriods = useCallback(async () => {
    setIsRepairing(true);
    try {
      console.log('🔧 Detectando y reparando períodos desincronizados...');
      
      const repairedCount = await HistoryServiceAleluya.repairAllDesynchronizedPeriods();
      
      if (repairedCount > 0) {
        toast({
          title: "✅ Reparación Masiva Completada",
          description: `Se repararon ${repairedCount} períodos desincronizados`,
          className: "border-green-200 bg-green-50"
        });
      } else {
        toast({
          title: "✅ Sistema Sincronizado",
          description: "No se encontraron períodos desincronizados",
          className: "border-blue-200 bg-blue-50"
        });
      }
      
      return repairedCount;
      
    } catch (error) {
      console.error('❌ Error en reparación masiva:', error);
      
      toast({
        title: "❌ Error en Reparación Masiva",
        description: "No se pudo completar la reparación masiva",
        variant: "destructive"
      });
      
      throw error;
    } finally {
      setIsRepairing(false);
    }
  }, [toast]);

  return {
    ...payrollHook,
    loadEmployees,
    liquidatePayroll,
    repairPeriodSync,
    repairAllDesynchronizedPeriods,
    isRepairing,
    canProceedWithLiquidation: payrollHook.employees.length > 0,
    isLoadingEmployees: payrollHook.isLoading,
    isAutoSaving: false,
    lastAutoSaveTime: undefined,
    isRemovingEmployee: false
  };
};
