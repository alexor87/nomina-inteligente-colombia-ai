
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

  // Function to sanitize form fields with improved handling
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
    
    // Sanitize date fields - convert empty strings to null
    dateFields.forEach(field => {
      const value = sanitizedData[field];
      if (value === '' || value === undefined || value === null || value === 'null') {
        (sanitizedData as any)[field] = null;
      }
    });

    // Sanitize text fields - convert empty strings to null
    textFields.forEach(field => {
      const value = sanitizedData[field];
      if (value === '' || value === undefined || value === null || value === 'null') {
        (sanitizedData as any)[field] = null;
      } else if (typeof value === 'string') {
        (sanitizedData as any)[field] = value.trim();
      }
    });

    // CRITICAL: Sanitize UUID fields properly
    uuidFields.forEach(field => {
      const value = sanitizedData[field];
      if (value === '' || value === undefined || value === null || value === 'null') {
        (sanitizedData as any)[field] = null;
      }
    });

    // Handle segundoNombre separately
    if (sanitizedData.segundoNombre === '' || sanitizedData.segundoNombre === undefined || sanitizedData.segundoNombre === null) {
      sanitizedData.segundoNombre = '';
    }

    console.log('✅ Sanitized data:', sanitizedData);
    console.log('🔍 SANITIZED AFFILIATIONS:', {
      eps: sanitizedData.eps,
      afp: sanitizedData.afp,
      arl: sanitizedData.arl,
      cajaCompensacion: sanitizedData.cajaCompensacion,
      tipoCotizanteId: sanitizedData.tipoCotizanteId,
      subtipoCotizanteId: sanitizedData.subtipoCotizanteId
    });
    
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
