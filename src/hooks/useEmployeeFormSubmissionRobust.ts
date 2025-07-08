
import { useState, useCallback } from 'react';
import { EmployeeUnified } from '@/types/employee-unified';
import { EmployeeServiceRobust } from '@/services/EmployeeServiceRobust';
import { useToast } from '@/hooks/use-toast';

interface SubmissionResult {
  success: boolean;
  error?: string;
  details?: any;
  employee?: EmployeeUnified;
}

export const useEmployeeFormSubmissionRobust = (
  employee?: EmployeeUnified,
  onSuccess?: () => void,
  onDataRefresh?: (employee: EmployeeUnified) => void
) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleSubmit = useCallback(async (formData: any): Promise<SubmissionResult> => {
    console.log('🚀 useEmployeeFormSubmissionRobust: Starting submission');
    console.log('📝 Form data received:', formData);
    
    setIsLoading(true);
    setError(null);

    try {
      // Validar que tenemos companyId
      if (!formData.empresaId) {
        throw new Error('Company ID is required');
      }

      // Asegurar que custom_fields está presente
      const dataToSubmit = {
        ...formData,
        custom_fields: formData.custom_fields || {}
      };

      console.log('📤 Data being submitted:', dataToSubmit);

      let result;
      if (employee?.id) {
        // Actualizar empleado existente
        console.log('🔄 Updating existing employee:', employee.id);
        result = await EmployeeServiceRobust.updateEmployee(employee.id, dataToSubmit);
      } else {
        // Crear nuevo empleado
        console.log('➕ Creating new employee');
        result = await EmployeeServiceRobust.createEmployee(dataToSubmit);
      }

      if (result.success && result.employee) {
        console.log('✅ Employee saved successfully:', result.employee.id);
        
        // Mostrar toast de éxito
        toast({
          title: employee?.id ? "Empleado actualizado" : "Empleado creado",
          description: `${result.employee.nombre} ${result.employee.apellido} ha sido ${employee?.id ? 'actualizado' : 'creado'} exitosamente`,
          className: "border-green-200 bg-green-50"
        });

        // Llamar callbacks
        onDataRefresh?.(result.employee);
        onSuccess?.();

        return {
          success: true,
          employee: result.employee
        };
      } else {
        throw new Error(result.message || 'Error unknown');
      }

    } catch (error: any) {
      console.error('❌ Submission failed:', error);
      
      const errorMessage = error.message || 'Error desconocido al guardar empleado';
      setError(errorMessage);

      // Mostrar toast de error
      toast({
        title: "Error al guardar",
        description: errorMessage,
        variant: "destructive"
      });

      return {
        success: false,
        error: errorMessage,
        details: error
      };
    } finally {
      setIsLoading(false);
    }
  }, [employee, onSuccess, onDataRefresh, toast]);

  return {
    handleSubmit,
    isLoading,
    error
  };
};
