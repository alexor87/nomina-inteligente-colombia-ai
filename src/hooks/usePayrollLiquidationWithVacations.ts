
import { useState, useCallback } from 'react';
import { usePayrollUnified } from './usePayrollUnified';
import { useVacationConflictDetection } from './useVacationConflictDetection';
import { useVacationIntegration } from './useVacationIntegration';
import { ConflictResolution } from '@/components/vacation-integration/ConflictResolutionPanel';
import { useToast } from '@/hooks/use-toast';

export const usePayrollLiquidationWithVacations = (companyId: string) => {
  const [conflictDetectionStep, setConflictDetectionStep] = useState<'idle' | 'detecting' | 'resolving' | 'completed'>('idle');
  const { toast } = useToast();

  const payrollHook = usePayrollUnified();
  const conflictHook = useVacationConflictDetection();
  const integrationHook = useVacationIntegration();

  // ✅ NUEVO: Método principal con integración automática completa
  const loadEmployeesWithConflictDetection = useCallback(async (
    startDate: string,
    endDate: string
  ) => {
    try {
      console.log('👥 Loading employees with complete vacation integration...');
      setConflictDetectionStep('detecting');

      // 1. Detectar conflictos antes de cargar empleados (con manejo robusto de errores)
      let conflictReport;
      try {
        conflictReport = await conflictHook.detectConflicts(
          companyId,
          startDate,
          endDate,
          payrollHook.currentPeriodId
        );
      } catch (conflictError) {
        console.warn('⚠️ Conflict detection failed, continuing without conflict check:', conflictError);
        // Continuar sin detección de conflictos
        conflictReport = {
          hasConflicts: false,
          totalConflicts: 0,
          conflictGroups: [],
          summary: { duplicates: 0, overlaps: 0, typeMismatches: 0 }
        };
      }

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

      // 3. Si no hay conflictos, proceder con integración automática
      setConflictDetectionStep('completed');
      
      // ✅ USAR EL NUEVO MÉTODO CON INTEGRACIÓN AUTOMÁTICA
      const periodId = `${startDate}-${endDate}`;
      await payrollHook.loadEmployees(periodId);
      
      console.log('✅ Employees loaded successfully with vacation integration');
      
      toast({
        title: "✅ Carga Completada",
        description: "Empleados cargados con integración automática de ausencias",
        className: "border-green-200 bg-green-50"
      });
      
      return true;

    } catch (error) {
      console.error('❌ Error in loadEmployeesWithConflictDetection:', error);
      setConflictDetectionStep('idle');
      
      // En caso de error, intentar cargar empleados sin detección de conflictos
      try {
        console.log('🔄 Fallback: Loading employees without conflict detection...');
        const periodId = `${startDate}-${endDate}`;
        await payrollHook.loadEmployees(periodId);
        
        toast({
          title: "⚠️ Carga con Advertencia",
          description: "Empleados cargados sin verificación de conflictos",
          variant: "destructive"
        });
        
        setConflictDetectionStep('completed');
        return true;
      } catch (fallbackError) {
        console.error('❌ Fallback also failed:', fallbackError);
        throw error;
      }
    }
  }, [companyId, payrollHook, conflictHook, integrationHook, toast]);

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
      const success = await conflictHook.resolveConflicts(resolutions);
      
      if (!success) {
        throw new Error('Failed to resolve conflicts');
      }

      // 2. Continuar con la carga de empleados + integración automática
      setConflictDetectionStep('completed');
      const periodId = `${startDate}-${endDate}`;
      await payrollHook.loadEmployees(periodId);

      toast({
        title: "✅ Liquidación Lista",
        description: "Conflictos resueltos y empleados cargados con integración automática",
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
    // Estado del proceso de liquidación extendido (incluye modal de éxito)
    ...payrollHook,
    
    // Estado de detección de conflictos
    conflictDetectionStep,
    conflictReport: conflictHook.conflictReport,
    hasConflicts: conflictHook.hasConflicts,
    isDetectingConflicts: conflictHook.isDetecting,
    isResolvingConflicts: conflictHook.isResolving,
    
    // Estado de integración
    isProcessingVacations: integrationHook.isProcessing,
    lastIntegrationResult: integrationHook.lastResult,
    
    // Métodos extendidos - ✅ USAR EL NUEVO MÉTODO PRINCIPAL
    loadEmployees: loadEmployeesWithConflictDetection,
    resolveConflictsAndContinue,
    cancelConflictResolution,
    resetConflictDetection,
    
    // Estados calculados
    canProceedWithLiquidation: conflictDetectionStep === 'completed' && payrollHook.employees.length > 0,
    needsConflictResolution: conflictDetectionStep === 'resolving' && conflictHook.hasConflicts,
    isLoadingWithConflicts: conflictDetectionStep === 'detecting' || conflictHook.isDetecting || integrationHook.isProcessing
  };
};
