
import { useEffect, useState } from 'react';
import { EmployeeUnified } from '@/types/employee-unified';
import { EmployeeService } from '@/services/EmployeeService';
import { useToast } from '@/hooks/use-toast';

export const useEmployeeEdit = (employeeId?: string) => {
  const [employee, setEmployee] = useState<EmployeeUnified | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!employeeId) return;

    const loadEmployee = async () => {
      try {
        setIsLoading(true);
        setError(null);
        console.log('🔍 Loading employee for editing:', employeeId);
        
        const result = await EmployeeService.getEmployeeById(employeeId);
        
        if (!result) {
          throw new Error('Empleado no encontrado');
        }

        console.log('✅ Employee loaded for editing:', result);
        setEmployee(result);
      } catch (err) {
        console.error('❌ Error loading employee:', err);
        const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
        setError(errorMessage);
        toast({
          title: "Error al cargar empleado",
          description: errorMessage,
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadEmployee();
  }, [employeeId, toast]);

  return {
    employee,
    isLoading,
    error,
    refetch: () => {
      if (employeeId) {
        setEmployee(null);
        setError(null);
      }
    }
  };
};
