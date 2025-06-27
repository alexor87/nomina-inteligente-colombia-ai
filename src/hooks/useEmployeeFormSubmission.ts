
import { useCallback } from 'react';
import { Employee } from '@/types';
import { useEmployeeCRUD } from '@/hooks/useEmployeeCRUD';
import { EmployeeFormData } from '@/components/employees/form/types';

export const useEmployeeFormSubmission = (employee?: Employee, onSuccess?: () => void) => {
  const { createEmployee, updateEmployee, isLoading } = useEmployeeCRUD();

  // Function to sanitize date and UUID fields - convert empty strings to null
  const sanitizeFormFields = useCallback((data: EmployeeFormData) => {
    const dateFields = [
      'fechaNacimiento',
      'fechaIngreso',
      'fechaFirmaContrato',
      'fechaFinalizacionContrato'
    ] as const;

    const uuidFields = [
      'tipoCotizanteId',
      'subtipoCotizanteId'
    ] as const;

    const textFields = [
      'eps',
      'afp', 
      'arl',
      'cajaCompensacion',
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

    // Sanitize UUID fields
    uuidFields.forEach(field => {
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
    console.log('🔍 Affiliations data being submitted:', {
      eps: data.eps,
      afp: data.afp,
      arl: data.arl,
      cajaCompensacion: data.cajaCompensacion,
      tipoCotizanteId: data.tipoCotizanteId,
      subtipoCotizanteId: data.subtipoCotizanteId,
      regimenSalud: data.regimenSalud,
      estadoAfiliacion: data.estadoAfiliacion
    });
    
    if (!companyId) {
      console.error('No company ID available');
      return;
    }

    // Validate subtipo if required
    if (data.tipoCotizanteId && subtiposCotizante.length > 0 && !data.subtipoCotizanteId) {
      console.error('Subtipo de cotizante is required for this tipo');
      return;
    }

    // Sanitize date and UUID fields before sending
    const sanitizedData = sanitizeFormFields(data);
    console.log('🧹 Sanitized data:', sanitizedData);
    console.log('🔍 Sanitized affiliations data:', {
      eps: sanitizedData.eps,
      afp: sanitizedData.afp,
      arl: sanitizedData.arl,
      cajaCompensacion: sanitizedData.cajaCompensacion,
      tipoCotizanteId: sanitizedData.tipoCotizanteId,
      subtipoCotizanteId: sanitizedData.subtipoCotizanteId,
      regimenSalud: sanitizedData.regimenSalud,
      estadoAfiliacion: sanitizedData.estadoAfiliacion
    });

    // Prepare employee data - let the validation service handle all conversions
    const employeeData = {
      ...sanitizedData,
      // Clear subtipoCotizanteId if no subtipos are available
      subtipoCotizanteId: subtiposCotizante.length > 0 ? sanitizedData.subtipoCotizanteId : null
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
      console.log('🎉 Operation successful, calling onSuccess');
      onSuccess?.();
    } else {
      console.error('❌ Operation failed:', result.error);
    }
  }, [employee, createEmployee, updateEmployee, sanitizeFormFields, onSuccess]);

  return {
    handleSubmit,
    isLoading
  };
};
