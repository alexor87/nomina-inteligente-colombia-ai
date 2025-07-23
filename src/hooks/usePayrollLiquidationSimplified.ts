
import { useState, useCallback } from 'react';
import { usePayrollUnified } from './usePayrollUnified';
import { useToast } from '@/hooks/use-toast';
import { HistoryServiceAleluya } from '@/services/HistoryServiceAleluya';

export const usePayrollLiquidationSimplified = (companyId: string) => {
  const { toast } = useToast();
  const payrollHook = usePayrollUnified(companyId);

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
      console.log('🔄 Iniciando liquidación de nómina...');
      
      await payrollHook.liquidatePayroll(startDate, endDate);
      
      // Actualizar totales del período después de liquidar
      if (payrollHook.currentPeriodId) {
        console.log('🔄 Actualizando totales del período...');
        await HistoryServiceAleluya.updatePeriodTotals(payrollHook.currentPeriodId);
        console.log('✅ Totales actualizados');
      }
      
      toast({
        title: "✅ Liquidación Completada",
        description: "Nómina liquidada y totales actualizados",
        className: "border-green-200 bg-green-50"
      });
      
    } catch (error) {
      console.error('❌ Error en liquidación:', error);
      
      toast({
        title: "❌ Error",
        description: "Error al liquidar nómina",
        variant: "destructive"
      });
      
      throw error;
    }
  }, [payrollHook, toast]);

  return {
    ...payrollHook,
    loadEmployees,
    liquidatePayroll,
    canProceedWithLiquidation: payrollHook.employees.length > 0,
    isLoadingEmployees: payrollHook.isLoading,
    isAutoSaving: false,
    lastAutoSaveTime: undefined,
    isRemovingEmployee: false
  };
};
