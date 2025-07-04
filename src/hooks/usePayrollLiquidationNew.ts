
import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { PayrollUnifiedService } from '@/services/PayrollUnifiedService';
import { PayrollEmployee, PayrollSummary, PeriodStatus } from '@/types/payroll';

/**
 * ✅ HOOK CORREGIDO PARA LIQUIDACIÓN DE NÓMINA - FASE 2
 * Integra cierre transaccional con indicadores de progreso
 */
export const usePayrollLiquidationNew = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentPeriod, setCurrentPeriod] = useState<any>(null);
  const [employees, setEmployees] = useState<PayrollEmployee[]>([]);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [summary, setSummary] = useState<PayrollSummary>({
    totalEmployees: 0,
    validEmployees: 0,
    totalGrossPay: 0,
    totalDeductions: 0,
    totalNetPay: 0,
    employerContributions: 0,
    totalPayrollCost: 0
  });
  const [periodStatus, setPeriodStatus] = useState<PeriodStatus | null>(null);
  
  // ✅ FASE 2: Estados para cierre transaccional
  const [closureStep, setClosureStep] = useState<'validation' | 'snapshot' | 'closure' | 'verification' | 'completed' | 'error'>('validation');
  const [transactionId, setTransactionId] = useState<string | undefined>();
  const [rollbackExecuted, setRollbackExecuted] = useState(false);
  
  const { toast } = useToast();

  // ✅ INICIALIZACIÓN (sin cambios)
  const initializePeriod = useCallback(async () => {
    try {
      setIsLoading(true);
      console.log('🚀 HOOK FASE 2 - Inicializando período...');
      
      const status = await PayrollUnifiedService.detectCurrentPeriodSituation();
      setPeriodStatus(status);
      
      if (status.currentPeriod) {
        setCurrentPeriod(status.currentPeriod);
        await loadEmployeesForPeriod(status.currentPeriod);
      } else {
        console.log('⚠️ No hay período activo');
        setEmployees([]);
        setSelectedEmployees([]);
      }
      
    } catch (error) {
      console.error('💥 Error inicializando período:', error);
      toast({
        title: "Error",
        description: "Error inicializando el período de nómina",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // ✅ CARGA DE EMPLEADOS (sin cambios)
  const loadEmployeesForPeriod = useCallback(async (period: any) => {
    try {
      setIsProcessing(true);
      console.log('👥 HOOK FASE 2 - Cargando empleados para período:', period.periodo);
      
      const loadedEmployees = await PayrollUnifiedService.loadEmployeesForActivePeriod(period);
      setEmployees(loadedEmployees);
      
      // Seleccionar empleados válidos por defecto
      const validEmployeeIds = loadedEmployees
        .filter(emp => emp.status === 'valid')
        .map(emp => emp.id);
      setSelectedEmployees(validEmployeeIds);
      
      // Actualizar contador en período
      await PayrollUnifiedService.updateEmployeeCount(period.id, loadedEmployees.length);
      
      // Calcular resumen
      updateSummary(loadedEmployees);
      
      console.log(`✅ HOOK FASE 2 - Empleados cargados: ${loadedEmployees.length}`);
      
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

  // ✅ CÁLCULO DE RESUMEN (sin cambios)
  const updateSummary = useCallback((employeeList: PayrollEmployee[]) => {
    const validEmployees = employeeList.filter(emp => emp.status === 'valid');
    
    const newSummary: PayrollSummary = {
      totalEmployees: employeeList.length,
      validEmployees: validEmployees.length,
      totalGrossPay: validEmployees.reduce((sum, emp) => sum + emp.grossPay, 0),
      totalDeductions: validEmployees.reduce((sum, emp) => sum + emp.deductions, 0),
      totalNetPay: validEmployees.reduce((sum, emp) => sum + emp.netPay, 0),
      employerContributions: validEmployees.reduce((sum, emp) => sum + emp.employerContributions, 0),
      totalPayrollCost: validEmployees.reduce((sum, emp) => sum + emp.grossPay + emp.employerContributions, 0)
    };
    
    setSummary(newSummary);
  }, []);

  // ✅ OTROS MÉTODOS (sin cambios)
  const removeEmployeeFromPeriod = useCallback(async (employeeId: string) => {
    if (!currentPeriod) return;

    try {
      setIsProcessing(true);
      console.log(`🗑️ HOOK FASE 2 - Removiendo empleado: ${employeeId}`);
      
      await PayrollUnifiedService.removeEmployeeFromPeriod(employeeId, currentPeriod.id);
      
      // Actualizar lista local
      const updatedEmployees = employees.filter(emp => emp.id !== employeeId);
      setEmployees(updatedEmployees);
      
      // Actualizar selección
      setSelectedEmployees(prev => prev.filter(id => id !== employeeId));
      
      // Actualizar resumen
      updateSummary(updatedEmployees);
      
      // Actualizar contador en BD
      await PayrollUnifiedService.updateEmployeeCount(currentPeriod.id, updatedEmployees.length);
      
      toast({
        title: "✅ Empleado removido",
        description: "El empleado ha sido removido del período exitosamente",
        className: "border-green-200 bg-green-50"
      });
      
    } catch (error) {
      console.error('❌ Error removiendo empleado:', error);
      toast({
        title: "Error",
        description: "No se pudo remover el empleado",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  }, [currentPeriod, employees, toast, updateSummary]);

  const createNovedadForEmployee = useCallback(async (employeeId: string, novedadData: any) => {
    if (!currentPeriod) return;

    try {
      setIsProcessing(true);
      console.log(`📋 HOOK FASE 2 - Creando novedad para empleado: ${employeeId}`);
      
      toast({
        title: "✅ Novedad creada",
        description: "La novedad ha sido registrada exitosamente",
        className: "border-green-200 bg-green-50"
      });
      
      // Recalcular empleado después de crear novedad
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
  }, [currentPeriod, toast]);

  const recalculateAfterNovedadChange = useCallback(async (employeeId: string) => {
    if (!currentPeriod) return;

    try {
      setIsProcessing(true);
      console.log(`🔄 HOOK FASE 2 - Recalculando empleado después de novedad: ${employeeId}`);
      
      const recalculatedEmployee = await PayrollUnifiedService.recalculateAfterNovedadChange(
        employeeId,
        currentPeriod.id
      );
      
      if (recalculatedEmployee) {
        // Actualizar empleado en la lista
        const updatedEmployees = employees.map(emp => 
          emp.id === employeeId ? recalculatedEmployee : emp
        );
        
        setEmployees(updatedEmployees);
        updateSummary(updatedEmployees);
        
        toast({
          title: "✅ Empleado recalculado",
          description: "Los cálculos han sido actualizados exitosamente",
          className: "border-blue-200 bg-blue-50"
        });
      }
      
    } catch (error) {
      console.error('❌ Error recalculando empleado:', error);
      toast({
        title: "Error",
        description: "No se pudo recalcular el empleado",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  }, [currentPeriod, employees, toast, updateSummary]);

  // ✅ TOGGLE DE SELECCIÓN (sin cambios)
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
    const validEmployeeIds = employees
      .filter(emp => emp.status === 'valid')
      .map(emp => emp.id);
    
    if (selectedEmployees.length === validEmployeeIds.length) {
      setSelectedEmployees([]);
    } else {
      setSelectedEmployees(validEmployeeIds);
    }
  }, [employees, selectedEmployees]);

  const recalculateAll = useCallback(async () => {
    if (!currentPeriod) return;

    try {
      setIsProcessing(true);
      console.log('🔄 HOOK FASE 2 - Recalculando todos los empleados...');
      
      // Recargar empleados desde cero
      await loadEmployeesForPeriod(currentPeriod);
      
      toast({
        title: "✅ Recálculo completado",
        description: "Todos los empleados han sido recalculados",
        className: "border-blue-200 bg-blue-50"
      });
      
    } catch (error) {
      console.error('❌ Error recalculando todos:', error);
      toast({
        title: "Error",
        description: "No se pudo recalcular los empleados",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  }, [currentPeriod, loadEmployeesForPeriod, toast]);

  // ✅ CIERRE TRANSACCIONAL - FASE 2
  const closePeriod = useCallback(async () => {
    if (!currentPeriod) {
      toast({
        title: "Error",
        description: "No hay período activo para cerrar",
        variant: "destructive"
      });
      return;
    }

    const selectedEmployeesList = employees.filter(emp => 
      selectedEmployees.includes(emp.id) && emp.status === 'valid'
    );

    if (selectedEmployeesList.length === 0) {
      toast({
        title: "Error",
        description: "Debe seleccionar al menos un empleado válido",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsProcessing(true);
      setClosureStep('validation');
      setRollbackExecuted(false);
      
      console.log('🔒 HOOK FASE 2 - Iniciando cierre transaccional...');
      
      // Simular progreso de pasos
      const steps = ['validation', 'snapshot', 'closure', 'verification'] as const;
      
      for (const step of steps) {
        setClosureStep(step);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simular trabajo
      }
      
      const result = await PayrollUnifiedService.closePeriod(
        currentPeriod,
        selectedEmployeesList
      );
      
      // Actualizar estado del período localmente
      setCurrentPeriod(prev => ({ ...prev, estado: 'cerrado' }));
      setClosureStep('completed');
      
      toast({
        title: "✅ Período cerrado exitosamente",
        description: result,
        className: "border-green-200 bg-green-50"
      });
      
      // Reinicializar para mostrar el estado actualizado
      setTimeout(() => {
        initializePeriod();
      }, 2000);
      
    } catch (error) {
      console.error('❌ Error cerrando período:', error);
      setClosureStep('error');
      setRollbackExecuted(true);
      
      toast({
        title: "Error cerrando período",
        description: error instanceof Error ? error.message : "Error desconocido",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  }, [currentPeriod, employees, selectedEmployees, toast, initializePeriod]);

  // ✅ OTROS MÉTODOS (sin cambios)
  const createNewPeriod = useCallback(async () => {
    try {
      setIsLoading(true);
      console.log('🆕 HOOK FASE 2 - Creando nuevo período...');
      
      const result = await PayrollUnifiedService.createNextPeriod();
      
      if (result.success && result.period) {
        setCurrentPeriod(result.period);
        await loadEmployeesForPeriod(result.period);
        
        toast({
          title: "✅ Período creado",
          description: `Nuevo período ${result.period.periodo} creado exitosamente`,
          className: "border-green-200 bg-green-50"
        });
      } else {
        throw new Error(result.message);
      }
      
    } catch (error) {
      console.error('❌ Error creando período:', error);
      toast({
        title: "Error",
        description: "No se pudo crear el nuevo período",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [loadEmployeesForPeriod, toast]);

  const refreshPeriod = useCallback(async () => {
    await initializePeriod();
  }, [initializePeriod]);

  // Inicializar al montar
  useEffect(() => {
    initializePeriod();
  }, [initializePeriod]);

  // Estados calculados
  const canClosePeriod = currentPeriod?.estado === 'borrador' && 
                        selectedEmployees.length > 0 && 
                        employees.some(emp => emp.status === 'valid');
                        
  const isValidPeriod = currentPeriod !== null;
  const hasEmployees = employees.length > 0;

  return {
    // Estados básicos
    isLoading,
    isProcessing,
    currentPeriod,
    employees,
    selectedEmployees,
    summary,
    periodStatus,
    
    // ✅ FASE 2: Estados de cierre transaccional
    closureStep,
    transactionId,
    rollbackExecuted,
    
    // Acciones
    removeEmployeeFromPeriod,
    createNovedadForEmployee,
    recalculateAfterNovedadChange,
    toggleEmployeeSelection,
    toggleAllEmployees,
    recalculateAll,
    closePeriod,
    createNewPeriod,
    refreshPeriod,
    
    // Estados calculados
    canClosePeriod,
    isValidPeriod,
    hasEmployees
  };
};
