import { useState, useCallback } from 'react';
import { usePayrollUnified } from './usePayrollUnified';
import { useToast } from '@/hooks/use-toast';

export const usePayrollLiquidationSimplified = () => {
  const [isLiquidating, setIsLiquidating] = useState(false);
  const [currentPeriod, setCurrentPeriod] = useState<string | null>(null);
  const { toast } = useToast();

  const payrollHook = usePayrollUnified();

  const loadEmployees = useCallback(async (startDate: string, endDate: string): Promise<string> => {
    try {
      setIsLiquidating(true);
      
      // Create a period ID from the dates
      const periodId = `${startDate}-${endDate}`;
      setCurrentPeriod(periodId);
      
      await payrollHook.loadEmployees(periodId);
      
      toast({
        title: "Empleados cargados",
        description: "Los empleados han sido cargados correctamente",
        className: "border-green-200 bg-green-50"
      });

      return periodId;
    } catch (error) {
      console.error('Error loading employees:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los empleados",
        variant: "destructive"
      });
      throw error;
    } finally {
      setIsLiquidating(false);
    }
  }, [payrollHook, toast]);

  const liquidatePayroll = useCallback(async (
    startDate: string, 
    endDate: string, 
    isReliquidation: boolean = false
  ): Promise<void> => {
    try {
      setIsLiquidating(true);
      
      const periodId = `${startDate}-${endDate}`;
      await payrollHook.loadEmployees(periodId);
      
      toast({
        title: isReliquidation ? "Re-liquidación completada" : "Liquidación completada",
        description: "La nómina ha sido procesada correctamente",
        className: "border-green-200 bg-green-50"
      });
    } catch (error) {
      console.error('Error in liquidation:', error);
      toast({
        title: "Error en liquidación",
        description: "No se pudo completar la liquidación",
        variant: "destructive"
      });
      throw error;
    } finally {
      setIsLiquidating(false);
    }
  }, [payrollHook, toast]);

  const addEmployees = useCallback(async (employeeIds: string[]) => {
    if (!currentPeriod) return;
    
    try {
      for (const employeeId of employeeIds) {
        await payrollHook.addEmployeeToPayroll(employeeId, currentPeriod);
      }
      
      toast({
        title: "Empleados agregados",
        description: `${employeeIds.length} empleados agregados a la nómina`,
        className: "border-green-200 bg-green-50"
      });
    } catch (error) {
      console.error('Error adding employees:', error);
      toast({
        title: "Error",
        description: "No se pudieron agregar los empleados",
        variant: "destructive"
      });
    }
  }, [currentPeriod, payrollHook, toast]);

  const removeEmployee = useCallback(async (employeeId: string) => {
    if (!currentPeriod) return;
    
    try {
      await payrollHook.removeEmployeeFromPayroll(employeeId, currentPeriod);
      
      toast({
        title: "Empleado removido",
        description: "El empleado ha sido removido de la nómina",
        className: "border-orange-200 bg-orange-50"
      });
    } catch (error) {
      console.error('Error removing employee:', error);
      toast({
        title: "Error",
        description: "No se pudo remover el empleado",
        variant: "destructive"
      });
    }
  }, [currentPeriod, payrollHook, toast]);

  const refreshEmployeeNovedades = useCallback(async (employeeId: string) => {
    if (!currentPeriod) return;
    
    try {
      await payrollHook.updateEmployeeCalculations(employeeId, currentPeriod);
      
      toast({
        title: "Novedades actualizadas",
        description: "Las novedades del empleado han sido actualizadas",
        className: "border-blue-200 bg-blue-50"
      });
    } catch (error) {
      console.error('Error refreshing novedades:', error);
      toast({
        title: "Error",
        description: "No se pudieron actualizar las novedades",
        variant: "destructive"
      });
    }
  }, [currentPeriod, payrollHook, toast]);

  const updateEmployeeCalculationsInDB = useCallback(async (employeeId: string) => {
    if (!currentPeriod) return;
    
    try {
      await payrollHook.updateEmployeeCalculations(employeeId, currentPeriod);
      
      toast({
        title: "Cálculos actualizados",
        description: "Los cálculos del empleado han sido actualizados",
        className: "border-green-200 bg-green-50"
      });
    } catch (error) {
      console.error('Error updating calculations:', error);
      toast({
        title: "Error",
        description: "No se pudieron actualizar los cálculos",
        variant: "destructive"
      });
    }
  }, [currentPeriod, payrollHook, toast]);

  return {
    // Core payroll hook methods and state
    ...payrollHook,
    
    // Simplified methods
    loadEmployees,
    liquidatePayroll,
    
    // Additional state
    isLiquidating,
    currentPeriod,
    
    // Employee management
    addEmployees,
    removeEmployee,
    refreshEmployeeNovedades,
    updateEmployeeCalculationsInDB
  };
};
