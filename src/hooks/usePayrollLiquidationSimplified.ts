
import { useState, useCallback } from 'react';
import { usePayrollUnified } from './usePayrollUnified';
import { useToast } from '@/hooks/use-toast';

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

  return {
    // Estado del proceso de liquidación
    ...payrollHook,
    
    // Método simplificado
    loadEmployees,
    
    // Estado calculado
    canProceedWithLiquidation: payrollHook.employees.length > 0,
    isLoadingEmployees: payrollHook.isLoading,
    
    // Propiedades faltantes con valores por defecto
    isAutoSaving: false,
    lastAutoSaveTime: undefined,
    isRemovingEmployee: false
  };
};
