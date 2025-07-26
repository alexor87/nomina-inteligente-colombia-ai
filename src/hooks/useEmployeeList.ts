
import { useState, useEffect, useMemo } from 'react';
import { EmployeeUnified } from '@/types/employee-unified';
import { EmployeeUnifiedService } from '@/services/EmployeeUnifiedService';

export interface EmployeeFilters {
  searchTerm: string;
  estado: string;
  tipoContrato: string;
}

export interface EmployeeListHook {
  employees: EmployeeUnified[];
  isLoading: boolean;
  error: string | null;
  filters: EmployeeFilters;
  setFilters: (filters: Partial<EmployeeFilters>) => void;
  selectedEmployees: string[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
  };
  clearFilters: () => void;
  toggleEmployeeSelection: (id: string) => void;
  toggleAllEmployees: () => void;
  totalEmployees: number;
  filteredCount: number;
  refreshEmployees: () => Promise<void>;
  forceCompleteRefresh: () => Promise<void>;
  getComplianceIndicators: () => any;
  clearSelection: () => void;
  statistics: {
    active: number;
    inactive: number;
    onVacation: number;
    onLeave: number;
  };
}

export const useEmployeeList = (): EmployeeListHook => {
  const [employees, setEmployees] = useState<EmployeeUnified[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [filters, setFiltersState] = useState<EmployeeFilters>({
    searchTerm: '',
    estado: '',
    tipoContrato: ''
  });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const setFilters = (newFilters: Partial<EmployeeFilters>) => {
    setFiltersState(prev => ({ ...prev, ...newFilters }));
    setCurrentPage(1); // Reset to first page when filtering
  };

  const clearFilters = () => {
    setFiltersState({
      searchTerm: '',
      estado: '',
      tipoContrato: ''
    });
    setCurrentPage(1);
  };

  const loadEmployees = async () => {
    try {
      console.log('🔄 [HOOK] Loading employees...');
      setIsLoading(true);
      setError(null);
      
      console.log('🔄 [HOOK] Calling EmployeeUnifiedService.getAll()...');
      const result = await EmployeeUnifiedService.getAll();
      
      console.log('🔄 [HOOK] Service result:', result);
      
      if (result.success && result.data) {
        setEmployees(result.data);
        console.log(`✅ [HOOK] Loaded ${result.data.length} employees successfully`);
      } else {
        const errorMsg = result.error || 'Error loading employees';
        setError(errorMsg);
        console.error('❌ [HOOK] Failed to load employees:', errorMsg);
      }
    } catch (err: any) {
      const errorMsg = err.message || 'Error loading employees';
      setError(errorMsg);
      console.error('❌ [HOOK] Exception loading employees:', err);
    } finally {
      setIsLoading(false);
      console.log('🔄 [HOOK] Loading complete, isLoading set to false');
    }
  };

  useEffect(() => {
    loadEmployees();
  }, []);

  // Filter employees based on current filters
  const filteredEmployees = useMemo(() => {
    return employees.filter(employee => {
      const matchesSearch = !filters.searchTerm || 
        employee.nombre.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
        employee.apellido.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
        employee.cedula.includes(filters.searchTerm);
      
      const matchesStatus = !filters.estado || employee.estado === filters.estado;
      const matchesContract = !filters.tipoContrato || employee.tipoContrato === filters.tipoContrato;
      
      return matchesSearch && matchesStatus && matchesContract;
    });
  }, [employees, filters]);

  // Pagination
  const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedEmployees = filteredEmployees.slice(startIndex, startIndex + itemsPerPage);

  const pagination = {
    currentPage,
    totalPages,
    totalItems: filteredEmployees.length,
    itemsPerPage
  };

  // Statistics
  const statistics = useMemo(() => {
    return {
      active: employees.filter(e => e.estado === 'activo').length,
      inactive: employees.filter(e => e.estado === 'inactivo').length,
      onVacation: employees.filter(e => e.estado === 'vacaciones').length,
      onLeave: employees.filter(e => e.estado === 'incapacidad').length
    };
  }, [employees]);

  const toggleEmployeeSelection = (id: string) => {
    setSelectedEmployees(prev =>
      prev.includes(id)
        ? prev.filter(empId => empId !== id)
        : [...prev, id]
    );
  };

  const toggleAllEmployees = () => {
    const currentPageIds = paginatedEmployees.map(emp => emp.id);
    const allSelected = currentPageIds.every(id => selectedEmployees.includes(id));
    
    if (allSelected) {
      setSelectedEmployees(prev => prev.filter(id => !currentPageIds.includes(id)));
    } else {
      setSelectedEmployees(prev => [...new Set([...prev, ...currentPageIds])]);
    }
  };

  const clearSelection = () => {
    setSelectedEmployees([]);
  };

  const refreshEmployees = async () => {
    await loadEmployees();
  };

  const forceCompleteRefresh = async () => {
    clearSelection();
    await loadEmployees();
  };

  const getComplianceIndicators = () => {
    return {
      totalEmployees: employees.length,
      completeProfiles: employees.filter(e => e.eps && e.afp && e.arl).length,
      missingAffiliations: employees.filter(e => !e.eps || !e.afp || !e.arl).length
    };
  };

  return {
    employees: paginatedEmployees,
    isLoading,
    error,
    filters,
    setFilters,
    selectedEmployees,
    pagination,
    clearFilters,
    toggleEmployeeSelection,
    toggleAllEmployees,
    totalEmployees: employees.length,
    filteredCount: filteredEmployees.length,
    refreshEmployees,
    forceCompleteRefresh,
    getComplianceIndicators,
    clearSelection,
    statistics
  };
};
