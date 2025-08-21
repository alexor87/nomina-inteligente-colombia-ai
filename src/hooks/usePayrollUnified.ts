
import { useState, useCallback } from 'react';
import { PayrollUnifiedService } from '@/services/PayrollUnifiedService';
import { PayrollEmployee } from '@/types/payroll';

export const usePayrollUnified = () => {
  const [employees, setEmployees] = useState<PayrollEmployee[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string>('');
  const [currentPeriodId, setCurrentPeriodId] = useState<string>('');

  const loadEmployees = useCallback(async (periodId: string): Promise<void> => {
    try {
      setIsLoading(true);
      setError('');
      setCurrentPeriodId(periodId);
      
      const employeesData = await PayrollUnifiedService.getEmployeesForPeriod(periodId);
      
      // Map the employees to include proper naming
      const mappedEmployees = employeesData.map(emp => ({
        ...emp,
        // Ensure we have both naming conventions available
        nombre: emp.name?.split(' ')[0] || '',
        apellido: emp.name?.split(' ').slice(1).join(' ') || '',
        cargo: emp.position || '',
        salarioBase: emp.baseSalary || 0
      }));
      
      setEmployees(mappedEmployees);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading employees');
      console.error('Error loading employees:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const addEmployeeToPayroll = useCallback(async (employeeId: string, periodId: string): Promise<void> => {
    try {
      setIsSaving(true);
      await PayrollUnifiedService.addEmployeeToPeriod(employeeId, periodId);
      // Reload employees to reflect changes
      await loadEmployees(periodId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error adding employee');
      console.error('Error adding employee:', err);
    } finally {
      setIsSaving(false);
    }
  }, [loadEmployees]);

  const removeEmployeeFromPayroll = useCallback(async (employeeId: string, periodId: string): Promise<void> => {
    try {
      setIsSaving(true);
      await PayrollUnifiedService.removeEmployeeFromPeriod(employeeId, periodId);
      // Remove employee from local state
      setEmployees(prev => prev.filter(emp => emp.id !== employeeId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error removing employee');
      console.error('Error removing employee:', err);
    } finally {
      setIsSaving(false);
    }
  }, []);

  const updateEmployeeCalculations = useCallback(async (employeeId: string, periodId: string): Promise<void> => {
    try {
      setIsSaving(true);
      // Reload employees to get updated calculations
      await loadEmployees(periodId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error updating calculations');
      console.error('Error updating calculations:', err);
    } finally {
      setIsSaving(false);
    }
  }, [loadEmployees]);

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
