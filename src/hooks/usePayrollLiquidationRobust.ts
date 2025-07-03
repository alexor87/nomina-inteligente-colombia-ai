
import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { PayrollPeriodDetectionRobust, RobustPeriodStatus } from '@/services/payroll-intelligent/PayrollPeriodDetectionRobust';
import { PayrollDiagnosticService } from '@/services/payroll-intelligent/PayrollDiagnosticService';
import { PayrollLiquidationNewService } from '@/services/PayrollLiquidationNewService';
import { PayrollEmployee, PayrollSummary } from '@/types/payroll';

export const usePayrollLiquidationRobust = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentPeriod, setCurrentPeriod] = useState<any>(null);
  const [employees, setEmployees] = useState<PayrollEmployee[]>([]);
  const [periodStatus, setPeriodStatus] = useState<RobustPeriodStatus | null>(null);
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

  // **ARQUITECTURA MEJORADA**: Inicialización con validación previa de consistencia
  const initializeWithDiagnosis = useCallback(async () => {
    try {
      setIsLoading(true);
      console.log('🚀 INICIALIZACIÓN ROBUSTA CON VALIDACIÓN PREVIA...');
      
      // **CAMBIO ARQUITECTÓNICO**: Primero esperamos que la auto-corrección universal termine
      // Este pequeño delay permite que usePeriodsAutoCorrection complete su trabajo
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const status = await PayrollPeriodDetectionRobust.detectWithDiagnosis();
      setPeriodStatus(status);
      setDiagnostic(status.diagnostic);
      
      console.log('📊 Estado detectado después de auto-corrección:', status.action);
      console.log('💬 Mensaje del sistema:', status.message);
      
      if (status.currentPeriod) {
        setCurrentPeriod(status.currentPeriod);
        await loadEmployeesForPeriod(status.currentPeriod);
      }
      
      // **LOGGING MEJORADO**: Mostrar diagnóstico detallado si está disponible
      if (status.diagnostic) {
        console.log('🔍 DIAGNÓSTICO POST AUTO-CORRECCIÓN:');
        console.log('- Total períodos:', status.diagnostic.totalPeriods);
        console.log('- Problemas detectados:', status.diagnostic.issues);
        console.log('- Recomendaciones del sistema:', status.diagnostic.recommendations);
      }
      
    } catch (error) {
      console.error('💥 Error en inicialización robusta:', error);
      toast({
        title: "Error de Inicialización",
        description: "Error detectando período. Ver consola para detalles.",
        variant: "destructive"
      });
      
      // Estado de emergencia
      setPeriodStatus({
        hasActivePeriod: false,
        action: 'emergency',
        message: "Error crítico - Ver diagnóstico en consola"
      });
      
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Cargar empleados para período
  const loadEmployeesForPeriod = useCallback(async (period: any) => {
    try {
      setIsProcessing(true);
      console.log('👥 Cargando empleados para período:', period.periodo);
      console.log('📅 Período completo:', period);
      
      const loadedEmployees = await PayrollLiquidationNewService.loadEmployeesForActivePeriod(period);
      console.log('✅ Empleados cargados desde servicio:', loadedEmployees.length);
      
      setEmployees(loadedEmployees);
      
      // Actualizar contador de empleados en el período
      console.log('📊 Actualizando contador de empleados en BD...');
      await PayrollLiquidationNewService.updateEmployeeCount(period.id, loadedEmployees.length);
      
      // Calcular resumen
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
      
      console.log('✅ Empleados cargados y resumen calculado');
      console.log('📊 Resumen detallado:', {
        totalEmployees: loadedEmployees.length,
        validEmployees: validEmployees.length,
        totalGrossPay: newSummary.totalGrossPay,
        totalNetPay: newSummary.totalNetPay,
        empleadosEstados: loadedEmployees.reduce((acc, emp) => {
          acc[emp.status] = (acc[emp.status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      });
      
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

  // Crear período sugerido
  const createSuggestedPeriod = useCallback(async () => {
    if (!periodStatus?.nextPeriod) return;
    
    try {
      setIsProcessing(true);
      
      const newPeriod = await PayrollPeriodDetectionRobust.createPeriodFromSuggestion(periodStatus.nextPeriod);
      
      setCurrentPeriod(newPeriod);
      await loadEmployeesForPeriod(newPeriod);
      
      // Actualizar estado
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

  // Ejecutar diagnóstico manual
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

  // **FUNCIÓN MEJORADA**: Refresh que trabaja con el sistema de auto-corrección universal
  const refreshDiagnosis = useCallback(async () => {
    try {
      setIsProcessing(true);
      console.log('🔄 REFRESH CON VALIDACIÓN DE CONSISTENCIA...');
      
      // **ARQUITECTURA MEJORADA**: Re-ejecutar detección después de que auto-corrección haya terminado
      await initializeWithDiagnosis();
      
      toast({
        title: "🔄 Diagnóstico Actualizado",
        description: "Estado actualizado con validaciones aplicadas",
        className: "border-blue-200 bg-blue-50"
      });
      
    } catch (error) {
      console.error('❌ Error en refresh de diagnóstico:', error);
      toast({
        title: "Error",
        description: "Error actualizando diagnóstico",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  }, [initializeWithDiagnosis, toast]);

  // **INICIALIZACIÓN MEJORADA**: Esperar a que auto-corrección termine antes de detectar
  useEffect(() => {
    // Pequeño delay para permitir que el sistema de auto-corrección universal termine
    const timer = setTimeout(() => {
      initializeWithDiagnosis();
    }, 100);
    
    return () => clearTimeout(timer);
  }, [initializeWithDiagnosis]);

  // **LOGGING MEJORADO**: Monitorear cambios de estado para debugging
  useEffect(() => {
    console.log('🔄 usePayrollLiquidationRobust - Estado actualizado:', {
      isLoading,
      isProcessing,
      employeesCount: employees.length,
      currentPeriodId: currentPeriod?.id,
      currentPeriodState: currentPeriod?.estado,
      periodStatus: periodStatus?.action,
      summaryTotalEmployees: summary.totalEmployees,
      hasActivePeriod: periodStatus?.hasActivePeriod,
      systemMessage: periodStatus?.message
    });
  }, [isLoading, isProcessing, employees.length, currentPeriod, periodStatus, summary.totalEmployees]);

  return {
    // Estado
    isLoading,
    isProcessing,
    currentPeriod,
    employees,
    summary,
    periodStatus,
    diagnostic,
    
    // Acciones principales
    createSuggestedPeriod,
    runManualDiagnosis,
    refreshDiagnosis,
    
    // Estados calculados
    canCreatePeriod: periodStatus?.action === 'create' && periodStatus?.nextPeriod,
    needsDiagnosis: periodStatus?.action === 'diagnose',
    isEmergency: periodStatus?.action === 'emergency',
    hasActivePeriod: periodStatus?.hasActivePeriod || false,
    hasEmployees: employees.length > 0
  };
};
