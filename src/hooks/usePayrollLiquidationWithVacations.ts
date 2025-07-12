
import { useState, useCallback } from 'react';
import { usePayrollUnified } from './usePayrollUnified';
import { useVacationConflictDetection } from './useVacationConflictDetection';
import { ConflictResolution } from '@/components/vacation-integration/ConflictResolutionPanel';
import { useToast } from '@/hooks/use-toast';

export const usePayrollLiquidationWithVacations = (companyId: string) => {
  const [conflictDetectionStep, setConflictDetectionStep] = useState<'idle' | 'detecting' | 'resolving' | 'completed'>('idle');
  const { toast } = useToast();

  const payrollHook = usePayrollUnified(companyId);
  const conflictHook = useVacationConflictDetection();

  // Extender el método loadEmployees para incluir detección de conflictos
  const loadEmployeesWithConflictDetection = useCallback(async (
    startDate: string,
    endDate: string
  ) => {
    try {
      console.log('👥 Loading employees with vacation conflict detection...');
      setConflictDetectionStep('detecting');

      // 1. Detectar conflictos antes de cargar empleados
      const conflictReport = await conflictHook.detectConflicts(
        companyId,
        startDate,
        endDate,
        payrollHook.currentPeriodId
      );

      // 2. Si hay conflictos, pausar y mostrar panel de resolución
      if (conflictReport.hasConflicts) {
        console.log('⚠️ Conflicts detected, waiting for resolution...');
        setConflictDetectionStep('resolving');
        
        toast({
          title: "⚠️ Conflictos Detectados",
          description: "Se requiere resolver conflictos antes de continuar con la liquidación",
          variant: "destructive"
        });

        // No continuar hasta que se resuelvan los conflictos
        return false;
      }

      // 3. Si no hay conflictos, proceder normalmente
      setConflictDetectionStep('completed');
      await payrollHook.loadEmployees(startDate, endDate);
      
      console.log('✅ Employees loaded successfully without conflicts');
      return true;

    } catch (error) {
      console.error('❌ Error in loadEmployeesWithConflictDetection:', error);
      setConflictDetectionStep('idle');
      throw error;
    }
  }, [companyId, payrollHook, conflictHook, toast]);

  // Método para resolver conflictos y continuar con la carga
  const resolveConflictsAndContinue = useCallback(async (
    resolutions: ConflictResolution[],
    startDate: string,
    endDate: string
  ) => {
    try {
      console.log('🔧 Resolving conflicts and continuing...');
      setConflictDetectionStep('resolving');

      // 1. Resolver conflictos
      await conflictHook.resolveConflicts(resolutions);

      // 2. Continuar con la carga de empleados
      setConflictDetectionStep('completed');
      await payrollHook.loadEmployees(startDate, endDate);

      toast({
        title: "✅ Liquidación Lista",
        description: "Conflictos resueltos y empleados cargados exitosamente",
        className: "border-green-200 bg-green-50"
      });

      return true;
    } catch (error) {
      console.error('❌ Error resolving conflicts:', error);
      setConflictDetectionStep('idle');
      throw error;
    }
  }, [conflictHook, payrollHook, toast]);

  // Cancelar resolución de conflictos
  const cancelConflictResolution = useCallback(() => {
    setConflictDetectionStep('idle');
    conflictHook.clearConflictReport();
  }, [conflictHook]);

  // Reiniciar el proceso
  const resetConflictDetection = useCallback(() => {
    setConflictDetectionStep('idle');
    conflictHook.clearConflictReport();
  }, [conflictHook]);

  return {
    // Estado del proceso de liquidación extendido
    ...payrollHook,
    
    // Estado de detección de conflictos
    conflictDetectionStep,
    conflictReport: conflictHook.conflictReport,
    hasConflicts: conflictHook.hasConflicts,
    isDetectingConflicts: conflictHook.isDetecting,
    isResolvingConflicts: conflictHook.isResolving,
    
    // Métodos extendidos
    loadEmployees: loadEmployeesWithConflictDetection,
    resolveConflictsAndContinue,
    cancelConflictResolution,
    resetConflictDetection,
    
    // Estados calculados
    canProceedWithLiquidation: conflictDetectionStep === 'completed' && payrollHook.employees.length > 0,
    needsConflictResolution: conflictDetectionStep === 'resolving' && conflictHook.hasConflicts,
    isLoadingWithConflicts: conflictDetectionStep === 'detecting' || conflictHook.isDetecting
  };
};
