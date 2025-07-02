
import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useRealtimeEmployees } from '@/hooks/useRealtimeEmployees';
import { EmployeeService } from '@/services/EmployeeService';
import { Employee } from '@/types';
import { EmployeeWithStatus } from '@/types/employee-extended';
import { usePagination } from '@/hooks/usePagination';
import { useEmployeeFiltering } from '@/hooks/useEmployeeFiltering';
import { useEmployeeSelection } from '@/hooks/useEmployeeSelection';
import { useEmployeeCompliance } from '@/hooks/useEmployeeCompliance';
import { useQueryClient } from '@tanstack/react-query';

export const useEmployeeList = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [allEmployees, setAllEmployees] = useState<EmployeeWithStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<number>(Date.now());

  // Convertir Employee a EmployeeWithStatus
  const mapToEmployeeWithStatus = (employee: Employee): EmployeeWithStatus => ({
    ...employee,
    periodicidadPago: (employee.periodicidadPago as 'quincenal' | 'mensual') || 'mensual'
  });

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
    console.log('🗑️ Invalidando todas las cachés...');
    
    // Invalidar React Query
    queryClient.invalidateQueries();
    queryClient.removeQueries();
    
    // Limpiar localStorage relacionado con empleados
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes('employee') || key.includes('payroll') || key.includes('nomina'))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    // Limpiar sessionStorage
    const sessionKeysToRemove = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && (key.includes('employee') || key.includes('payroll') || key.includes('nomina'))) {
        sessionKeysToRemove.push(key);
      }
    }
    sessionKeysToRemove.forEach(key => sessionStorage.removeItem(key));
    
    console.log('✅ Cachés invalidadas');
  }, [queryClient]);

  const loadEmployees = useCallback(async (force = false) => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('🔄 Loading employees...', force ? '(forced refresh with cache invalidation)' : '');
      
      if (force) {
        invalidateAllCaches();
      }
      
      const data = await EmployeeService.getAllEmployees();
      const employeesWithStatus = data.map(mapToEmployeeWithStatus);
      setAllEmployees(employeesWithStatus);
      setLastRefresh(Date.now());
      
      console.log('👥 Employees loaded:', data.length);
      
      if (force) {
        toast({
          title: "Datos actualizados",
          description: `Se cargaron ${data.length} empleados (caché limpiado)`,
        });
      }
    } catch (err) {
      console.error('Error loading employees:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
      toast({
        title: "Error al cargar empleados",
        description: "No se pudieron cargar los empleados",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast, invalidateAllCaches]);

  // Usar realtime para empleados
  useRealtimeEmployees({
    onEmployeeChange: useCallback(() => {
      console.log('🔄 Detectado cambio en empleados via realtime, recargando...');
      loadEmployees();
    }, [loadEmployees])
  });

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  const refreshEmployees = useCallback(() => {
    console.log('🔄 Manual refresh requested with complete cache invalidation');
    loadEmployees(true);
  }, [loadEmployees]);

  const forceCompleteRefresh = useCallback(() => {
    console.log('💥 Force complete refresh - clearing everything');
    
    // Limpiar estado local
    setAllEmployees([]);
    setError(null);
    
    // Invalidar cachés
    invalidateAllCaches();
    
    // Recargar después de un pequeño delay para asegurar que las cachés se limpiaron
    setTimeout(() => {
      loadEmployees(true);
    }, 100);
    
    toast({
      title: "Recargando completamente...",
      description: "Limpiando todas las cachés y recargando datos",
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
