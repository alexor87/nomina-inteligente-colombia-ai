import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { PayrollPeriod, PayrollEmployee, PayrollSummary } from '@/types/payroll';
import { PayrollPeriodIntelligentService, PeriodStatus } from '@/services/PayrollPeriodIntelligentService';
import { PayrollLiquidationNewService } from '@/services/PayrollLiquidationNewService';
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

  // 📅 Detección automática al cargar
  const initializePeriod = useCallback(async () => {
    try {
      setIsLoading(true);
      console.log('🚀 Inicializando módulo de liquidación...');
      
      const status = await PayrollPeriodIntelligentService.detectCurrentPeriod();
      setPeriodStatus(status);
      
      if (status.currentPeriod) {
        setCurrentPeriod(status.currentPeriod);
        await loadEmployeesForPeriod(status.currentPeriod);
      }
      
      console.log('✅ Módulo de liquidación inicializado:', status.message);
      
    } catch (error) {
      console.error('❌ Error inicializando período:', error);
      toast({
        title: "Error",
        description: "No se pudo inicializar el período de liquidación",
        variant: "destructive"
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
      setSelectedEmployees(loadedEmployees.map(emp => emp.id)); // Seleccionar todos por defecto
      
      // Calcular resumen
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
      
      // Actualizar estado local
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
      
      // Crear la novedad
      await import('@/services/NovedadesBackupService').then(({ NovedadesBackupService }) => 
        NovedadesBackupService.createNovedad({
          ...data,
          empleado_id: employeeId,
          periodo_id: currentPeriod.id
        })
      );
      
      // Recargar empleados para reflejar cambios
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

  // 🔄 Recalcular todos los empleados
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

  // ✅ Cerrar período
  const closePeriod = useCallback(async () => {
    if (!currentPeriod) return;
    
    try {
      setIsProcessing(true);
      
      const result = await PayrollLiquidationNewService.closePeriod(currentPeriod, employees);
      
      toast({
        title: "✅ Período cerrado",
        description: result,
        className: "border-green-200 bg-green-50"
      });
      
      // Reinicializar para detectar siguiente período
      await initializePeriod();
      
    } catch (error) {
      console.error('❌ Error cerrando período:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo cerrar el período",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  }, [currentPeriod, employees, initializePeriod, toast]);

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
