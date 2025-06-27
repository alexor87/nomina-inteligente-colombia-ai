
import { useEffect, useState } from 'react';
import { Employee } from '@/types';
import { EmployeeUnifiedService } from '@/services/EmployeeUnifiedService';
import { useToast } from '@/hooks/use-toast';

export const useEmployeeEdit = (employeeId?: string) => {
  const [employee, setEmployee] = useState<Employee | null>(null);
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
        
        const employeeData = await EmployeeUnifiedService.getEmployeeById(employeeId);
        
        if (!employeeData) {
          throw new Error('Empleado no encontrado');
        }

        console.log('✅ Employee loaded for editing:', employeeData);
        setEmployee(employeeData);
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
