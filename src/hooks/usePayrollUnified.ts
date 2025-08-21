import { useState, useCallback } from 'react';
import { PayrollEmployee, BaseEmployeeData } from '@/types/payroll';
import { useToast } from '@/hooks/use-toast';
import { calculateEmployeeBackend } from '@/utils/payrollCalculationsBackend';
import { useEmployeeData } from './useEmployeeData';
import { PayrollUnifiedService } from '@/services/PayrollUnifiedService';

export const usePayrollUnified = () => {
  const [employees, setEmployees] = useState<PayrollEmployee[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const [currentPeriodId, setCurrentPeriodId] = useState<string | null>(null);

  const { employees: allEmployees, loadEmployees: loadAllEmployees } = useEmployeeData();

  const loadEmployees = useCallback(async (periodId: string) => {
    try {
      setIsLoading(true);
      setCurrentPeriodId(periodId);
      setError(null);

      await loadAllEmployees();

      const periodEmployees = await PayrollUnifiedService.getEmployeesForPeriod(periodId);

      const calculatedEmployees = await Promise.all(
        periodEmployees.map(async (emp) => {
          const baseData: BaseEmployeeData = {
            id: emp.id,
            name: `${emp.nombre} ${emp.apellido}`.trim(),
            position: emp.cargo || 'No especificado',
            baseSalary: emp.salarioBase || 0,
            workedDays: 15,
            extraHours: 0,
            disabilities: 0,
            bonuses: 0,
            absences: 0,
            eps: emp.eps || 'No asignada',
            afp: emp.afp || 'No asignada',
            novedades: []
          };
          return await processEmployeeCalculation(baseData);
        })
      );

      setEmployees(calculatedEmployees);
    } catch (err) {
      console.error('Error loading employees:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
      toast({
        title: "Error al cargar empleados",
        description: error || "No se pudieron cargar los empleados para este período",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [allEmployees, loadAllEmployees, toast, error]);

  const addEmployeeToPayroll = useCallback(async (employeeId: string, periodId: string) => {
    setIsSaving(true);
    try {
      const employeeToAdd = allEmployees.find(emp => emp.id === employeeId);
      if (!employeeToAdd) {
        throw new Error('Empleado no encontrado');
      }

      const baseData: BaseEmployeeData = {
        id: employeeToAdd.id,
        name: `${employeeToAdd.nombre} ${employeeToAdd.apellido}`.trim(),
        position: employeeToAdd.cargo || 'No especificado',
        baseSalary: employeeToAdd.salarioBase || 0,
        workedDays: 15,
        extraHours: 0,
        disabilities: 0,
        bonuses: 0,
        absences: 0,
        eps: employeeToAdd.eps || 'No asignada',
        afp: employeeToAdd.afp || 'No asignada',
        novedades: []
      };

      const calculatedEmployee = await processEmployeeCalculation(baseData);

      await PayrollUnifiedService.addEmployeeToPeriod(employeeId, periodId);

      setEmployees(prev => [...prev, calculatedEmployee]);
      toast({
        title: "Empleado agregado",
        description: `${employeeToAdd.nombre} ${employeeToAdd.apellido} ha sido agregado a la nómina.`,
        className: "border-green-200 bg-green-50"
      });
    } catch (err) {
      console.error('Error adding employee to payroll:', err);
      toast({
        title: "Error al agregar empleado",
        description: err instanceof Error ? err.message : 'Error desconocido',
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  }, [allEmployees, toast]);

  const removeEmployeeFromPayroll = useCallback(async (employeeId: string, periodId: string) => {
    setIsSaving(true);
    try {
      await PayrollUnifiedService.removeEmployeeFromPeriod(employeeId, periodId);
      setEmployees(prev => prev.filter(emp => emp.id !== employeeId));
      toast({
        title: "Empleado removido",
        description: "El empleado ha sido removido de la nómina",
        className: "border-orange-200 bg-orange-50"
      });
    } catch (err) {
      console.error('Error removing employee from payroll:', err);
      toast({
        title: "Error al remover empleado",
        description: err instanceof Error ? err.message : 'Error desconocido',
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  }, [toast]);

  const updateEmployeeCalculations = useCallback(async (employeeId: string, periodId: string) => {
    setIsSaving(true);
    try {
      const employeeToUpdate = employees.find(emp => emp.id === employeeId);
      if (!employeeToUpdate) {
        throw new Error('Empleado no encontrado en la nómina');
      }

      const baseData: BaseEmployeeData = {
        id: employeeToUpdate.id,
        name: employeeToUpdate.name,
        position: employeeToUpdate.position,
        baseSalary: employeeToUpdate.baseSalary,
        workedDays: employeeToUpdate.workedDays,
        extraHours: employeeToUpdate.extraHours,
        disabilities: employeeToUpdate.disabilities,
        bonuses: employeeToUpdate.bonuses,
        absences: employeeToUpdate.absences,
        eps: employeeToUpdate.eps,
        afp: employeeToUpdate.afp,
        novedades: []
      };

      const updatedEmployee = await processEmployeeCalculation(baseData);

      setEmployees(prev =>
        prev.map(emp => (emp.id === employeeId ? updatedEmployee : emp))
      );

      toast({
        title: "Cálculos actualizados",
        description: `Cálculos de ${updatedEmployee.name} actualizados correctamente.`,
        className: "border-blue-200 bg-blue-50"
      });
    } catch (err) {
      console.error('Error updating employee calculations:', err);
      toast({
        title: "Error al actualizar cálculos",
        description: err instanceof Error ? err.message : 'Error desconocido',
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  }, [employees, toast]);

  const processEmployeeCalculation = async (baseData: BaseEmployeeData): Promise<PayrollEmployee> => {
    try {
      const result = await calculateEmployeeBackend(baseData, 'quincenal');
      return {
        ...result,
        // Ensure all required fields are present
        ibc: result.ibc || result.grossPay || 0,
        effectiveWorkedDays: result.effectiveWorkedDays || result.workedDays || 15,
        incapacityDays: result.incapacityDays || 0,
        incapacityValue: result.incapacityValue || 0,
        legalBasis: result.legalBasis || 'Cálculo estándar'
      };
    } catch (error) {
      console.error('Error calculating employee:', error);
      return {
        ...baseData,
        grossPay: 0,
        deductions: 0,
        netPay: 0,
        transportAllowance: 0,
        employerContributions: 0,
        status: 'error' as const,
        errors: [error instanceof Error ? error.message : 'Error desconocido'],
        healthDeduction: 0,
        pensionDeduction: 0,
        ibc: 0,
        effectiveWorkedDays: 0,
        incapacityDays: 0,
        incapacityValue: 0,
        legalBasis: 'Error en cálculo'
      };
    }
  };

  return {
    employees,
    isLoading,
    isSaving,
    error,
    currentPeriodId,
    loadEmployees,
    addEmployeeToPayroll,
    removeEmployeeFromPayroll,
    updateEmployeeCalculations
  };
};
