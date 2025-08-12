import { useMemo } from 'react';
import { Employee } from '@/types/employee';
import { EmployeeWithStatus } from '@/types/employee-extended';
import { useEmployeeLoader } from './useEmployeeLoader';
import { useEmployeeOperations } from './useEmployeeOperations';
import { EmployeeTransformationService } from '@/services/EmployeeTransformationService';

export const useEmployeeData = () => {
  const { data: rawEmployees = [], isLoading, refetch: loadEmployees } = useEmployeeLoader();
  
  // Transform raw data to EmployeeWithStatus
  const employees = useMemo(() => {
    if (!rawEmployees || rawEmployees.length === 0) return [];
    return EmployeeTransformationService.transformEmployeeData(rawEmployees);
  }, [rawEmployees]);

  const isInitialized = !isLoading;

  const {
    createEmployee,
    updateEmployee,
    deleteEmployee,
    isCreating,
    isUpdating,
    isDeleting
  } = useEmployeeOperations();

  return {
    employees,
    loadEmployees,
    isLoading,
    isInitialized,
    createEmployee,
    updateEmployee,
    deleteEmployee,
    isCreating,
    isUpdating,
    isDeleting
  };
};
