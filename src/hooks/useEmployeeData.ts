
import { useMemo } from 'react';
import { EmployeeWithStatus } from '@/types/employee-extended';
import { useEmployeeLoader } from './useEmployeeLoader';
import { EmployeeTransformationService } from '@/services/EmployeeTransformationService';

export const useEmployeeData = () => {
  const { data: rawEmployees = [], isLoading, error, refetch: loadEmployees } = useEmployeeLoader();
  
  console.log('🔍 useEmployeeData - Estado del hook:', {
    rawEmployeesCount: rawEmployees?.length || 0,
    isLoading,
    hasError: !!error,
    errorMessage: error?.message
  });
  
  // Transform raw data to EmployeeWithStatus
  const employees = useMemo(() => {
    if (!rawEmployees || rawEmployees.length === 0) {
      console.log('⚠️ useEmployeeData - No hay empleados para transformar');
      return [];
    }
    
    try {
      const transformed = EmployeeTransformationService.transformEmployeeData(rawEmployees);
      console.log('✅ useEmployeeData - Empleados transformados:', transformed.length);
      return transformed;
    } catch (transformError) {
      console.error('❌ useEmployeeData - Error transformando empleados:', transformError);
      return [];
    }
  }, [rawEmployees]);

  const isInitialized = !isLoading;

  // Log final state
  console.log('📊 useEmployeeData - Estado final:', {
    employeesCount: employees.length,
    isLoading,
    isInitialized,
    hasError: !!error
  });

  return {
    employees,
    loadEmployees,
    isLoading,
    isInitialized,
    error: error?.message || null
  };
};
