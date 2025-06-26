
import { useState, useMemo } from 'react';
import { EmployeeWithStatus, EmployeeFilters } from '@/types/employee-extended';
import { filterEmployees } from '@/utils/employeeFilters';

export const useEmployeeFiltering = (employees: EmployeeWithStatus[]) => {
  const [filters, setFilters] = useState<EmployeeFilters>({
    searchTerm: '',
    estado: '',
    tipoContrato: '',
    centroCosto: '',
    fechaIngresoInicio: '',
    fechaIngresoFin: '',
    nivelRiesgoARL: '',
    afiliacionIncompleta: undefined
  });

  const filteredEmployees = useMemo(() => {
    return filterEmployees(employees, filters);
  }, [employees, filters]);

  const updateFilters = (newFilters: Partial<EmployeeFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const clearFilters = () => {
    setFilters({
      searchTerm: '',
      estado: '',
      tipoContrato: '',
      centroCosto: '',
      fechaIngresoInicio: '',
      fechaIngresoFin: '',
      nivelRiesgoARL: '',
      afiliacionIncompleta: undefined
    });
  };

  return {
    filters,
    filteredEmployees,
    updateFilters,
    clearFilters
  };
};
