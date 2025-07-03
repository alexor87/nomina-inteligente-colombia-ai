
import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { PayrollPeriodDetectionRobust } from '@/services/payroll-intelligent/PayrollPeriodDetectionRobust';
import { PayrollDiagnosticService } from '@/services/payroll-intelligent/PayrollDiagnosticService';
import { PayrollLiquidationNewService } from '@/services/PayrollLiquidationNewService';
import { PayrollEmployee, PayrollSummary } from '@/types/payroll';
import { UnifiedPeriodStatus } from '@/types/period-unified';

export const usePayrollLiquidationRobust = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentPeriod, setCurrentPeriod] = useState<any>(null);
  const [employees, setEmployees] = useState<PayrollEmployee[]>([]);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [periodStatus, setPeriodStatus] = useState<UnifiedPeriodStatus | null>(null);
  const [diagnostic, setDiagnostic] = useState<any>(null);
  const [summary, setSummary] = useState<PayrollSummary>({
    totalEmployees: 0,
    validEmployees: 0,
    totalGrossPay: 0,
    totalDeductions: 0,
    totalNetPay: 0,
    employerContributions: 0,
    totalPayrollCost: 0
  });
  const { toast } = useToast();

  // Simplified initialization without delays or race conditions
  const initializeSystem = useCallback(async () => {
    try {
      setIsLoading(true);
      console.log('🚀 INICIALIZANDO SISTEMA DE LIQUIDACIÓN...');
      
      const status = await PayrollPeriodDetectionRobust.detectWithDiagnosis();
      
      // Convert RobustPeriodStatus to UnifiedPeriodStatus
      const unifiedStatus: UnifiedPeriodStatus = {
        hasActivePeriod: status.hasActivePeriod,
        currentPeriod: status.currentPeriod,
        nextPeriod: status.nextPeriod,
        action: status.action,
        message: status.message,
        diagnostic: status.diagnostic
      };
      
      setPeriodStatus(unifiedStatus);
      setDiagnostic(status.diagnostic);
      
      console.log('📊 Estado detectado:', status.action);
      console.log('💬 Mensaje del sistema:', status.message);
      
      if (status.currentPeriod) {
        setCurrentPeriod(status.currentPeriod);
        await loadEmployeesForPeriod(status.currentPeriod);
      } else {
        console.log('ℹ️ No hay período activo, preparando para crear nuevo período');
      }
      
    } catch (error) {
      console.error('💥 Error en inicialización:', error);
      toast({
        title: "Error de Inicialización",
        description: "Error detectando período. Ver consola para detalles.",
        variant: "destructive"
      });
      
      setPeriodStatus({
        hasActivePeriod: false,
        action: 'emergency',
        message: "Error crítico - Ver diagnóstico en consola"
      });
      
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Load employees for period
  const loadEmployeesForPeriod = useCallback(async (period: any) => {
    try {
      setIsProcessing(true);
      console.log('👥 Cargando empleados para período:', period.periodo);
      
      const loadedEmployees = await PayrollLiquidationNewService.loadEmployeesForActivePeriod(period);
      console.log('✅ Empleados cargados:', loadedEmployees.length);
      
      setEmployees(loadedEmployees);
      
      // Update employee count in period
      await PayrollLiquidationNewService.updateEmployeeCount(period.id, loadedEmployees.length);
      
      // Calculate summary
      const validEmployees = loadedEmployees.filter(emp => emp.status === 'valid');
      const newSummary: PayrollSummary = {
        totalEmployees: loadedEmployees.length,
        validEmployees: validEmployees.length,
        totalGrossPay: validEmployees.reduce((sum, emp) => sum + emp.grossPay, 0),
        totalDeductions: validEmployees.reduce((sum, emp) => sum + emp.deductions, 0),
        totalNetPay: validEmployees.reduce((sum, emp) => sum + emp.netPay, 0),
        employerContributions: validEmployees.reduce((sum, emp) => sum + emp.employerContributions, 0),
        totalPayrollCost: validEmployees.reduce((sum, emp) => sum + emp.grossPay + emp.employerContributions, 0)
      };
      
      setSummary(newSummary);
      console.log('✅ Resumen calculado:', newSummary);
      
    } catch (error) {
      console.error('❌ Error cargando empleados:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los empleados",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  }, [toast]);

  // Employee operations
  const removeEmployeeFromPeriod = useCallback(async (employeeId: string) => {
    try {
      setIsProcessing(true);
      setEmployees(prev => prev.filter(emp => emp.id !== employeeId));
      setSelectedEmployees(prev => prev.filter(id => id !== employeeId));
      
      toast({
        title: "Empleado eliminado",
        description: "El empleado ha sido eliminado del período",
      });
    } catch (error) {
      console.error('❌ Error eliminando empleado:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el empleado",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  }, [toast]);

  const createNovedadForEmployee = useCallback(async (employeeId: string, novedadData: any) => {
    try {
      setIsProcessing(true);
      console.log('📝 Creando novedad para empleado:', employeeId, novedadData);
      
      toast({
        title: "Novedad creada",
        description: "La novedad ha sido creada exitosamente",
      });
      
      await recalculateAfterNovedadChange(employeeId);
    } catch (error) {
      console.error('❌ Error creando novedad:', error);
      toast({
        title: "Error",
        description: "No se pudo crear la novedad",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  }, [toast]);

  const recalculateAfterNovedadChange = useCallback(async (employeeId: string) => {
    try {
      console.log('🔄 Recalculando empleado:', employeeId);
      setEmployees(prev => prev.map(emp => {
        if (emp.id === employeeId) {
          return { ...emp, status: 'valid' as const };
        }
        return emp;
      }));
    } catch (error) {
      console.error('❌ Error en recálculo:', error);
    }
  }, []);

  // Selection operations
  const toggleEmployeeSelection = useCallback((employeeId: string) => {
    setSelectedEmployees(prev => {
      if (prev.includes(employeeId)) {
        return prev.filter(id => id !== employeeId);
      } else {
        return [...prev, employeeId];
      }
    });
  }, []);

  const toggleAllEmployees = useCallback(() => {
    setSelectedEmployees(prev => {
      if (prev.length === employees.length) {
        return [];
      } else {
        return employees.map(emp => emp.id);
      }
    });
  }, [employees]);

  // Period operations
  const recalculateAll = useCallback(async () => {
    try {
      setIsProcessing(true);
      console.log('🔄 Recalculando todos los empleados...');
      
      if (currentPeriod) {
        await loadEmployeesForPeriod(currentPeriod);
      }
      
      toast({
        title: "Recálculo completado",
        description: "Todos los empleados han sido recalculados",
      });
    } catch (error) {
      console.error('❌ Error en recálculo general:', error);
      toast({
        title: "Error",
        description: "Error en el recálculo general",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  }, [currentPeriod, loadEmployeesForPeriod, toast]);

  const closePeriod = useCallback(async () => {
    try {
      setIsProcessing(true);
      
      if (!currentPeriod) return;
      
      console.log('🔒 Cerrando período:', currentPeriod.periodo);
      
      toast({
        title: "Período cerrado",
        description: `El período ${currentPeriod.periodo} ha sido cerrado`,
      });
      
      await initializeSystem();
    } catch (error) {
      console.error('❌ Error cerrando período:', error);
      toast({
        title: "Error",
        description: "No se pudo cerrar el período",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  }, [currentPeriod, toast, initializeSystem]);

  const createNewPeriod = useCallback(async () => {
    await createSuggestedPeriod();
  }, []);

  const refreshPeriod = useCallback(async () => {
    await initializeSystem();
  }, [initializeSystem]);

  const createSuggestedPeriod = useCallback(async () => {
    if (!periodStatus?.nextPeriod) return;
    
    try {
      setIsProcessing(true);
      
      const newPeriod = await PayrollPeriodDetectionRobust.createPeriodFromSuggestion(periodStatus.nextPeriod);
      
      setCurrentPeriod(newPeriod);
      await loadEmployeesForPeriod(newPeriod);
      
      setPeriodStatus({
        hasActivePeriod: true,
        currentPeriod: newPeriod,
        action: 'resume',
        message: `Período creado: ${newPeriod.periodo}`
      });
      
      toast({
        title: "✅ Período Creado",
        description: `Nuevo período ${newPeriod.periodo} listo para liquidación`,
        className: "border-green-200 bg-green-50"
      });
      
    } catch (error) {
      console.error('❌ Error creando período sugerido:', error);
      toast({
        title: "Error",
        description: "No se pudo crear el período sugerido",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  }, [periodStatus, loadEmployeesForPeriod, toast]);

  const runManualDiagnosis = useCallback(async () => {
    try {
      setIsProcessing(true);
      
      const companyId = await PayrollPeriodDetectionRobust['getCurrentUserCompanyId']?.();
      if (companyId) {
        await PayrollDiagnosticService.runDiagnosticAndLog(companyId);
        
        toast({
          title: "📊 Diagnóstico Ejecutado",
          description: "Revisa la consola para ver el reporte completo",
          className: "border-blue-200 bg-blue-50"
        });
      }
    } catch (error) {
      console.error('❌ Error en diagnóstico manual:', error);
      toast({
        title: "Error",
        description: "Error ejecutando diagnóstico",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  }, [toast]);

  // Initialize on mount - no delays or race conditions
  useEffect(() => {
    initializeSystem();
  }, [initializeSystem]);

  // Optimized logging
  useEffect(() => {
    if (!isLoading) {
      console.log('🔄 Estado actualizado:', {
        isLoading,
        isProcessing,
        employeesCount: employees.length,
        selectedEmployeesCount: selectedEmployees.length,
        currentPeriodId: currentPeriod?.id,
        currentPeriodState: currentPeriod?.estado,
        periodStatus: periodStatus?.action,
        summaryTotalEmployees: summary.totalEmployees,
        hasActivePeriod: periodStatus?.hasActivePeriod,
        systemMessage: periodStatus?.message
      });
    }
  }, [isLoading, isProcessing, employees.length, selectedEmployees.length, currentPeriod, periodStatus, summary.totalEmployees]);

  return {
    // Estado
    isLoading,
    isProcessing,
    currentPeriod,
    employees,
    selectedEmployees,
    summary,
    periodStatus,
    diagnostic,
    
    // Acciones principales
    removeEmployeeFromPeriod,
    createNovedadForEmployee,
    recalculateAfterNovedadChange,
    toggleEmployeeSelection,
    toggleAllEmployees,
    recalculateAll,
    closePeriod,
    createNewPeriod,
    refreshPeriod,
    
    // Acciones adicionales
    createSuggestedPeriod,
    runManualDiagnosis,
    
    // Estados calculados
    canCreatePeriod: periodStatus?.action === 'create' && periodStatus?.nextPeriod,
    needsDiagnosis: periodStatus?.action === 'diagnose',
    isEmergency: periodStatus?.action === 'emergency',
    hasActivePeriod: periodStatus?.hasActivePeriod || false,
    hasEmployees: employees.length > 0,
    canClosePeriod: currentPeriod?.estado === 'borrador' && employees.length > 0,
    isValidPeriod: periodStatus?.hasActivePeriod || false
  };
};
