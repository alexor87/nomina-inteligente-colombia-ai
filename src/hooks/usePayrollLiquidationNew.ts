
import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { PayrollEmployee } from '@/types/payroll';
import { PayrollLiquidationNewService } from '@/services/PayrollLiquidationNewService';
import { useSmartPeriodDetection } from './useSmartPeriodDetection';

export const usePayrollLiquidationNew = () => {
  const [employees, setEmployees] = useState<PayrollEmployee[]>([]);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const {
    isLoading,
    isProcessing: isCreatingPeriod,
    periodStatus,
    createNewPeriod,
    refreshDetection
  } = useSmartPeriodDetection();

  // Estados calculados
  const currentPeriod = periodStatus?.currentPeriod;
  const isValidPeriod = Boolean(currentPeriod);
  const hasEmployees = employees.length > 0;
  const canClosePeriod = hasEmployees && selectedEmployees.length > 0 && currentPeriod?.estado === 'borrador';

  // Calcular resumen
  const summary = {
    totalEmployees: employees.length,
    validEmployees: employees.filter(emp => emp.status === 'valid').length,
    totalGrossPay: employees.reduce((sum, emp) => sum + emp.grossPay, 0),
    totalDeductions: employees.reduce((sum, emp) => sum + emp.deductions, 0),
    totalNetPay: employees.reduce((sum, emp) => sum + emp.netPay, 0),
    employerContributions: employees.reduce((sum, emp) => sum + emp.employerContributions, 0),
    totalPayrollCost: employees.reduce((sum, emp) => sum + emp.grossPay + emp.employerContributions, 0)
  };

  // Cargar empleados cuando hay un período válido
  const loadEmployees = useCallback(async () => {
    if (!currentPeriod) {
      console.log('📝 No hay período activo - Limpiando empleados');
      setEmployees([]);
      return;
    }

    try {
      console.log('🔄 Cargando empleados para período:', currentPeriod.periodo);
      const loadedEmployees = await PayrollLiquidationNewService.loadEmployeesForActivePeriod(currentPeriod);
      setEmployees(loadedEmployees);
      
      // Actualizar contador de empleados en el período
      if (loadedEmployees.length > 0) {
        await PayrollLiquidationNewService.updateEmployeeCount(currentPeriod.id, loadedEmployees.length);
      }
      
      console.log(`✅ Empleados cargados: ${loadedEmployees.length}`);
    } catch (error) {
      console.error('❌ Error cargando empleados:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los empleados",
        variant: "destructive"
      });
      setEmployees([]);
    }
  }, [currentPeriod, toast]);

  // Efecto para cargar empleados
  useEffect(() => {
    if (currentPeriod && !isLoading) {
      loadEmployees();
    } else if (!currentPeriod) {
      setEmployees([]);
      setSelectedEmployees([]);
    }
  }, [currentPeriod, isLoading, loadEmployees]);

  // Manejar selección de empleados
  const toggleEmployeeSelection = useCallback((employeeId: string) => {
    setSelectedEmployees(prev => 
      prev.includes(employeeId) 
        ? prev.filter(id => id !== employeeId)
        : [...prev, employeeId]
    );
  }, []);

  const toggleAllEmployees = useCallback(() => {
    const validEmployeeIds = employees.filter(emp => emp.status === 'valid').map(emp => emp.id);
    setSelectedEmployees(prev => 
      prev.length === validEmployeeIds.length ? [] : validEmployeeIds
    );
  }, [employees]);

  // Acciones de nómina
  const removeEmployeeFromPeriod = useCallback(async (employeeId: string) => {
    if (!currentPeriod) return;

    try {
      await PayrollLiquidationNewService.removeEmployeeFromPeriod(employeeId, currentPeriod.id);
      setEmployees(prev => prev.filter(emp => emp.id !== employeeId));
      setSelectedEmployees(prev => prev.filter(id => id !== employeeId));
      
      toast({
        title: "Empleado removido",
        description: "El empleado ha sido removido del período",
      });
    } catch (error) {
      console.error('Error removiendo empleado:', error);
      toast({
        title: "Error",
        description: "No se pudo remover el empleado",
        variant: "destructive"
      });
    }
  }, [currentPeriod, toast]);

  const createNovedadForEmployee = useCallback(async (employeeId: string, novedad: any) => {
    // Implementar lógica de novedades
    console.log('Crear novedad para empleado:', employeeId, novedad);
  }, []);

  const recalculateAfterNovedadChange = useCallback(async (employeeId: string) => {
    // Implementar recálculo
    console.log('Recalcular empleado:', employeeId);
  }, []);

  const recalculateAll = useCallback(async () => {
    if (!currentPeriod) return;
    
    setIsProcessing(true);
    try {
      await loadEmployees();
      toast({
        title: "Recálculo completado",
        description: "Todos los empleados han sido recalculados",
      });
    } finally {
      setIsProcessing(false);
    }
  }, [currentPeriod, loadEmployees, toast]);

  const closePeriod = useCallback(async () => {
    if (!currentPeriod || !canClosePeriod) return;

    setIsProcessing(true);
    try {
      const message = await PayrollLiquidationNewService.closePeriod(currentPeriod, employees);
      toast({
        title: "Período cerrado",
        description: message,
      });
      
      // Refrescar detección para actualizar estado
      await refreshDetection();
    } catch (error) {
      console.error('Error cerrando período:', error);
      toast({
        title: "Error",
        description: "No se pudo cerrar el período",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  }, [currentPeriod, canClosePeriod, employees, toast, refreshDetection]);

  return {
    // Estado
    isLoading,
    isProcessing: isProcessing || isCreatingPeriod,
    currentPeriod,
    employees,
    selectedEmployees,
    summary,
    periodStatus,
    
    // Estados calculados
    isValidPeriod,
    hasEmployees,
    canClosePeriod,
    
    // Acciones
    removeEmployeeFromPeriod,
    createNovedadForEmployee,
    recalculateAfterNovedadChange,
    toggleEmployeeSelection,
    toggleAllEmployees,
    recalculateAll,
    closePeriod,
    createNewPeriod,
    refreshPeriod: refreshDetection
  };
};
