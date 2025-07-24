
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
      console.log('🔄 Iniciando liquidación CORREGIDA...');
      
      await payrollHook.liquidatePayroll(startDate, endDate);
      
      // ✅ CORREGIDO: Usar HistoryServiceAleluya para sincronización
      if (payrollHook.currentPeriodId) {
        console.log('🔄 Ejecutando sincronización post-liquidación...');
        
        try {
          await HistoryServiceAleluya.consolidatePayrollWithNovedades(payrollHook.currentPeriodId);
          console.log('✅ Novedades consolidadas');
          
          await HistoryServiceAleluya.updatePeriodTotals(payrollHook.currentPeriodId);
          console.log('✅ Totales actualizados');
          
        } catch (syncError) {
          console.error('❌ Error en sincronización:', syncError);
          
          try {
            await HistoryServiceAleluya.repairPeriodSync(payrollHook.currentPeriodId);
            console.log('✅ Reparación de emergencia exitosa');
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
        description: "Nómina liquidada y sincronizada correctamente",
        className: "border-green-200 bg-green-50"
      });
      
    } catch (error) {
      console.error('❌ Error en liquidación:', error);
      
      toast({
        title: "❌ Error en Liquidación",
        description: "Error al liquidar nómina",
        variant: "destructive"
      });
      
      throw error;
    }
  }, [payrollHook, toast]);

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
    isRemovingEmployee: false,
    // ✅ NUEVO: Exponer función de persistencia para preliquidación
    updateEmployeeCalculationsInDB: payrollHook.updateEmployeeCalculationsInDB
  };
};
