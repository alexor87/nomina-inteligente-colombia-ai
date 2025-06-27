
import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useRealtimeEmployees } from '@/hooks/useRealtimeEmployees';
import { EmployeeService } from '@/services/EmployeeService';
import { Employee } from '@/types';
import { EmployeeWithStatus } from '@/types/employee-extended';
import { usePagination } from '@/hooks/usePagination';
import { useEmployeeFiltering } from '@/hooks/useEmployeeFiltering';
import { useEmployeeSelection } from '@/hooks/useEmployeeSelection';
import { useEmployeeModal } from '@/hooks/useEmployeeModal';
import { useEmployeeCompliance } from '@/hooks/useEmployeeCompliance';

export const useEmployeeList = () => {
  const { toast } = useToast();
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
  const pagination = usePagination({
    totalItems: filteredEmployees.length,
    itemsPerPage: 10
  });

  // Selección de empleados
  const {
    selectedEmployees,
    toggleEmployeeSelection,
    toggleAllEmployees,
    clearSelection
  } = useEmployeeSelection();

  // Modal de empleado
  const {
    selectedEmployee,
    isEmployeeProfileOpen,
    openEmployeeProfile,
    closeEmployeeProfile
  } = useEmployeeModal();

  // Compliance indicators
  const { getComplianceIndicators } = useEmployeeCompliance();

  // Obtener empleados paginados
  const employees = filteredEmployees.slice(
    pagination.offset,
    pagination.offset + pagination.itemsPerPage
  ) as EmployeeWithStatus[];

  const loadEmployees = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await EmployeeService.getAllEmployees();
      setAllEmployees(data);
      console.log('👥 Empleados cargados:', data.length);
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
  }, [toast]);

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
    loadEmployees();
  }, [loadEmployees]);

  return {
    // Datos de empleados
    employees,
    allEmployees,
    isLoading,
    error,
    
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
    
    // Modal
    selectedEmployee,
    isEmployeeProfileOpen,
    openEmployeeProfile,
    closeEmployeeProfile,
    
    // Compliance
    getComplianceIndicators,
    
    // Acciones
    refreshEmployees
  };
};
