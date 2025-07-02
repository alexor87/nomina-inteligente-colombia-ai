
import { useEffect } from 'react';
import { UseFormSetValue, UseFormTrigger } from 'react-hook-form';
import { EmployeeFormData } from './types';
import { populateFormWithEmployee } from './useEmployeeFormDefaults';
import { EmployeeUnified } from '@/types/employee-unified';

export const useEmployeeFormPopulation = (
  employee: EmployeeUnified | null,
  setValue: UseFormSetValue<EmployeeFormData>,
  trigger: UseFormTrigger<EmployeeFormData>
) => {
  useEffect(() => {
    if (!employee) {
      console.log('🔄 useEmployeeFormPopulation: No employee data, using defaults');
      return;
    }

    console.log('🔄 useEmployeeFormPopulation: Populating form with employee data:', employee.nombre, employee.apellido);
    
    try {
      const formData = populateFormWithEmployee(employee);
      
      // Set all form values
      Object.entries(formData).forEach(([key, value]) => {
        setValue(key as keyof EmployeeFormData, value);
      });

      // Trigger validation after setting values
      setTimeout(() => {
        trigger();
      }, 100);

      console.log('✅ useEmployeeFormPopulation: Form populated successfully');
    } catch (error) {
      console.error('❌ useEmployeeFormPopulation: Error populating form:', error);
    }
  }, [employee, setValue, trigger]);
};
