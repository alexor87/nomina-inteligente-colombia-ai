
import { useCallback } from 'react';
import { Employee } from '@/types';
import { useEmployeeCRUDFixed } from '@/hooks/useEmployeeCRUDFixed';
import { EmployeeFormData } from '@/components/employees/form/types';

export const useEmployeeFormSubmissionFixed = (
  employee?: Employee, 
  onSuccess?: () => void,
  onDataRefresh?: (updatedEmployee: Employee) => void
) => {
  const { createEmployee, updateEmployee, isLoading } = useEmployeeCRUDFixed();

  // Function to sanitize form fields
  const sanitizeFormFields = useCallback((data: EmployeeFormData) => {
    console.log('🧹 Sanitizing form fields:', data);
    
    const dateFields = [
      'fechaNacimiento',
      'fechaIngreso',
      'fechaFirmaContrato',
      'fechaFinalizacionContrato'
    ] as const;

    const textFields = [
      'banco',
      'numeroCuenta',
      'titularCuenta',
      'eps',
      'afp',
      'arl',
      'cajaCompensacion',
      'cargo',
      'codigoCIIU',
      'centroCostos',
      'direccion',
      'ciudad',
      'clausulasEspeciales'
    ] as const;

    const uuidFields = [
      'tipoCotizanteId',
      'subtipoCotizanteId'
    ] as const;

    const sanitizedData = { ...data };
    
    // Sanitize date fields
    dateFields.forEach(field => {
      if (sanitizedData[field] === '' || sanitizedData[field] === undefined) {
        (sanitizedData as any)[field] = null;
      }
    });

    // Sanitize text fields
    textFields.forEach(field => {
      if (sanitizedData[field] === '' || sanitizedData[field] === undefined) {
        (sanitizedData as any)[field] = null;
      }
    });

    // CRITICAL: Sanitize UUID fields properly
    uuidFields.forEach(field => {
      if (sanitizedData[field] === '' || sanitizedData[field] === undefined) {
        (sanitizedData as any)[field] = null;
      }
    });

    console.log('✅ Sanitized data:', sanitizedData);
    return sanitizedData;
  }, []);

  const handleSubmit = useCallback(async (data: EmployeeFormData, companyId: string) => {
    console.log('🚀 Form submission called with data:', data);
    console.log('📝 Employee being edited:', employee);
    
    if (!companyId) {
      console.error('❌ No company ID available');
      return;
    }

    // Sanitize fields before sending
    const sanitizedData = sanitizeFormFields(data);
    console.log('🧹 Sanitized data:', sanitizedData);

    // Prepare employee data
    const employeeData = {
      ...sanitizedData,
      empresaId: companyId,
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
