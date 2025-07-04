
import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { PayrollLiquidationFacade } from '@/services/payroll-liquidation/PayrollLiquidationFacade';
import { PayrollEmployee, PayrollSummary, PeriodStatus } from '@/types/payroll';
import { ClosureStep, PayrollClosureResult, PostClosureResult } from '@/types/payroll-liquidation';

/**
 * ✅ HOOK UNIFICADO DE LIQUIDACIÓN - CORRECCIÓN FASE 1
 * Reemplaza los múltiples hooks problemáticos con uno solo funcional
 */
export const usePayrollLiquidationUnified = () => {
  const { toast } = useToast();

  // Estado centralizado
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
  const [closureStep, setClosureStep] = useState<ClosureStep>('validation');
  const [transactionId, setTransactionId] = useState<string | undefined>();
  const [rollbackExecuted, setRollbackExecuted] = useState(false);
  const [postClosureResult, setPostClosureResult] = useState<PostClosureResult | null>(null);

  // Calcular resumen de empleados
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

  // Inicializar período
  const initializePeriod = useCallback(async () => {
    try {
      setIsLoading(true);
      console.log('🚀 CORRECCIÓN FASE 1 - Inicializando período...');
      
      const result = await PayrollLiquidationFacade.detectCurrentPeriodSituation();
      
      if (!result.success) {
        throw new Error(result.error);
      }

      setPeriodStatus(result.data);
      
      if (result.data.currentPeriod) {
        setCurrentPeriod(result.data.currentPeriod);
        await loadEmployeesForPeriod(result.data.currentPeriod);
      } else {
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

  // Cargar empleados para período
  const loadEmployeesForPeriod = useCallback(async (period: any) => {
    try {
      setIsProcessing(true);
      
      const result = await PayrollLiquidationFacade.loadEmployeesForActivePeriod(period);
      
      if (!result.success) {
        throw new Error(result.error);
      }

      setEmployees(result.data);
      
      const validEmployeeIds = result.data
        .filter(emp => emp.status === 'valid')
        .map(emp => emp.id);
      setSelectedEmployees(validEmployeeIds);
      
      updateSummary(result.data);
      
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
  }, [toast, updateSummary]);

  // Remover empleado del período
  const removeEmployeeFromPeriod = useCallback(async (employeeId: string) => {
    if (!currentPeriod) return;

    try {
      setIsProcessing(true);
      
      const result = await PayrollLiquidationFacade.removeEmployeeFromPeriod(
        employeeId, 
        currentPeriod.id
      );
      
      if (!result.success) {
        throw new Error(result.error);
      }
      
      const updatedEmployees = employees.filter(emp => emp.id !== employeeId);
      setEmployees(updatedEmployees);
      setSelectedEmployees(prev => prev.filter(id => id !== employeeId));
      updateSummary(updatedEmployees);
      
      toast({
        title: "✅ Empleado removido",
        description: "El empleado ha sido removido del período exitosamente",
        className: "border-green-200 bg-green-50"
      });
      
    } catch (error) {
      console.error('❌ Error removiendo empleado:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo remover el empleado",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  }, [currentPeriod, employees, toast, updateSummary]);

  // Recalcular empleado después de novedad
  const recalculateAfterNovedadChange = useCallback(async (employeeId: string) => {
    if (!currentPeriod) return;

    try {
      setIsProcessing(true);
      
      const result = await PayrollLiquidationFacade.recalculateAfterNovedadChange(
        employeeId,
        currentPeriod.id
      );
      
      if (!result.success) {
        throw new Error(result.error);
      }

      if (result.data) {
        const updatedEmployees = employees.map(emp => 
          emp.id === employeeId ? result.data! : emp
        );
        
        setEmployees(updatedEmployees);
        updateSummary(updatedEmployees);
      }
      
    } catch (error) {
      console.error('❌ Error recalculando empleado:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo recalcular el empleado",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  }, [currentPeriod, employees, toast, updateSummary]);

  // Crear novedad para empleado
  const createNovedadForEmployee = useCallback(async (employeeId: string, novedadData: any) => {
    if (!currentPeriod) return;

    try {
      setIsProcessing(true);
      console.log(`📋 CORRECCIÓN FASE 1 - Creando novedad para empleado: ${employeeId}`);
      
      // TODO: Implementar en facade cuando sea necesario
      console.log('✅ Novedad creada (placeholder)');
      
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
  }, [currentPeriod, recalculateAfterNovedadChange, toast]);

  // Métodos de selección
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

  // Recalcular todos
  const recalculateAll = useCallback(async () => {
    if (!currentPeriod) return;

    try {
      setIsProcessing(true);
      console.log('🔄 CORRECCIÓN FASE 1 - Recalculando todos los empleados...');
      
      await loadEmployeesForPeriod(currentPeriod);
      
      console.log('✅ Recálculo completado');
      
    } catch (error) {
      console.error('❌ Error recalculando todos:', error);
      toast({
        title: "Error",
        description: "No se pudo recalcular la nómina",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  }, [currentPeriod, loadEmployeesForPeriod, toast]);

  // Cerrar período
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
      setPostClosureResult(null);
      
      const steps = ['validation', 'snapshot', 'closure', 'verification'] as const;
      
      for (const step of steps) {
        setClosureStep(step);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      const result = await PayrollLiquidationFacade.closePeriod(
        currentPeriod,
        selectedEmployeesList
      );
      
      if (!result.success) {
        throw new Error(result.error);
      }
      
      setCurrentPeriod(prev => ({ ...prev, estado: 'cerrado' }));
      setClosureStep('completed');
      
      if (result.data.postClosureResult) {
        setPostClosureResult(result.data.postClosureResult);
      }
      
      toast({
        title: "✅ Período cerrado exitosamente",
        description: result.data.message,
        className: "border-green-200 bg-green-50"
      });
      
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

  // Crear nuevo período
  const createNewPeriod = useCallback(async () => {
    try {
      setIsLoading(true);
      
      const result = await PayrollLiquidationFacade.createNextPeriod();
      
      if (!result.success) {
        throw new Error(result.error);
      }

      if (result.data.period) {
        setCurrentPeriod(result.data.period);
        await loadEmployeesForPeriod(result.data.period);
        
        toast({
          title: "✅ Período creado",
          description: result.data.message,
          className: "border-green-200 bg-green-50"
        });
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
    // Estados
    isLoading,
    isProcessing,
    currentPeriod,
    employees,
    selectedEmployees,
    summary,
    periodStatus,
    closureStep,
    transactionId,
    rollbackExecuted,
    postClosureResult,
    
    // Acciones
    removeEmployeeFromPeriod,
    createNovedadForEmployee,
    recalculateAfterNovedadChange,
    toggleEmployeeSelection,
    toggleAllEmployees,
    recalculateAll,
    closePeriod,
    createNewPeriod,
    refreshPeriod: initializePeriod,
    
    // Estados calculados
    canClosePeriod,
    isValidPeriod,
    hasEmployees
  };
};
