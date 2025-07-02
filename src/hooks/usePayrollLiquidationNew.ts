import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { PayrollPeriod, PayrollEmployee, PayrollSummary } from '@/types/payroll';
import { PayrollPeriodIntelligentService, PeriodStatus } from '@/services/PayrollPeriodIntelligentService';
import { PayrollLiquidationNewService } from '@/services/PayrollLiquidationNewService';
import { PostClosureDetectionService } from '@/services/payroll-intelligent/PostClosureDetectionService';
import { PeriodNameUnifiedService } from '@/services/payroll-intelligent/PeriodNameUnifiedService';
import { CreateNovedadData } from '@/types/novedades-enhanced';

export const usePayrollLiquidationNew = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentPeriod, setCurrentPeriod] = useState<PayrollPeriod | null>(null);
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
  const { toast } = useToast();

  // 📅 Detección automática MEJORADA con servicios unificados
  const initializePeriod = useCallback(async (retryCount = 0) => {
    try {
      setIsLoading(true);
      console.log(`🚀 Inicializando con servicios unificados... (intento ${retryCount + 1})`);
      
      // Limpiar caches para asegurar datos frescos
      PeriodNameUnifiedService.clearCache();
      PostClosureDetectionService.clearCache();
      
      const status = await PayrollPeriodIntelligentService.detectCurrentPeriod();
      setPeriodStatus(status);
      
      if (status.currentPeriod) {
        console.log('✅ Período actual detectado:', status.currentPeriod.id);
        setCurrentPeriod(status.currentPeriod);
        await loadEmployeesForPeriod(status.currentPeriod);
      } else {
        console.log('ℹ️ No hay período actual, acción requerida:', status.action);
        console.log('💡 Mensaje:', status.message);
      }
      
      console.log('✅ Inicialización completada exitosamente');
      
    } catch (error) {
      console.error(`❌ Error en inicialización (intento ${retryCount + 1}):`, error);
      
      // RETRY LOGIC MEJORADO con límites más estrictos
      if (retryCount < 2) {
        const delay = (retryCount + 1) * 2000; // 2s, 4s
        console.log(`🔄 Reintentando en ${delay}ms...`);
        
        setTimeout(() => {
          initializePeriod(retryCount + 1);
        }, delay);
        return;
      }
      
      // Si fallan todos los reintentos
      console.error('💥 TODOS LOS REINTENTOS FALLARON');
      toast({
        title: "Error de Inicialización",
        description: "No se pudo inicializar el sistema. Intenta recargar la página.",
        variant: "destructive"
      });
      
      // Estado de error mejorado
      setPeriodStatus({
        hasActivePeriod: false,
        action: 'suggest_next',
        message: "Error en detección automática. Recarga la página o contacta soporte técnico."
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // 👥 Cargar empleados para el período activo
  const loadEmployeesForPeriod = useCallback(async (period: PayrollPeriod) => {
    try {
      setIsProcessing(true);
      console.log('👥 Cargando empleados para período:', period.periodo);
      
      const loadedEmployees = await PayrollLiquidationNewService.loadEmployeesForActivePeriod(period);
      setEmployees(loadedEmployees);
      setSelectedEmployees(loadedEmployees.map(emp => emp.id));
      
      calculateSummary(loadedEmployees);
      
      console.log('✅ Empleados cargados y liquidación calculada');
      
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

  // 📊 Calcular resumen de liquidación
  const calculateSummary = useCallback((employeeList: PayrollEmployee[]) => {
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

  // 🗑️ Remover empleado del período
  const removeEmployeeFromPeriod = useCallback(async (employeeId: string) => {
    if (!currentPeriod) return;
    
    try {
      setIsProcessing(true);
      
      await PayrollLiquidationNewService.removeEmployeeFromPeriod(employeeId, currentPeriod.id);
      
      const newEmployees = employees.filter(emp => emp.id !== employeeId);
      setEmployees(newEmployees);
      setSelectedEmployees(prev => prev.filter(id => id !== employeeId));
      
      calculateSummary(newEmployees);
      
      toast({
        title: "✅ Empleado removido",
        description: "El empleado ha sido removido del período de liquidación",
        className: "border-green-200 bg-green-50"
      });
      
    } catch (error) {
      console.error('❌ Error removiendo empleado:', error);
      toast({
        title: "Error",
        description: "No se pudo remover el empleado del período",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  }, [currentPeriod, employees, calculateSummary, toast]);

  // 📝 Crear novedad para empleado
  const createNovedadForEmployee = useCallback(async (employeeId: string, data: CreateNovedadData) => {
    if (!currentPeriod) return;
    
    try {
      setIsProcessing(true);
      
      const { NovedadesBackupService } = await import('@/services/NovedadesBackupService');
      await NovedadesBackupService.createNovedad({
        ...data,
        empleado_id: employeeId,
        periodo_id: currentPeriod.id
      });
      
      await loadEmployeesForPeriod(currentPeriod);
      
      toast({
        title: "✅ Novedad creada",
        description: "La novedad ha sido registrada exitosamente",
        className: "border-green-200 bg-green-50"
      });
      
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
  }, [currentPeriod, loadEmployeesForPeriod, toast]);

  // 🔄 Selección de empleados
  const toggleEmployeeSelection = useCallback((employeeId: string) => {
    setSelectedEmployees(prev => 
      prev.includes(employeeId) 
        ? prev.filter(id => id !== employeeId)
        : [...prev, employeeId]
    );
  }, []);

  const toggleAllEmployees = useCallback(() => {
    setSelectedEmployees(prev => 
      prev.length === employees.length ? [] : employees.map(emp => emp.id)
    );
  }, [employees]);

  const recalculateAll = useCallback(async () => {
    if (!currentPeriod) return;
    
    try {
      setIsProcessing(true);
      toast({
        title: "Recalculando...",
        description: "Actualizando liquidación de todos los empleados",
      });
      
      await loadEmployeesForPeriod(currentPeriod);
      
      toast({
        title: "✅ Recálculo completado",
        description: `Liquidación actualizada para ${employees.length} empleados`,
        className: "border-green-200 bg-green-50"
      });
      
    } catch (error) {
      console.error('❌ Error recalculando:', error);
      toast({
        title: "Error",
        description: "No se pudo recalcular la liquidación",
        variant: "destructive"
      });
    }
  }, [currentPeriod, loadEmployeesForPeriod, employees.length, toast]);

  // ✅ CIERRE MEJORADO CON SERVICIOS UNIFICADOS
  const closePeriod = useCallback(async () => {
    if (!currentPeriod) return;
    
    try {
      setIsProcessing(true);
      console.log('🔐 INICIANDO CIERRE CON SERVICIOS UNIFICADOS...');
      
      toast({
        title: "🔄 Cerrando período...",
        description: "Procesando liquidación con servicios mejorados",
      });
      
      // Ejecutar el cierre
      const result = await PayrollLiquidationNewService.closePeriod(currentPeriod, employees);
      
      console.log('✅ PERÍODO CERRADO EXITOSAMENTE');
      
      toast({
        title: "✅ Período cerrado exitosamente",
        description: result,
        className: "border-green-200 bg-green-50",
        duration: 6000
      });
      
      // FLUJO POST-CIERRE CON SERVICIOS UNIFICADOS
      console.log('🔄 Iniciando flujo post-cierre unificado...');
      
      // Limpiar estado inmediatamente
      setCurrentPeriod(null);
      setEmployees([]);
      setSelectedEmployees([]);
      setPeriodStatus(null);
      
      // Mostrar progreso
      toast({
        title: "🔄 Detectando siguiente período...",
        description: "Usando sistema de detección inteligente",
        className: "border-blue-200 bg-blue-50"
      });
      
      // DETECCIÓN POST-CIERRE MEJORADA
      const companyId = await PayrollPeriodIntelligentService.getCurrentUserCompanyId();
      if (companyId) {
        const postClosureResult = await PostClosureDetectionService.verifyClosureAndDetectNext(
          currentPeriod.id,
          companyId
        );

        if (postClosureResult.success) {
          console.log('✅ Detección post-cierre exitosa');
          
          // Esperar antes de reinicializar
          setTimeout(async () => {
            try {
              await initializePeriod(0);
              
              toast({
                title: "🎯 Sistema actualizado",
                description: "Período cerrado y siguiente período detectado correctamente.",
                className: "border-green-200 bg-green-50"
              });
            } catch (error) {
              console.error('❌ Error en reinicialización post-cierre:', error);
              showEmergencyOptions();
            }
          }, 3000);
        } else {
          console.log('⚠️ Detección post-cierre con problemas:', postClosureResult.message);
          showEmergencyOptions();
        }
      } else {
        showEmergencyOptions();
      }

    } catch (error) {
      console.error('💥 ERROR EN CIERRE:', error);
      toast({
        title: "❌ Error cerrando período",
        description: error instanceof Error ? error.message : "No se pudo cerrar el período",
        variant: "destructive",
        duration: 10000
      });
    } finally {
      setIsProcessing(false);
    }
  }, [currentPeriod, employees, initializePeriod, toast]);

  // 🚨 Opciones de emergencia mejoradas
  const showEmergencyOptions = useCallback(() => {
    setPeriodStatus({
      hasActivePeriod: false,
      action: 'suggest_next',
      message: "Período cerrado exitosamente. Recarga la página para continuar con el siguiente período."
    });

    toast({
      title: "⚠️ Acción requerida",
      description: "El período se cerró correctamente. Recarga la página para detectar el siguiente período.",
      className: "border-yellow-200 bg-yellow-50",
      duration: 15000
    });
  }, [toast]);

  // 🆕 Crear nuevo período (cuando se sugiere)
  const createNewPeriod = useCallback(async () => {
    if (!periodStatus?.nextPeriod) return;
    
    try {
      setIsProcessing(true);
      
      const companyId = await PayrollPeriodIntelligentService.getCurrentUserCompanyId();
      if (!companyId) throw new Error('No se encontró información de la empresa');
      
      const newPeriod = await PayrollPeriodIntelligentService.createAutomaticPeriod(
        companyId,
        {
          startDate: periodStatus.nextPeriod.startDate,
          endDate: periodStatus.nextPeriod.endDate
        },
        periodStatus.nextPeriod.type
      );
      
      setCurrentPeriod(newPeriod);
      await loadEmployeesForPeriod(newPeriod);
      
      toast({
        title: "✅ Nuevo período creado",
        description: `Período ${newPeriod.periodo} listo para liquidación`,
        className: "border-green-200 bg-green-50"
      });
      
    } catch (error) {
      console.error('❌ Error creando nuevo período:', error);
      toast({
        title: "Error",
        description: "No se pudo crear el nuevo período",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  }, [periodStatus, loadEmployeesForPeriod, toast]);

  // Inicializar al montar
  useEffect(() => {
    initializePeriod();
  }, [initializePeriod]);

  return {
    // Estado
    isLoading,
    isProcessing,
    currentPeriod,
    employees,
    selectedEmployees,
    summary,
    periodStatus,
    
    // Acciones
    removeEmployeeFromPeriod,
    createNovedadForEmployee,
    toggleEmployeeSelection,
    toggleAllEmployees,
    recalculateAll,
    closePeriod,
    createNewPeriod,
    refreshPeriod: initializePeriod,
    
    // Estados calculados
    canClosePeriod: currentPeriod?.estado === 'borrador' && employees.length > 0 && summary.validEmployees > 0,
    isValidPeriod: currentPeriod !== null,
    hasEmployees: employees.length > 0
  };
};
