
import { useState, useCallback } from 'react';
import { usePayrollUnified } from './usePayrollUnified';
import { useToast } from '@/hooks/use-toast';
import { HistoryServiceAleluya } from '@/services/HistoryServiceAleluya';

export const usePayrollLiquidationSimplified = (companyId: string) => {
  const { toast } = useToast();
  const payrollHook = usePayrollUnified(companyId);

  // ✅ MÉTODO PRINCIPAL SIMPLIFICADO: Solo cargar empleados y usar novedades
  const loadEmployees = useCallback(async (
    startDate: string,
    endDate: string
  ) => {
    try {
      console.log('👥 Loading employees for payroll liquidation...');
      
      // Cargar empleados directamente - las novedades se cargan automáticamente
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

  // ✅ MÉTODO DE LIQUIDACIÓN MEJORADO: Actualizar totales después de liquidar
  const liquidatePayroll = useCallback(async (
    startDate: string,
    endDate: string
  ) => {
    try {
      console.log('🔄 Iniciando liquidación de nómina...');
      
      // Ejecutar liquidación original
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
    // Estado del proceso de liquidación
    ...payrollHook,
    
    // Métodos actualizados
    loadEmployees,
    liquidatePayroll,
    
    // Estado calculado
    canProceedWithLiquidation: payrollHook.employees.length > 0,
    isLoadingEmployees: payrollHook.isLoading,
    
    // Propiedades faltantes con valores por defecto
    isAutoSaving: false,
    lastAutoSaveTime: undefined,
    isRemovingEmployee: false
  };
};
