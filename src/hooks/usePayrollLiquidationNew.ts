
import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { PayrollPeriod, PayrollEmployee, PayrollSummary } from '@/types/payroll';
import { PayrollPeriodIntelligentService, PeriodStatus } from '@/services/PayrollPeriodIntelligentService';
import { PayrollLiquidationNewService } from '@/services/PayrollLiquidationNewService';

export const usePayrollLiquidationNew = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentPeriod, setCurrentPeriod] = useState<PayrollPeriod | null>(null);
  const [employees, setEmployees] = useState<PayrollEmployee[]>([]);
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

  // 🔄 Actualizar empleado individual
  const updateEmployee = useCallback(async (employeeId: string, field: string, value: number) => {
    if (!currentPeriod) return;
    
    try {
      setIsProcessing(true);
      
      const employeeIndex = employees.findIndex(emp => emp.id === employeeId);
      if (employeeIndex === -1) return;
      
      const updates = { [field]: value };
      const updatedEmployee = await PayrollLiquidationNewService.recalculateEmployee(
        employeeId, 
        currentPeriod, 
        updates
      );
      
      const newEmployees = [...employees];
      newEmployees[employeeIndex] = updatedEmployee;
      setEmployees(newEmployees);
      
      calculateSummary(newEmployees);
      
      console.log('✅ Empleado actualizado:', updatedEmployee.name);
      
    } catch (error) {
      console.error('❌ Error actualizando empleado:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el empleado",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  }, [currentPeriod, employees, calculateSummary, toast]);

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
    summary,
    periodStatus,
    
    // Acciones
    updateEmployee,
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
