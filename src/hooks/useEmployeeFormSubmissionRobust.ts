
import { useState, useCallback } from 'react';
import { EmployeeUnified } from '@/types/employee-unified';
import { EmployeeServiceRobust } from '@/services/EmployeeServiceRobust';
import { VacationService } from '@/services/VacationService';
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

      // ✅ NUEVO: Extraer datos de vacaciones antes de enviar al empleado
      const hasAccumulatedVacations = formData.hasAccumulatedVacations || false;
      const initialVacationDays = formData.initialVacationDays || 0;

      console.log('🏖️ Vacation data extracted:', { hasAccumulatedVacations, initialVacationDays });

      // Preparar datos del empleado (sin los campos de vacaciones)
      const { hasAccumulatedVacations: _, initialVacationDays: __, ...employeeData } = formData;
      
      // Asegurar que custom_fields está presente
      const dataToSubmit = {
        ...employeeData,
        custom_fields: employeeData.custom_fields || {}
      };

      console.log('📤 Employee data being submitted:', dataToSubmit);

      let result;
      const isEditing = !!employee?.id;
      
      if (isEditing) {
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
        
        // ✅ CORREGIDO: Lógica diferente para edición vs creación
        if (hasAccumulatedVacations && initialVacationDays > 0) {
          if (isEditing) {
            // Para edición: actualizar balance existente
            console.log('🏖️ Updating vacation balance:', { 
              employeeId: result.employee.id, 
              initialDays: initialVacationDays 
            });
            
            const vacationResult = await VacationService.updateInitialBalance(
              result.employee.id,
              initialVacationDays
            );
            
            if (vacationResult.success) {
              console.log('✅ Vacation balance updated successfully');
            } else {
              console.warn('⚠️ Warning: Could not update vacation balance:', vacationResult.error);
            }
          } else {
            // Para creación: crear nuevo balance
            console.log('🏖️ Creating vacation balance:', { 
              employeeId: result.employee.id, 
              companyId: formData.empresaId, 
              initialDays: initialVacationDays 
            });
            
            const vacationResult = await VacationService.createVacationBalance(
              result.employee.id,
              formData.empresaId,
              initialVacationDays
            );
            
            if (vacationResult.success) {
              console.log('✅ Vacation balance created successfully');
            } else {
              console.warn('⚠️ Warning: Could not create vacation balance:', vacationResult.error);
            }
          }
        } else if (!isEditing) {
          // Solo para empleados nuevos: crear balance con 0 días para consistencia
          console.log('🏖️ Creating default vacation balance (0 days)');
          const vacationResult = await VacationService.createVacationBalance(
            result.employee.id,
            formData.empresaId,
            0
          );
          
          if (vacationResult.success) {
            console.log('✅ Default vacation balance created (0 days)');
          } else {
            console.warn('⚠️ Warning: Could not create default vacation balance:', vacationResult.error);
          }
        }

        // Mostrar toast de éxito
        const actionText = isEditing ? 'actualizado' : 'creado';
        const vacationText = hasAccumulatedVacations ? ` con ${initialVacationDays} días de vacaciones iniciales` : '';
        
        toast({
          title: `Empleado ${actionText}`,
          description: `${result.employee.nombre} ${result.employee.apellido} ha sido ${actionText} exitosamente${vacationText}`,
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
