
import { useQuery } from '@tanstack/react-query';
import { useState, useMemo } from 'react';
import { EmployeeUnifiedService } from '@/services/EmployeeUnifiedService';
import { EmployeeUnified } from '@/types/employee-unified';

interface EmployeeFilters {
  search: string;
  status: string;
  department: string;
  sortBy: 'name' | 'date' | 'salary';
  sortOrder: 'asc' | 'desc';
}

export const useEmployeeList = () => {
  const [filters, setFilters] = useState<EmployeeFilters>({
    search: '',
    status: 'all',
    department: 'all',
    sortBy: 'name',
    sortOrder: 'asc'
  });

  const { 
    data: employees = [], 
    isLoading, 
    error, 
    refetch 
  } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      console.log('🔄 useEmployeeList: Fetching employees from service');
      const result = await EmployeeUnifiedService.getAll();
      
      if (result.success && result.data) {
        console.log('✅ useEmployeeList: Successfully fetched', result.data.length, 'employees');
        return result.data;
      } else {
        console.error('❌ useEmployeeList: Error fetching employees:', result.error);
        throw new Error(result.error || 'Error fetching employees');
      }
    },
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Convert EmployeeUnified to EmployeeWithStatus format
  const employeesWithStatus = useMemo(() => {
    return employees.map((employee: EmployeeUnified) => ({
      ...employee,
      // Ensure all required fields are present
      id: employee.id,
      empresaId: employee.empresaId,
    }));
  }, [employees]);

  const filteredEmployees = useMemo(() => {
    let filtered = [...employeesWithStatus];

    // Apply search filter
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filtered = filtered.filter(employee =>
        employee.nombre?.toLowerCase().includes(searchTerm) ||
        employee.apellido?.toLowerCase().includes(searchTerm) ||
        employee.cedula?.toLowerCase().includes(searchTerm) ||
        employee.email?.toLowerCase().includes(searchTerm) ||
        employee.cargo?.toLowerCase().includes(searchTerm)
      );
    }

    // Apply status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter(employee => employee.estado === filters.status);
    }

    // Apply department filter (using cargo as department for now)
    if (filters.department !== 'all') {
      filtered = filtered.filter(employee => employee.cargo === filters.department);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (filters.sortBy) {
        case 'name':
          comparison = (a.nombre || '').localeCompare(b.nombre || '');
          break;
        case 'date':
          comparison = new Date(a.fechaIngreso || '').getTime() - new Date(b.fechaIngreso || '').getTime();
          break;
        case 'salary':
          comparison = (a.salarioBase || 0) - (b.salarioBase || 0);
          break;
        default:
          comparison = 0;
      }

      return filters.sortOrder === 'desc' ? -comparison : comparison;
    });

    return filtered;
  }, [employeesWithStatus, filters]);

  const updateFilters = (newFilters: Partial<EmployeeFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const statistics = useMemo(() => {
    const total = employeesWithStatus.length;
    const active = employeesWithStatus.filter(emp => emp.estado === 'activo').length;
    const inactive = employeesWithStatus.filter(emp => emp.estado === 'inactivo').length;
    const onVacation = employeesWithStatus.filter(emp => emp.estado === 'vacaciones').length;
    const onLeave = employeesWithStatus.filter(emp => emp.estado === 'incapacidad').length;

    return {
      total,
      active,
      inactive,
      onVacation,
      onLeave
    };
  }, [employeesWithStatus]);

  return {
    employees: filteredEmployees,
    allEmployees: employeesWithStatus,
    isLoading,
    error,
    refetch,
    filters,
    updateFilters,
    statistics
  };
};
