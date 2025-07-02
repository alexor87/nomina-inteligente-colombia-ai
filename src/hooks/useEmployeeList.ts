
import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useRealtimeEmployees } from '@/hooks/useRealtimeEmployees';
import { EmployeeService } from '@/services/EmployeeService';
import { EmployeeUnified } from '@/types/employee-unified';
import { usePagination } from '@/hooks/usePagination';
import { useEmployeeFiltering } from '@/hooks/useEmployeeFiltering';
import { useEmployeeSelection } from '@/hooks/useEmployeeSelection';
import { useEmployeeCompliance } from '@/hooks/useEmployeeCompliance';
import { useQueryClient } from '@tanstack/react-query';

export const useEmployeeList = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [allEmployees, setAllEmployees] = useState<EmployeeUnified[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<number>(Date.now());

  // Filtros y paginación
  const {
    filters,
    filteredEmployees,
    updateFilters,
    clearFilters,
    totalEmployees,
    filteredCount
  } = useEmployeeFiltering(allEmployees);

  // Paginación
  const pagination = usePagination(filteredEmployees, {
    defaultPageSize: 10
  });

  // Selección de empleados
  const {
    selectedEmployees,
    toggleEmployeeSelection,
    toggleAllEmployees: toggleAllEmployeesBase,
    clearSelection
  } = useEmployeeSelection();

  // Compliance indicators
  const { getComplianceIndicators } = useEmployeeCompliance();

  // Obtener empleados paginados
  const employees = pagination.paginatedItems;

  const toggleAllEmployees = useCallback(() => {
    const currentPageEmployeeIds = employees.map(emp => emp.id);
    toggleAllEmployeesBase(currentPageEmployeeIds);
  }, [employees, toggleAllEmployeesBase]);

  const invalidateAllCaches = useCallback(() => {
    console.log('🗑️ Invalidating caches...');
    queryClient.invalidateQueries({ queryKey: ['employees'] });
    queryClient.removeQueries({ queryKey: ['employees'] });
  }, [queryClient]);

  const loadEmployees = useCallback(async (force = false) => {
    try {
      if (!force) {
        setIsLoading(true);
      }
      setError(null);
      
      console.log('🔄 Loading employees...', force ? '(forced refresh)' : '');
      
      if (force) {
        invalidateAllCaches();
      }
      
      const data = await EmployeeService.getAllEmployees();
      console.log('👥 Employees loaded:', data.length);
      
      setAllEmployees(data);
      setLastRefresh(Date.now());
      
      if (force) {
        toast({
          title: "Datos actualizados",
          description: `Se cargaron ${data.length} empleados`,
        });
      }
    } catch (err) {
      console.error('Error loading employees:', err);
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      
      if (!force) {
        toast({
          title: "Error al cargar empleados",
          description: errorMessage,
          variant: "destructive"
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, [toast, invalidateAllCaches]);

  // Usar realtime para empleados
  useRealtimeEmployees({
    onEmployeeChange: useCallback(() => {
      console.log('🔄 Detectado cambio en empleados via realtime, recargando...');
      loadEmployees(true);
    }, [loadEmployees])
  });

  // Load employees on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      loadEmployees();
    }, 100);

    return () => clearTimeout(timer);
  }, [loadEmployees]);

  const refreshEmployees = useCallback(() => {
    console.log('🔄 Manual refresh requested');
    loadEmployees(true);
  }, [loadEmployees]);

  const forceCompleteRefresh = useCallback(() => {
    console.log('💥 Force complete refresh');
    
    setAllEmployees([]);
    setError(null);
    invalidateAllCaches();
    
    setTimeout(() => {
      loadEmployees(true);
    }, 50);
    
    toast({
      title: "Recargando completamente...",
      description: "Limpiando cachés y recargando datos",
    });
  }, [loadEmployees, invalidateAllCaches, toast]);

  return {
    // Datos de empleados
    employees,
    allEmployees,
    isLoading,
    error,
    lastRefresh,
    
    // Filtros
    filters,
    updateFilters,
    clearFilters,
    totalEmployees,
    filteredCount,
    
    // Paginación
    pagination,
    
    // Selección
    selectedEmployees,
    toggleEmployeeSelection,
    toggleAllEmployees,
    clearSelection,
    
    // Compliance
    getComplianceIndicators,
    
    // Acciones
    refreshEmployees,
    forceCompleteRefresh,
    invalidateAllCaches
  };
};
