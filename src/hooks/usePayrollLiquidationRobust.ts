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

  // Inicialización robusta con diagnóstico automático
  const initializeWithDiagnosis = useCallback(async () => {
    try {
      setIsLoading(true);
      console.log('🚀 INICIALIZACIÓN ROBUSTA CON DIAGNÓSTICO...');
      
      // DEBUG: Verificar datos base
      console.log('🔍 DEBUG: Verificando datos base...');
      
      const status = await PayrollPeriodDetectionRobust.detectWithDiagnosis();
      setPeriodStatus(status);
      setDiagnostic(status.diagnostic);
      
      console.log('📊 Estado detectado:', status.action);
      console.log('💬 Mensaje:', status.message);
      console.log('🔍 DEBUG: Estado completo:', status);
      
      // ALWAYS try to load employees regardless of period status
      console.log('👥 DEBUG: Intentando cargar empleados...');
      let loadedEmployees: PayrollEmployee[] = [];
      
      // Si hay período actual, cargar empleados para ese período
      if (status.currentPeriod) {
        console.log('📅 DEBUG: Cargando empleados para período existente:', status.currentPeriod.periodo);
        setCurrentPeriod(status.currentPeriod);
        loadedEmployees = await loadEmployeesForPeriod(status.currentPeriod);
      }
      // Si necesita crear período, crearlo automáticamente
      else if (status.action === 'create' && status.nextPeriod) {
        console.log('🔄 DEBUG: Creando período automáticamente:', status.nextPeriod);
        const newPeriod = await createPeriodFromSuggestion(status.nextPeriod);
        if (newPeriod) {
          loadedEmployees = await loadEmployeesForPeriod(newPeriod);
        }
      }
      // Si hay diagnóstico pero no período, intentar cargar empleados base
      else {
        console.log('🔍 DEBUG: No hay período, intentando cargar empleados directamente...');
        try {
          // Intentar cargar empleados sin período específico
          loadedEmployees = await PayrollLiquidationNewService.loadEmployeesForActivePeriod(null);
          console.log('👥 DEBUG: Empleados cargados sin período:', loadedEmployees.length);
        } catch (error) {
          console.log('❌ DEBUG: Error cargando empleados sin período:', error);
        }
      }
      
      // Mostrar diagnóstico en consola si está disponible
      if (status.diagnostic) {
        console.log('🔍 DIAGNÓSTICO DETALLADO:');
        console.log('- Total períodos:', status.diagnostic.totalPeriods);
        console.log('- Problemas:', status.diagnostic.issues);
        console.log('- Recomendaciones:', status.diagnostic.recommendations);
      }
      
      // Si aún no hay empleados, ejecutar diagnóstico en segundo plano
      if (loadedEmployees.length === 0) {
        console.log('🔄 DEBUG: Sin empleados, ejecutando diagnóstico en segundo plano...');
        await handleBackgroundDiagnosis();
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

  // Manejar diagnóstico en segundo plano
  const handleBackgroundDiagnosis = useCallback(async () => {
    try {
      console.log('🔍 Ejecutando diagnóstico en segundo plano...');
      
      const companyId = await PayrollPeriodDetectionRobust['getCurrentUserCompanyId']?.();
      if (companyId) {
        console.log('🏢 DEBUG: Company ID obtenido:', companyId);
        await PayrollDiagnosticService.runDiagnosticAndLog(companyId);
        
        // Intentar detectar período nuevamente después del diagnóstico
        const retryStatus = await PayrollPeriodDetectionRobust.detectWithDiagnosis();
        console.log('🔄 DEBUG: Status después de diagnóstico:', retryStatus);
        
        if (retryStatus.currentPeriod) {
          setCurrentPeriod(retryStatus.currentPeriod);
          await loadEmployeesForPeriod(retryStatus.currentPeriod);
          setPeriodStatus(retryStatus);
        } else if (retryStatus.nextPeriod) {
          await createPeriodFromSuggestion(retryStatus.nextPeriod);
        }
      } else {
        console.log('❌ DEBUG: No se pudo obtener company ID');
      }
      
    } catch (error) {
      console.error('❌ Error en diagnóstico de segundo plano:', error);
    }
  }, []);

  // Crear período desde sugerencia
  const createPeriodFromSuggestion = useCallback(async (suggestion: any) => {
    try {
      setIsProcessing(true);
      console.log('🔄 Creando período desde sugerencia:', suggestion);
      
      const newPeriod = await PayrollPeriodDetectionRobust.createPeriodFromSuggestion(suggestion);
      console.log('✅ DEBUG: Período creado:', newPeriod);
      
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
      
      return newPeriod;
      
    } catch (error) {
      console.error('❌ Error creando período desde sugerencia:', error);
      toast({
        title: "Error",
        description: "No se pudo crear el período automáticamente",
        variant: "destructive"
      });
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, [toast]);

  // Cargar empleados para período
  const loadEmployeesForPeriod = useCallback(async (period: any) => {
    try {
      setIsProcessing(true);
      console.log('👥 Cargando empleados para período:', period?.periodo || 'sin período específico');
      console.log('📅 DEBUG: Período completo:', period);
      
      const loadedEmployees = await PayrollLiquidationNewService.loadEmployeesForActivePeriod(period);
      console.log('✅ DEBUG: Empleados cargados desde servicio:', loadedEmployees.length);
      console.log('📋 DEBUG: Lista de empleados:', loadedEmployees.map(emp => ({
        id: emp.id,
        name: emp.name,
        status: emp.status,
        baseSalary: emp.baseSalary
      })));
      
      setEmployees(loadedEmployees);
      
      // Actualizar contador de empleados en el período si existe
      if (period?.id) {
        console.log('📊 Actualizando contador de empleados en BD...');
        await PayrollLiquidationNewService.updateEmployeeCount(period.id, loadedEmployees.length);
      }
      
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
      
      return loadedEmployees;
      
    } catch (error) {
      console.error('❌ Error cargando empleados:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los empleados",
        variant: "destructive"
      });
      return [];
    } finally {
      setIsProcessing(false);
    }
  }, [toast]);

  // Crear período sugerido manualmente
  const createSuggestedPeriod = useCallback(async () => {
    if (!periodStatus?.nextPeriod) return;
    await createPeriodFromSuggestion(periodStatus.nextPeriod);
  }, [periodStatus, createPeriodFromSuggestion]);

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

  // Inicializar al montar
  useEffect(() => {
    initializeWithDiagnosis();
  }, [initializeWithDiagnosis]);

  // Debug logging para monitorear cambios de estado
  useEffect(() => {
    console.log('🔄 usePayrollLiquidationRobust - Estado actualizado:', {
      isLoading,
      isProcessing,
      employeesCount: employees.length,
      currentPeriodId: currentPeriod?.id,
      periodStatus: periodStatus?.action,
      summaryTotalEmployees: summary.totalEmployees,
      hasActivePeriod: periodStatus?.hasActivePeriod
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
    refreshDiagnosis: initializeWithDiagnosis,
    
    // Estados calculados simplificados
    canCreatePeriod: periodStatus?.action === 'create' && periodStatus?.nextPeriod,
    needsDiagnosis: false, // Eliminado para que nunca bloquee
    isEmergency: periodStatus?.action === 'emergency',
    hasActivePeriod: periodStatus?.hasActivePeriod || false,
    hasEmployees: employees.length > 0
  };
};
