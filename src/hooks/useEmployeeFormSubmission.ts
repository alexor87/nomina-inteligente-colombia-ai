
import { useCallback } from 'react';
import { Employee } from '@/types';
import { useEmployeeCRUD } from '@/hooks/useEmployeeCRUD';
import { EmployeeFormData } from '@/components/employees/form/types';

export const useEmployeeFormSubmission = (
  employee?: Employee, 
  onSuccess?: () => void,
  onDataRefresh?: (updatedEmployee: Employee) => void
) => {
  const { createEmployee, updateEmployee, isLoading } = useEmployeeCRUD();

  // Function to sanitize date fields - convert empty strings to null
  const sanitizeFormFields = useCallback((data: EmployeeFormData) => {
    const dateFields = [
      'fechaNacimiento',
      'fechaIngreso',
      'fechaFirmaContrato',
      'fechaFinalizacionContrato'
    ] as const;

    const textFields = [
      'banco',
      'numeroCuenta',
      'titularCuenta'
    ] as const;

    const sanitizedData = { ...data };
    
    // Sanitize date fields
    dateFields.forEach(field => {
      if (sanitizedData[field] === '' || sanitizedData[field] === undefined) {
        (sanitizedData as any)[field] = null;
      }
    });

    // Sanitize text fields - convert empty strings to null for database
    textFields.forEach(field => {
      if (sanitizedData[field] === '' || sanitizedData[field] === undefined) {
        (sanitizedData as any)[field] = null;
      }
    });

    return sanitizedData;
  }, []);

  const handleSubmit = useCallback(async (data: EmployeeFormData, companyId: string, subtiposCotizante: any[]) => {
    console.log('🚀 Form submission called with data:', data);
    console.log('📝 Employee being edited:', employee);
    
    if (!companyId) {
      console.error('No company ID available');
      return;
    }

    // Sanitize date fields before sending
    const sanitizedData = sanitizeFormFields(data);
    console.log('🧹 Sanitized data:', sanitizedData);

    // Prepare employee data - add required fields for Employee type
    const employeeData = {
      ...sanitizedData,
      empresaId: companyId, // Add required empresaId field
    };

    console.log('📋 Final employee data to be sent:', employeeData);

    let result;
    if (employee) {
      console.log('🔄 Updating employee with ID:', employee.id);
      result = await updateEmployee(employee.id, employeeData);
    } else {
      console.log('➕ Creating new employee');
      result = await createEmployee(employeeData);
    }

    console.log('✅ Operation result:', result);

    if (result.success) {
      console.log('🎉 Operation successful, calling callbacks');
      
      // NEW: If we have the updated employee data, refresh the form
      if (result.data && onDataRefresh) {
        console.log('🔄 Refreshing form data with updated employee:', result.data);
        onDataRefresh(result.data);
      }
      
      onSuccess?.();
    } else {
      console.error('❌ Operation failed:', result.error);
    }
  }, [employee, createEmployee, updateEmployee, sanitizeFormFields, onSuccess, onDataRefresh]);

  return {
    handleSubmit,
    isLoading
  };
};
