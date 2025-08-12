
import { useEffect, useCallback, useMemo } from 'react';
import { EmployeeWithStatus } from '@/types/employee-extended';
import { useEmployeeLoader } from './useEmployeeLoader';
import { useEmployeeOperations } from './useEmployeeOperations';
import { EmployeeTransformationService } from '@/services/EmployeeTransformationService';

export const useEmployeeData = () => {
  const employeeQuery = useEmployeeLoader();
  
  // Transform raw database data to EmployeeWithStatus format
  const employees = useMemo(() => {
    if (!employeeQuery.data) return [];
    return EmployeeTransformationService.transformEmployeeData(employeeQuery.data);
  }, [employeeQuery.data]);
  
  const isLoading = employeeQuery.isLoading;
  const isInitialized = !employeeQuery.isLoading && employeeQuery.data !== undefined;

  // Mock setEmployees and loadEmployees for backward compatibility
  const setEmployees = useCallback(() => {
    // This is now handled by React Query automatically
    console.log('setEmployees called - handled by React Query');
  }, []);

  const loadEmployees = useCallback(() => {
    employeeQuery.refetch();
  }, [employeeQuery]);

  const {
    findEmployeeById,
    updateEmployeeInList
  } = useEmployeeOperations(employees, setEmployees, isInitialized, isLoading);

  // Retry function for finding employees
  const retryFindEmployeeById = useCallback(async (employeeId: string): Promise<EmployeeWithStatus | undefined> => {
    console.log('🔄 RETRY: Attempting to reload data and find employee:', employeeId);
    
    // First try to find in current data
    let employee = findEmployeeById(employeeId);
    if (employee) {
      console.log('✅ RETRY: Found employee in current data');
      return employee;
    }
    
    // If not found, reload all data
    console.log('🔄 RETRY: Employee not found, reloading all data...');
    await loadEmployees();
    
    // Try again after reload
    employee = findEmployeeById(employeeId);
    if (employee) {
      console.log('✅ RETRY: Found employee after reload');
    } else {
      console.log('❌ RETRY: Employee still not found after reload');
    }
    
    return employee;
  }, [findEmployeeById, loadEmployees]);

  // Load employees on mount
  useEffect(() => {
    if (!employeeQuery.data && !employeeQuery.isLoading) {
      loadEmployees();
    }
  }, []); // Empty dependency array is intentional

  // Memoize the return object to prevent unnecessary re-renders
  const returnValue = useMemo(() => ({
    employees,
    isLoading,
    isInitialized,
    refreshEmployees: loadEmployees,
    findEmployeeById,
    updateEmployeeInList,
    retryFindEmployeeById
  }), [employees, isLoading, isInitialized, loadEmployees, findEmployeeById, updateEmployeeInList, retryFindEmployeeById]);

  return returnValue;
};
