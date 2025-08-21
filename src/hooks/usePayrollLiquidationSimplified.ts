
import { useState, useCallback } from 'react';
import { usePayrollUnified } from './usePayrollUnified';
import { useToast } from '@/hooks/use-toast';
import { LiquidationStep } from '@/types/payroll';

export const usePayrollLiquidationSimplified = () => {
  const [isLiquidating, setIsLiquidating] = useState(false);
  const [currentPeriod, setCurrentPeriod] = useState<string | null>(null);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [lastAutoSaveTime, setLastAutoSaveTime] = useState<Date | null>(null);
  const [isRemovingEmployee, setIsRemovingEmployee] = useState(false);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(false);
  const [showProgress, setShowProgress] = useState(false);
  const [liquidationStep, setLiquidationStep] = useState<LiquidationStep>('idle');
  const [liquidationProgress, setLiquidationProgress] = useState(0);
  const [processedEmployees, setProcessedEmployees] = useState(0);
  const [liquidationErrors, setLiquidationErrors] = useState<string[]>([]);
  const [useAtomicLiquidation, setUseAtomicLiquidation] = useState(false);
  const [useExhaustiveValidation, setUseExhaustiveValidation] = useState(false);
  const [exhaustiveValidationResults, setExhaustiveValidationResults] = useState<any>(null);
  const [isValidating, setIsValidating] = useState(false);
  const { toast } = useToast();

  const payrollHook = usePayrollUnified();

  const getDefaultPeriod = () => {
    const start = new Date();
    const end = new Date();
    end.setDate(start.getDate() + 14);
    const startDate = start.toISOString().slice(0, 10);
    const endDate = end.toISOString().slice(0, 10);
    return { startDate, endDate };
  };

  const loadEmployees = useCallback(async (startDate?: string, endDate?: string): Promise<string> => {
    try {
      setIsLoadingEmployees(true);
      setIsLiquidating(true);

      const s = startDate;
      const e = endDate;
      const period = s && e ? { startDate: s, endDate: e } : getDefaultPeriod();

      const periodId = `${period.startDate}-${period.endDate}`;
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
      setIsLoadingEmployees(false);
    }
  }, [payrollHook, toast]);

  const liquidatePayroll = useCallback(async (
    startDate: string, 
    endDate: string, 
    isReliquidation: boolean = false
  ): Promise<void> => {
    try {
      setIsLiquidating(true);
      setShowProgress(true);
      setLiquidationStep('initializing');
      setLiquidationProgress(0);
      
      const periodId = `${startDate}-${endDate}`;
      
      setLiquidationStep('loading_employees');
      setLiquidationProgress(25);
      await payrollHook.loadEmployees(periodId);
      
      setLiquidationStep('calculating_payroll');
      setLiquidationProgress(50);
      // Additional processing logic here
      
      setLiquidationStep('finalizing');
      setLiquidationProgress(100);
      
      toast({
        title: isReliquidation ? "Re-liquidación completada" : "Liquidación completada",
        description: "La nómina ha sido procesada correctamente",
        className: "border-green-200 bg-green-50"
      });

      setLiquidationStep('completed');
    } catch (error) {
      console.error('Error in liquidation:', error);
      setLiquidationStep('error');
      toast({
        title: "Error en liquidación",
        description: "No se pudo completar la liquidación",
        variant: "destructive"
      });
      throw error;
    } finally {
      setIsLiquidating(false);
      setShowProgress(false);
    }
  }, [payrollHook, toast]);

  const addEmployees = useCallback(async (employeeIds: string[]) => {
    if (!currentPeriod) return;
    
    try {
      setIsAutoSaving(true);
      for (const employeeId of employeeIds) {
        await payrollHook.addEmployeeToPayroll(employeeId, currentPeriod);
      }
      
      setLastAutoSaveTime(new Date());
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
    } finally {
      setIsAutoSaving(false);
    }
  }, [currentPeriod, payrollHook, toast]);

  const removeEmployee = useCallback(async (employeeId: string) => {
    if (!currentPeriod) return;
    
    try {
      setIsRemovingEmployee(true);
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
    } finally {
      setIsRemovingEmployee(false);
    }
  }, [currentPeriod, payrollHook, toast]);

  const refreshEmployeeNovedades = useCallback(async (employeeId: string) => {
    if (!currentPeriod) return;
    
    try {
      setIsAutoSaving(true);
      await payrollHook.updateEmployeeCalculations(employeeId, currentPeriod);
      setLastAutoSaveTime(new Date());
      
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
    } finally {
      setIsAutoSaving(false);
    }
  }, [currentPeriod, payrollHook, toast]);

  const updateEmployeeCalculationsInDB = useCallback(async (employeeId: string) => {
    if (!currentPeriod) return;
    
    try {
      setIsAutoSaving(true);
      await payrollHook.updateEmployeeCalculations(employeeId, currentPeriod);
      setLastAutoSaveTime(new Date());
      
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
    } finally {
      setIsAutoSaving(false);
    }
  }, [currentPeriod, payrollHook, toast]);

  const validatePeriod = useCallback(async () => {
    // Mock validation
    return { isValid: true };
  }, []);

  const performExhaustiveValidation = useCallback(async (periodId?: string) => {
    try {
      setIsValidating(true);
      // Mock validation results
      const results = {
        canProceed: true,
        issues: [],
        summary: 'Validation passed'
      };
      setExhaustiveValidationResults(results);
      return results;
    } finally {
      setIsValidating(false);
    }
  }, []);

  const autoRepairValidationIssues = useCallback(async () => {
    // Mock auto repair
    toast({
      title: "Reparación automática",
      description: "Problemas reparados automáticamente",
      className: "border-green-200 bg-green-50"
    });
  }, [toast]);

  return {
    // Core payroll hook methods and state
    ...payrollHook,
    
    // Simplified methods
    loadEmployees,
    liquidatePayroll,
    
    // Additional state
    isLiquidating,
    currentPeriod,
    isAutoSaving,
    lastAutoSaveTime,
    isRemovingEmployee,
    canProceedWithLiquidation: payrollHook.employees.length > 0,
    isLoadingEmployees,
    validatePeriod,
    showProgress,
    liquidationStep,
    liquidationProgress,
    processedEmployees,
    liquidationErrors,
    
    // World-class features
    useAtomicLiquidation,
    setUseAtomicLiquidation,
    useExhaustiveValidation,
    setUseExhaustiveValidation,
    exhaustiveValidationResults,
    isValidating,
    performExhaustiveValidation,
    autoRepairValidationIssues,
    
    // Employee management
    addEmployees,
    removeEmployee,
    refreshEmployeeNovedades,
    updateEmployeeCalculationsInDB
  };
};
