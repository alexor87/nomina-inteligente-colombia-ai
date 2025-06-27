
import { useEffect, useCallback, useMemo } from 'react';
import { EmployeeWithStatus } from '@/types/employee-extended';
import { EmployeeUnifiedService } from '@/services/EmployeeUnifiedService';
import { EmployeeTransformationService } from '@/services/EmployeeTransformationService';
import { EmployeeDataService } from '@/services/EmployeeDataService';

export const useEmployeeDataFixed = () => {
  const [employees, setEmployees] = React.useState<EmployeeWithStatus[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isInitialized, setIsInitialized] = React.useState(false);

  // Load employees function
  const loadEmployees = useCallback(async () => {
    console.log('🔄 Loading employees...');
    setIsLoading(true);
    
    try {
      const companyId = await EmployeeDataService.getCurrentUserCompanyId();
      if (!companyId) {
        console.warn('⚠️ No company ID found');
        setEmployees([]);
        return;
      }

      const rawEmployees = await EmployeeDataService.getEmployees(companyId);
      console.log('📋 Raw employees from database:', rawEmployees.length);
      
      const transformedEmployees = EmployeeTransformationService.transformEmployeeData(rawEmployees);
      console.log('✅ Transformed employees:', transformedEmployees.length);
      
      setEmployees(transformedEmployees);
      setIsInitialized(true);
    } catch (error) {
      console.error('❌ Error loading employees:', error);
      setEmployees([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

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
  }, []);

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
    loadEmployees();
  }, []);

  // Memoize the return object
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
