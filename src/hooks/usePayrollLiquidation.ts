
import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { PayrollLiquidationService } from '@/services/PayrollLiquidationService';
import { PayrollPeriod, PayrollEmployee, PayrollSummary } from '@/types/payroll';
import { calculateEmployee, calculatePayrollSummary, convertToBaseEmployeeData } from '@/utils/payrollCalculations';

export const usePayrollLiquidation = () => {
  const { toast } = useToast();
  const [currentPeriod, setCurrentPeriod] = useState<PayrollPeriod>({
    id: 'current',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: 'draft',
    type: 'quincenal'
  });
  
  const [employees, setEmployees] = useState<PayrollEmployee[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [summary, setSummary] = useState<PayrollSummary>({
    totalEmployees: 0,
    validEmployees: 0,
    totalGrossPay: 0,
    totalDeductions: 0,
    totalNetPay: 0,
    employerContributions: 0,
    totalPayrollCost: 0
  });

  // Cargar empleados reales desde la base de datos
  const loadEmployees = useCallback(async () => {
    setIsLoading(true);
    try {
      // TODO: Obtener companyId del contexto de autenticación
      const companyId = 'sample-company-id';
      const loadedEmployees = await PayrollLiquidationService.loadEmployeesForLiquidation(companyId);
      setEmployees(loadedEmployees);
      
      toast({
        title: "Empleados cargados",
        description: `Se cargaron ${loadedEmployees.length} empleados activos`
      });
    } catch (error) {
      console.error('Error loading employees:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los empleados",
        variant: "destructive"
      });
      // Fallback a datos mock si hay error
      setEmployees([]);
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Cargar empleados al montar el componente
  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  // Actualizar resumen cuando cambien los empleados
  useEffect(() => {
    setSummary(calculatePayrollSummary(employees));
  }, [employees]);

  // Actualizar empleado
  const updateEmployee = useCallback(async (id: string, field: string, value: number) => {
    setEmployees(prev => prev.map(emp => {
      if (emp.id === id) {
        const updated = convertToBaseEmployeeData(emp);
        const updatedWithNewValue = { ...updated, [field]: value };
        return calculateEmployee(updatedWithNewValue, currentPeriod.type);
      }
      return emp;
    }));
  }, [currentPeriod.type]);

  // Recalcular todos los empleados
  const recalculateAll = useCallback(async () => {
    setIsLoading(true);
    toast({
      title: "Recalculando nómina",
      description: "Aplicando configuración actual a todos los empleados..."
    });

    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setEmployees(prev => prev.map(emp => {
        const baseData = convertToBaseEmployeeData(emp);
        return calculateEmployee(baseData, currentPeriod.type);
      }));

      toast({
        title: "Recálculo completado",
        description: "Todos los cálculos han sido actualizados exitosamente."
      });
    } catch (error) {
      toast({
        title: "Error en recálculo",
        description: "No se pudo completar el recálculo.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast, currentPeriod.type]);

  // Aprobar período y guardar en base de datos
  const approvePeriod = useCallback(async () => {
    const invalidEmployees = employees.filter(emp => emp.status !== 'valid');
    if (invalidEmployees.length > 0) {
      toast({
        title: "No se puede aprobar",
        description: `Corrige los errores en ${invalidEmployees.length} empleado(s) antes de aprobar.`,
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    toast({
      title: "Aprobando período",
      description: "Guardando nómina y generando comprobantes..."
    });

    try {
      // TODO: Obtener companyId del contexto de autenticación
      const companyId = 'sample-company-id';
      
      const liquidationData = {
        period: currentPeriod,
        employees,
        companyId
      };

      const message = await PayrollLiquidationService.savePayrollLiquidation(liquidationData);
      
      setCurrentPeriod(prev => ({ ...prev, status: 'approved' }));
      
      toast({
        title: "¡Período aprobado!",
        description: message
      });
    } catch (error) {
      console.error('Error approving period:', error);
      toast({
        title: "Error al aprobar",
        description: error instanceof Error ? error.message : "No se pudo aprobar el período.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast, employees, currentPeriod]);

  const isValid = employees.every(emp => emp.status === 'valid') && employees.length > 0;

  return {
    currentPeriod,
    employees,
    summary,
    isValid,
    isLoading,
    updateEmployee,
    recalculateAll,
    approvePeriod,
    refreshEmployees: loadEmployees
  };
};
