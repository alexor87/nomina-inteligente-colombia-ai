
import { useState, useEffect, useMemo } from 'react';
import { EmployeeUnified } from '@/types/employee-unified';
import { EmployeeUnifiedService } from '@/services/EmployeeUnifiedService';
import { useToast } from '@/hooks/use-toast';

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
  deleteEmployee: (id: string) => Promise<void>;
  deleteMultipleEmployees: (ids: string[]) => Promise<void>;
  isDeleting: boolean;
  statistics: {
    active: number;
    inactive: number;
    onVacation: number;
    onLeave: number;
  };
}

export const useEmployeeList = (): EmployeeListHook => {
  const { toast } = useToast();
  const [employees, setEmployees] = useState<EmployeeUnified[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
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
      setIsLoading(true);
      setError(null);
      
      const result = await EmployeeUnifiedService.getAll();
      if (result.success && result.data) {
        setEmployees(result.data);
      } else {
        setError(result.error || 'Error loading employees');
      }
    } catch (err: any) {
      setError(err.message || 'Error loading employees');
    } finally {
      setIsLoading(false);
    }
  };

  const deleteEmployee = async (id: string) => {
    try {
      setIsDeleting(true);
      const result = await EmployeeUnifiedService.delete(id);
      
      if (result.success) {
        toast({
          title: "Empleado eliminado",
          description: "El empleado ha sido eliminado exitosamente.",
        });
        
        // Remove from selected employees if it was selected
        setSelectedEmployees(prev => prev.filter(empId => empId !== id));
        
        // Refresh the list
        await loadEmployees();
      } else {
        toast({
          title: "Error al eliminar",
          description: result.error || "No se pudo eliminar el empleado.",
          variant: "destructive",
        });
      }
    } catch (err: any) {
      toast({
        title: "Error al eliminar",
        description: err.message || "No se pudo eliminar el empleado.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const deleteMultipleEmployees = async (ids: string[]) => {
    try {
      setIsDeleting(true);
      let successCount = 0;
      let errorCount = 0;

      for (const id of ids) {
        try {
          const result = await EmployeeUnifiedService.delete(id);
          if (result.success) {
            successCount++;
          } else {
            errorCount++;
          }
        } catch {
          errorCount++;
        }
      }

      if (successCount > 0) {
        toast({
          title: "Eliminación completada",
          description: `${successCount} empleados eliminados exitosamente${errorCount > 0 ? `. ${errorCount} no pudieron ser eliminados.` : '.'}`,
        });
        
        // Clear selection
        setSelectedEmployees([]);
        
        // Refresh the list
        await loadEmployees();
      } else {
        toast({
          title: "Error en eliminación",
          description: "No se pudo eliminar ningún empleado.",
          variant: "destructive",
        });
      }
    } catch (err: any) {
      toast({
        title: "Error en eliminación múltiple",
        description: err.message || "Ocurrió un error durante la eliminación.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
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
    isDeleting,
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
    deleteEmployee,
    deleteMultipleEmployees,
    statistics
  };
};
