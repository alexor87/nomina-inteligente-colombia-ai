
import { useCallback } from 'react';
import { Employee } from '@/types';
import { useEmployeeCRUDRobust } from '@/hooks/useEmployeeCRUDRobust';
import { validateEmployeeData } from '@/schemas/employeeValidation';

export const useEmployeeFormSubmissionRobust = (
  employee?: Employee, 
  onSuccess?: () => void,
  onDataRefresh?: (updatedEmployee: Employee) => void
) => {
  const { createEmployee, updateEmployee, isLoading, isCreating, isUpdating, error } = useEmployeeCRUDRobust();

  const handleSubmit = useCallback(async (formData: any) => {
    console.log('🚀 useEmployeeFormSubmissionRobust: Form submission started');
    console.log('📝 Form data:', formData);
    console.log('📝 Employee being edited:', employee ? `${employee.nombre} ${employee.apellido} (${employee.id})` : 'New employee');

    // Pre-validate form data
    const validationResult = validateEmployeeData(formData);
    if (!validationResult.success) {
      console.error('❌ Form validation failed before submission:', validationResult.errors);
      return { success: false, error: 'Datos del formulario inválidos', details: validationResult.errors };
    }

    let result;
    
    if (employee) {
      console.log('🔄 Updating existing employee:', employee.id);
      result = await updateEmployee(employee.id, formData);
    } else {
      console.log('➕ Creating new employee');
      result = await createEmployee(formData);
    }

    console.log('📊 Operation result:', result);

    if (result.success && result.data) {
      console.log('🎉 Operation successful');
      
      // Refresh form data if callback provided
      if (onDataRefresh && result.data) {
        console.log('🔄 Refreshing form data with updated employee');
        onDataRefresh(result.data);
      }
      
      // Call success callback
      if (onSuccess) {
        console.log('✅ Calling success callback');
        onSuccess();
      }
    } else {
      console.error('❌ Operation failed:', result.error);
    }

    return result;
  }, [employee, createEmployee, updateEmployee, onSuccess, onDataRefresh]);

  return {
    handleSubmit,
    isLoading,
    isCreating,
    isUpdating,
    error
  };
};
