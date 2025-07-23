
import { useState, useCallback } from 'react';
import { usePayrollUnified } from './usePayrollUnified';
import { useToast } from '@/hooks/use-toast';
import { HistoryServiceAleluya } from '@/services/HistoryServiceAleluya';
import { PayrollLiquidationService } from '@/services/PayrollLiquidationService';

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
      console.log('🔄 Iniciando liquidación quincenal simplificada...');
      
      // Liquidar usando el flujo unificado (incluye consolidación de novedades)
      await payrollHook.liquidatePayroll(startDate, endDate);
      
      // Actualizar totales del período después de liquidar y consolidar
      if (payrollHook.currentPeriodId) {
        console.log('🔄 Actualizando totales del período post-consolidación...');
        await HistoryServiceAleluya.updatePeriodTotals(payrollHook.currentPeriodId);
        console.log('✅ Totales finales actualizados');
      }
      
      toast({
        title: "✅ Liquidación Quincenal Completada",
        description: "Nómina liquidada con novedades consolidadas y totales actualizados",
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
