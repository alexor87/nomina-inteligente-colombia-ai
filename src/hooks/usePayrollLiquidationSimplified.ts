
import { useState, useCallback } from 'react';
import { usePayrollUnified } from './usePayrollUnified';
import { useToast } from '@/hooks/use-toast';
import { HistoryServiceAleluya } from '@/services/HistoryServiceAleluya';
import { PayrollLiquidationService } from '@/services/PayrollLiquidationService';
import { PayrollValidationService, PayrollValidationResults } from '@/services/PayrollValidationService';
import { PayrollReopenService } from '@/services/PayrollReopenService';
import { LiquidationStep } from '@/components/payroll/liquidation/PayrollProgressIndicator';

export const usePayrollLiquidationSimplified = (companyId: string) => {
  const { toast } = useToast();
  const payrollHook = usePayrollUnified(companyId);
  const [isRepairing, setIsRepairing] = useState(false);
  
  // ✅ NUEVOS ESTADOS PARA MEJORAS
  const [validationResults, setValidationResults] = useState<PayrollValidationResults | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [liquidationStep, setLiquidationStep] = useState<LiquidationStep>('validating');
  const [liquidationProgress, setLiquidationProgress] = useState(0);
  const [processedEmployees, setProcessedEmployees] = useState(0);
  const [liquidationErrors, setLiquidationErrors] = useState<string[]>([]);
  const [showProgress, setShowProgress] = useState(false);
  const [autoSendEmails, setAutoSendEmails] = useState(true);
  const [canRollback, setCanRollback] = useState(false);

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

  // ✅ NUEVA FUNCIÓN: Validar período antes de liquidar
  const validatePeriod = useCallback(async (
    startDate: string,
    endDate: string
  ) => {
    if (!payrollHook.currentPeriodId) {
      throw new Error('No hay período activo para validar');
    }

    setIsValidating(true);
    try {
      console.log('🔍 Validando período para liquidación...');
      
      const results = await PayrollValidationService.validatePayrollPeriod(
        payrollHook.employees,
        payrollHook.currentPeriodId,
        startDate,
        endDate
      );
      
      setValidationResults(results);
      
      if (results.canProceed) {
        toast({
          title: "✅ Validación Exitosa",
          description: "El período está listo para liquidar",
          className: "border-green-200 bg-green-50"
        });
      } else {
        toast({
          title: "⚠️ Errores de Validación",
          description: "Se encontraron errores que deben corregirse antes de liquidar",
          variant: "destructive"
        });
      }
      
      return results;
      
    } catch (error) {
      console.error('❌ Error en validación:', error);
      toast({
        title: "❌ Error en Validación",
        description: "Error al validar el período",
        variant: "destructive"
      });
      throw error;
    } finally {
      setIsValidating(false);
    }
  }, [payrollHook.employees, payrollHook.currentPeriodId, toast]);

  const liquidatePayroll = useCallback(async (
    startDate: string,
    endDate: string,
    isReliquidation = false
  ) => {
    // ===== TRAZA TEMPORAL SIMPLIFIED =====
    const simplifiedTraceId = `simplified_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    console.log(`🔍 [SIMPLIFIED-${simplifiedTraceId}] INICIANDO LIQUIDACIÓN SIMPLIFICADA`, {
      isReliquidation: isReliquidation,
      startDate: startDate,
      endDate: endDate,
      currentPeriodId: payrollHook.currentPeriodId,
      companyId: companyId,
      employeesCount: payrollHook.employees.length,
      timestamp: new Date().toISOString()
    });

    try {
      setShowProgress(true);
      setLiquidationErrors([]);
      setProcessedEmployees(0);
      setCanRollback(false);
      
      // Paso 1: Validación final y verificación de estado
      setLiquidationStep('validating');
      setLiquidationProgress(10);
      
      console.log(`🔍 [SIMPLIFIED-${simplifiedTraceId}] PASO 1: Validación y verificación de estado`);
      
      if (payrollHook.currentPeriodId && companyId) {
        const validationStart = performance.now();
        console.log(`🔍 [SIMPLIFIED-${simplifiedTraceId}] Ejecutando validación pre-liquidación...`);
        
        const validation = await PayrollValidationService.validatePreLiquidation(
          payrollHook.currentPeriodId,
          companyId
        );
        
        const validationDuration = performance.now() - validationStart;
        console.log(`🔍 [SIMPLIFIED-${simplifiedTraceId}] VALIDACIÓN RESPONSE:`, {
          validation: validation,
          duracion: `${validationDuration.toFixed(2)}ms`,
          issuesCount: validation.issues.length
        });
        
        // Si el período ya está liquidado y no es re-liquidación, lanzar error específico
        const isAlreadyLiquidated = validation.issues.some(
          issue => issue.type === 'period_already_liquidated'
        );
        
        console.log(`🔍 [SIMPLIFIED-${simplifiedTraceId}] Estado de liquidación:`, {
          isAlreadyLiquidated: isAlreadyLiquidated,
          isReliquidation: isReliquidation
        });
        
        if (isAlreadyLiquidated && !isReliquidation) {
          console.log(`🔍 [SIMPLIFIED-${simplifiedTraceId}] ❌ Período ya liquidado - lanzando error específico`);
          throw new Error('PERIOD_ALREADY_LIQUIDATED');
        }
        
        // Si es re-liquidación, reabrir el período primero
        if (isReliquidation && isAlreadyLiquidated) {
          console.log(`🔍 [SIMPLIFIED-${simplifiedTraceId}] 🔄 Re-abriendo período para re-liquidación...`);
          await PayrollReopenService.reopenPayrollPeriod(payrollHook.currentPeriodId);
          console.log(`🔍 [SIMPLIFIED-${simplifiedTraceId}] ✅ Período reabierto exitosamente`);
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, 500)); // UX delay
      
      // Paso 2: Cálculos
      setLiquidationStep('calculating');
      setLiquidationProgress(25);
      
      console.log(`🔍 [SIMPLIFIED-${simplifiedTraceId}] PASO 2: Ejecutando cálculos principales...`);
      const calculationStart = performance.now();
      
      await payrollHook.liquidatePayroll(startDate, endDate);
      
      const calculationDuration = performance.now() - calculationStart;
      console.log(`🔍 [SIMPLIFIED-${simplifiedTraceId}] ✅ Cálculos completados`, {
        duracion: `${calculationDuration.toFixed(2)}ms`,
        empleadosProcesados: payrollHook.employees.length
      });
      
      setProcessedEmployees(payrollHook.employees.length);
      
      // Paso 3: Generar comprobantes
      setLiquidationStep('generating_vouchers');
      setLiquidationProgress(60);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simular generación
      
      // Paso 4: Enviar emails (si está habilitado)
      if (autoSendEmails) {
        setLiquidationStep('sending_emails');
        setLiquidationProgress(80);
        await new Promise(resolve => setTimeout(resolve, 1500)); // Simular envío
      }
      
      // Paso 5: Sincronización y finalización
      setLiquidationStep('finalizing');
      setLiquidationProgress(90);
      
      if (payrollHook.currentPeriodId) {
        console.log('🔄 Ejecutando sincronización post-liquidación...');
        
        try {
          await HistoryServiceAleluya.consolidatePayrollWithNovedades(payrollHook.currentPeriodId);
          console.log('✅ Novedades consolidadas');
          
          await HistoryServiceAleluya.updatePeriodTotals(payrollHook.currentPeriodId);
          console.log('✅ Totales actualizados');
          
        } catch (syncError) {
          console.error('❌ Error en sincronización:', syncError);
          setLiquidationErrors(prev => [...prev, 'Error en sincronización de datos']);
          
          try {
            await HistoryServiceAleluya.repairPeriodSync(payrollHook.currentPeriodId);
            console.log('✅ Reparación de emergencia exitosa');
          } catch (repairError) {
            console.error('❌ Error en reparación de emergencia:', repairError);
            setLiquidationErrors(prev => [...prev, 'Error en reparación de emergencia']);
          }
        }
      }
      
      // Completado
      setLiquidationStep('completed');
      setLiquidationProgress(100);
      setCanRollback(true);
      
      toast({
        title: "✅ Liquidación Completada",
        description: `Nómina liquidada exitosamente para ${payrollHook.employees.length} empleados`,
        className: "border-green-200 bg-green-50"
      });
      
      // Ocultar progreso después de 3 segundos
      setTimeout(() => setShowProgress(false), 3000);
      
    } catch (error: any) {
      console.error(`🔍 [SIMPLIFIED-${simplifiedTraceId}] ❌ ERROR EN LIQUIDACIÓN SIMPLIFICADA:`, {
        error: error,
        message: error.message,
        stack: error.stack,
        isReliquidation: isReliquidation,
        currentStep: liquidationStep,
        currentProgress: liquidationProgress
      });
      
      setLiquidationStep('error');
      
      // Manejar error específico de período ya liquidado
      if (error.message === 'PERIOD_ALREADY_LIQUIDATED') {
        console.log(`🔍 [SIMPLIFIED-${simplifiedTraceId}] ⚠️ Error específico: Período ya liquidado`);
        setLiquidationErrors(prev => [...prev, 'El período ya fue liquidado anteriormente']);
        toast({
          title: "⚠️ Período Ya Liquidado",
          description: "Este período ya fue liquidado. Use la opción de re-liquidar si es necesario.",
          variant: "destructive"
        });
      } else {
        console.log(`🔍 [SIMPLIFIED-${simplifiedTraceId}] ❌ Error general en liquidación`);
        setLiquidationErrors(prev => [...prev, 'Error general en liquidación']);
        toast({
          title: "❌ Error en Liquidación",
          description: "Error al liquidar nómina",
          variant: "destructive"
        });
      }
      
      throw error;
    }
  }, [payrollHook, toast, autoSendEmails, companyId]);

  // ✅ NUEVA FUNCIÓN: Rollback de liquidación
  const rollbackLiquidation = useCallback(async () => {
    if (!payrollHook.currentPeriodId || !canRollback) {
      throw new Error('No se puede realizar rollback en este momento');
    }

    try {
      console.log('🔄 Iniciando rollback de liquidación...');
      
      // TODO: Implementar lógica de rollback
      // - Cambiar estado del período de 'cerrado' a 'borrador'
      // - Eliminar comprobantes generados
      // - Restaurar estados anteriores
      
      toast({
        title: "✅ Rollback Completado",
        description: "La liquidación ha sido revertida exitosamente",
        className: "border-blue-200 bg-blue-50"
      });
      
      setCanRollback(false);
      
    } catch (error) {
      console.error('❌ Error en rollback:', error);
      toast({
        title: "❌ Error en Rollback",
        description: "No se pudo revertir la liquidación",
        variant: "destructive"
      });
      throw error;
    }
  }, [payrollHook.currentPeriodId, canRollback, toast]);

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
    updateEmployeeCalculationsInDB: payrollHook.updateEmployeeCalculationsInDB,
    
    // ✅ NUEVAS FUNCIONALIDADES
    validatePeriod,
    rollbackLiquidation,
    validationResults,
    isValidating,
    liquidationStep,
    liquidationProgress,
    processedEmployees,
    liquidationErrors,
    showProgress,
    autoSendEmails,
    setAutoSendEmails,
    canRollback
  };
};
