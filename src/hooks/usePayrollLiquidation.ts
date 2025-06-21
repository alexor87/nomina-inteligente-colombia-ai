
import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { PayrollCalculationService } from '@/services/PayrollCalculationService';
import { PayrollPeriod, PayrollEmployee, PayrollSummary } from '@/types/payroll';
import { mockPeriod, mockEmployeesBase } from '@/data/mockPayrollData';
import { calculateEmployee, calculatePayrollSummary, convertToBaseEmployeeData } from '@/utils/payrollCalculations';

export const usePayrollLiquidation = () => {
  const { toast } = useToast();
  const [currentPeriod, setCurrentPeriod] = useState<PayrollPeriod>(mockPeriod);
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

  // Inicializar empleados
  useEffect(() => {
    const calculatedEmployees = mockEmployeesBase.map(emp => 
      calculateEmployee(emp, currentPeriod.type)
    );
    setEmployees(calculatedEmployees);
  }, [currentPeriod.type]);

  // Actualizar resumen
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

    // Simulación de guardado automático
    await new Promise(resolve => setTimeout(resolve, 300));
  }, [currentPeriod.type]);

  // Recalcular todos
  const recalculateAll = useCallback(async () => {
    setIsLoading(true);
    toast({
      title: "Recalculando nómina",
      description: "Aplicando configuración actual a todos los empleados..."
    });

    try {
      // Actualizar configuración del servicio
      PayrollCalculationService.updateConfiguration('2025');
      
      await new Promise(resolve => setTimeout(resolve, 1500));
      
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

  // Aprobar período
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
      description: "Cerrando nómina y preparando reportes..."
    });

    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setCurrentPeriod(prev => ({ ...prev, status: 'approved' }));
      
      toast({
        title: "¡Período aprobado!",
        description: "La nómina está lista para PILA y dispersión bancaria."
      });
    } catch (error) {
      toast({
        title: "Error al aprobar",
        description: "No se pudo aprobar el período.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast, employees]);

  const isValid = employees.every(emp => emp.status === 'valid') && employees.length > 0;

  return {
    currentPeriod,
    employees,
    summary,
    isValid,
    isLoading,
    updateEmployee,
    recalculateAll,
    approvePeriod
  };
};
