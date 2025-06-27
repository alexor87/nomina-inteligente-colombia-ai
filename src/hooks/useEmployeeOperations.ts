
import { useCallback } from 'react';
import { EmployeeWithStatus } from '@/types/employee-extended';

export const useEmployeeOperations = (
  employees: EmployeeWithStatus[],
  setEmployees: (employees: EmployeeWithStatus[]) => void,
  isInitialized: boolean,
  isLoading: boolean
) => {
  // Find employee by ID
  const findEmployeeById = useCallback((employeeId: string): EmployeeWithStatus | undefined => {
    console.log('🔍 Finding employee by ID:', employeeId);
    console.log('📋 Available employees count:', employees.length);
    
    if (!isInitialized || isLoading) {
      console.log('⚠️ Data not ready yet, returning undefined');
      return undefined;
    }

    const foundEmployee = employees.find(emp => emp.id === employeeId);
    
    if (foundEmployee) {
      console.log('✅ Found employee:', foundEmployee.nombre, foundEmployee.apellido);
    } else {
      console.log('❌ Employee not found with ID:', employeeId);
    }
    
    return foundEmployee;
  }, [employees, isInitialized, isLoading]);

  // Update employee in list
  const updateEmployeeInList = useCallback((updatedEmployee: EmployeeWithStatus) => {
    console.log('🔄 Updating employee in list:', updatedEmployee.id);
    
    setEmployees(prevEmployees => 
      prevEmployees.map(emp => 
        emp.id === updatedEmployee.id ? updatedEmployee : emp
      )
    );
  }, [setEmployees]);

  return {
    findEmployeeById,
    updateEmployeeInList
  };
};
