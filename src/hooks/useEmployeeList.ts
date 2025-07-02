
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

export const useEmployeeList = () => {
  const { toast } = useToast();
  const [allEmployees, setAllEmployees] = useState<EmployeeWithStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const loadEmployees = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await EmployeeService.getAllEmployees();
      const employeesWithStatus = data.map(mapToEmployeeWithStatus);
      setAllEmployees(employeesWithStatus);
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
    
    // Compliance
    getComplianceIndicators,
    
    // Acciones
    refreshEmployees
  };
};
