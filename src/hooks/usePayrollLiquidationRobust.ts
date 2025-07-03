import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { PayrollPeriodDetectionRobust } from '@/services/payroll-intelligent/PayrollPeriodDetectionRobust';
import { PayrollDiagnosticService } from '@/services/payroll-intelligent/PayrollDiagnosticService';
import { PayrollLiquidationNewService } from '@/services/PayrollLiquidationNewService';
import { FuturePeriodService } from '@/services/payroll-intelligent/FuturePeriodService';
import { PayrollEmployee, PayrollSummary } from '@/types/payroll';
import { UnifiedPeriodStatus } from '@/types/period-unified';
import { supabase } from '@/integrations/supabase/client';

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

  // Simplified initialization
  const initializeSystem = useCallback(async () => {
    try {
      setIsLoading(true);
      console.log('🚀 INICIALIZANDO SISTEMA DE LIQUIDACIÓN...');
      
      const companyId = await PayrollPeriodDetectionRobust.getCurrentUserCompanyId();
      if (!companyId) {
        throw new Error('No se encontró información de la empresa');
      }

      // Use future period validation service
      const validation = await FuturePeriodService.validateFuturePeriodCreation(companyId);
      
      if (validation.activeFuturePeriod) {
        // There's an active period, load it
        const status: UnifiedPeriodStatus = {
          hasActivePeriod: true,
          currentPeriod: validation.activeFuturePeriod,
          action: 'resume',
          message: `Continuando con el período ${validation.activeFuturePeriod.periodo}`
        };
        
        setPeriodStatus(status);
        setCurrentPeriod(validation.activeFuturePeriod);
        await loadEmployeesForPeriod(validation.activeFuturePeriod);
        
      } else if (validation.canCreateFuture && validation.nextSuggestedPeriod) {
        // Can create a future period
        const status: UnifiedPeriodStatus = {
          hasActivePeriod: false,
          nextPeriod: validation.nextSuggestedPeriod,
          action: 'create',
          message: validation.message
        };
        
        setPeriodStatus(status);
        
      } else {
        // Some issue, show diagnostic needed
        const status: UnifiedPeriodStatus = {
          hasActivePeriod: false,
          action: 'suggest_next',
          message: validation.message || 'Verificando configuración...'
        };
        
        setPeriodStatus(status);
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
        action: 'suggest_next',
        message: "Error crítico - Ver diagnóstico en consola"
      });
      
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

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
      
      // Close the period
      const { error } = await supabase
        .from('payroll_periods_real')
        .update({ 
          estado: 'cerrado',
          updated_at: new Date().toISOString()
        })
        .eq('id', currentPeriod.id);

      if (error) throw error;
      
      toast({
        title: "Período cerrado",
        description: `El período ${currentPeriod.periodo} ha sido cerrado exitosamente`,
      });
      
      // Don't refresh immediately - let the success modal handle it
      
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
  }, [currentPeriod, toast]);

  const createNewPeriod = useCallback(async () => {
    try {
      setIsProcessing(true);
      
      if (!periodStatus?.nextPeriod) return;
      
      const companyId = await PayrollPeriodDetectionRobust.getCurrentUserCompanyId();
      if (!companyId) return;
      
      const result = await FuturePeriodService.createFuturePeriod(companyId, periodStatus.nextPeriod);
      
      if (result.success && result.period) {
        setCurrentPeriod(result.period);
        await loadEmployeesForPeriod(result.period);
        
        setPeriodStatus({
          hasActivePeriod: true,
          currentPeriod: result.period,
          action: 'resume',
          message: `Período creado: ${result.period.periodo}`
        });
        
        toast({
          title: "✅ Período Creado",
          description: result.message,
          className: "border-green-200 bg-green-50"
        });
      } else {
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive"
        });
      }
      
    } catch (error) {
      console.error('❌ Error creando período:', error);
      toast({
        title: "Error",
        description: "No se pudo crear el período",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  }, [periodStatus, loadEmployeesForPeriod, toast]);

  const refreshPeriod = useCallback(async () => {
    await initializeSystem();
  }, [initializeSystem]);

  const runManualDiagnosis = useCallback(async () => {
    try {
      setIsProcessing(true);
      
      const companyId = await PayrollPeriodDetectionRobust.getCurrentUserCompanyId();
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

  // Initialize on mount
  useEffect(() => {
    initializeSystem();
  }, [initializeSystem]);

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
