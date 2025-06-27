
import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useRealtimeEmployees } from '@/hooks/useRealtimeEmployees';
import { EmployeeService } from '@/services/EmployeeService';
import { Employee } from '@/types';

export const useEmployeeList = () => {
  const { toast } = useToast();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadEmployees = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await EmployeeService.getEmployees();
      setEmployees(data);
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
    employees,
    isLoading,
    error,
    refreshEmployees
  };
};
